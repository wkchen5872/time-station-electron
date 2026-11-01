#!/bin/bash
# Time Station - Raspberry Pi 安裝／更新腳本
#
# 在 Raspberry Pi 上執行。接手 deploy-pi.sh 步驟 6 之後的工作：
# 安裝一個已經打包好的 AppImage，設定執行權限與開機自動啟動。
# 不建置、不安裝 npm 套件——建置在開發機完成。
#
# 用法:
#   ./install-pi.sh <appimage 路徑> [專案目錄]
#
# 專案目錄預設 $HOME/time-station-electron，需已含 scripts/start.sh 與 scripts/stop.sh。

echo "======================================"
echo "  Time Station - 安裝／更新"
echo "======================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

die() { echo -e "${RED}$1${NC}"; exit 1; }

# 解析為絕對路徑（不依賴 realpath，Pi 上不一定有）
abs_path() {
    local dir base
    dir=$(cd "$(dirname "$1")" 2>/dev/null && pwd -P) || return 1
    base=$(basename "$1")
    printf '%s/%s\n' "$dir" "$base"
}

# 本次從 release/ 移出的檔案，用於失敗時還原。
# 兩個陣列同索引對應：BACKUP_TO[i] 是備份位置，BACKUP_FROM[i] 是原本位置。
# 只記錄本次移出的檔案——不得遍歷整個 backups/，那會把歷史備份一起搬回 release/，
# 而 start.sh 的 `find ... | head -n 1` 會因此選到不確定的版本。
BACKUP_FROM=()
BACKUP_TO=()
SERVICE_EXISTED=0

# AppImage type 2 的 runtime 以 dlopen 載入 libfuse.so.2（libfuse 2）。
# 現代 Debian 預設只裝 fuse3，缺 libfuse2 時 AppImage 會直接退出，
# systemd 則因 Restart=on-failure 進入重試迴圈。
# 不同 electron-builder 版本內附的 runtime 需求不同，所以先看產物自己要什麼。
needs_libfuse2() {
    head -c 262144 "$1" 2>/dev/null | grep -aq 'libfuse\.so\.2'
}

# 0=找到 1=確定沒有 2=無法判斷
have_libfuse2() {
    local ldc out
    for ldc in ldconfig /sbin/ldconfig /usr/sbin/ldconfig; do
        command -v "$ldc" > /dev/null 2>&1 || [ -x "$ldc" ] || continue
        out=$("$ldc" -p 2>/dev/null) || continue
        [ -n "$out" ] || continue
        printf '%s\n' "$out" | grep -q 'libfuse\.so\.2' && return 0
        return 1
    done
    return 2
}

# 本次放進 release/ 的新檔。步驟 5 之後若失敗，必須把它移出 release/，
# 否則還原舊版後 release/ 會同時有兩個 AppImage，start.sh 的 find|head 任選一個。
# INSTALLED_ORIGIN 是它原本的位置；來源本來就在 release/ 時為空。
INSTALLED_PATH=""
INSTALLED_ORIGIN=""

# 只終止執行本專案 release/ 內 AppImage 的程序，避免誤殺其他工作階段。
leftover_pids() {
    local my_pgid pid pgid executable release_path candidates rc out=""
    my_pgid=$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')

    # 取不到自己的 pgid 就無法分辨「真正的殘留」與「本腳本自己」。
    # 此時不終止任何程序，也不搬移安裝檔案。
    if [ -z "$my_pgid" ]; then
        echo "  無法取得 process group 資訊，無法檢查殘留程序" >&2
        return 1
    fi

    [ -d "$RELEASE_DIR" ] || return 0
    release_path=$(cd "$RELEASE_DIR" 2>/dev/null && pwd -P) || return 1
    candidates=$(pgrep -f 'TimeStation-.*\.AppImage|time-station-electron' 2>/dev/null)
    rc=$?
    [ "$rc" -le 1 ] || { echo "  無法查詢殘留程序" >&2; return 1; }
    for pid in $candidates; do
        [ "$pid" = "$$" ] && continue
        [ "$pid" = "1" ] && continue
        pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
        # 取不到 pgid 表示該程序已結束（例如命令替換用完就退出的子 shell），
        # 沒有東西需要終止，也不該算成殘留。
        [ -z "$pgid" ] && continue
        [ "$pgid" = "$my_pgid" ] && continue
        executable=$(readlink "/proc/$pid/exe" 2>/dev/null) || continue
        case "$executable" in
            "$release_path"/TimeStation-*.AppImage) ;;
            *) continue ;;
        esac
        out="$out $pid"
    done
    printf '%s' "${out# }"
}

rollback_backups() {
    local i
    [ "${#BACKUP_TO[@]}" -gt 0 ] || return 0
    for i in "${!BACKUP_TO[@]}"; do
        [ -e "${BACKUP_TO[$i]}" ] || continue
        if mv "${BACKUP_TO[$i]}" "${BACKUP_FROM[$i]}" 2>/dev/null; then
            echo "  已還原 $(basename "${BACKUP_FROM[$i]}")"
        else
            echo -e "${RED}  無法還原 ${BACKUP_TO[$i]}，請手動處理${NC}"
        fi
    done
}

# 步驟 2 之後失敗時，程式已經被停掉，必須嘗試把服務帶回來
restore_service() {
    if [ "$SERVICE_EXISTED" -eq 1 ]; then
        if sudo systemctl start "$SERVICE_NAME" 2>/dev/null; then
            echo "  已嘗試啟動 ${SERVICE_NAME}.service，請確認畫面是否恢復"
        else
            echo -e "${RED}  已嘗試啟動 ${SERVICE_NAME}.service 但失敗，請手動檢查${NC}"
        fi
    else
        echo "  已嘗試啟動：此機無 systemd 服務，請手動執行 $PROJECT_ROOT/scripts/start.sh"
    fi
}

# 把本次放進 release/ 的新檔移出去，但保留檔案本身以便重試。
# 優先退回原來的位置；原位已被占用或來源本來就在 release/ 時，收進 backups/。
undo_install() {
    local dest
    [ -n "$INSTALLED_PATH" ] || return 0
    [ -e "$INSTALLED_PATH" ] || return 0

    if [ -n "$INSTALLED_ORIGIN" ] && [ ! -e "$INSTALLED_ORIGIN" ]; then
        dest="$INSTALLED_ORIGIN"
    else
        # 加上後綴，使檔名不再符合 TimeStation-*.AppImage，
        # 避免被下一次的備份掃描或還原邏輯當成可用版本。
        dest="$BACKUP_DIR/$(basename "$INSTALLED_PATH").failed-$(date +%Y%m%d-%H%M%S)"
    fi

    if mv "$INSTALLED_PATH" "$dest" 2>/dev/null; then
        echo "  已將本次新檔移出 release/，保留於: $dest"
    else
        echo -e "${RED}  無法移出本次新檔 $INSTALLED_PATH${NC}"
    fi
}

# release/ 的版本必須唯一，否則 start.sh 會取到不確定的版本
verify_release_state() {
    local files n
    files=$(find "$RELEASE_DIR" -name 'TimeStation-*.AppImage' 2>/dev/null) \
        || { echo -e "${RED}  無法確認 release/ 的 AppImage 版本${NC}"; return 1; }
    if [ -z "$files" ]; then
        n=0
    else
        n=$(printf '%s\n' "$files" | wc -l | tr -d ' ')
    fi
    if [ "$n" -eq 1 ]; then
        return 0
    fi
    if [ "$n" -eq 0 ]; then
        echo -e "${RED}  release/ 沒有任何 AppImage，目前沒有可啟動的版本${NC}"
        echo -e "${RED}  可用的檔案請見 $BACKUP_DIR${NC}"
    else
        echo -e "${RED}  release/ 內有 $n 個 AppImage，start.sh 會取到不確定的版本${NC}"
        echo -e "${RED}  請手動只保留一個再啟動${NC}"
    fi
    return 1
}

# 停止服務之後的失敗出口。
# 順序很重要：先撤銷本次安裝，再還原本次備份，最後才確認狀態並恢復服務；
# 狀態不唯一時不啟動——啟動一個不確定的版本比停著更糟。
die_after_stop() {
    echo -e "${RED}$1${NC}"
    undo_install
    rollback_backups
    if verify_release_state; then
        restore_service
    else
        echo -e "${RED}  已跳過自動啟動，請先處理上述狀態${NC}"
    fi
    exit 1
}

# 檢查是否為 root
if [ "$EUID" -eq 0 ]; then
   die "請不要使用 sudo 執行此腳本（需要 sudo 的步驟會自行要求）"
fi

SOURCE_APPIMAGE="$1"
PROJECT_ROOT="${2:-$HOME/time-station-electron}"
SERVICE_NAME="time-station"

if [ -z "$SOURCE_APPIMAGE" ]; then
    echo "用法: $0 <appimage 路徑> [專案目錄]"
    echo "  例: $0 ~/time-station-staging/TimeStation-1.3.0-arm64.AppImage"
    exit 1
fi

# 步驟 1: 前置檢查
echo -e "${YELLOW}[1/6] 前置檢查...${NC}"

[ -f "$SOURCE_APPIMAGE" ] || die "找不到 AppImage: $SOURCE_APPIMAGE"
[ -s "$SOURCE_APPIMAGE" ] || die "AppImage 是空檔案，上傳可能未完成: $SOURCE_APPIMAGE"
[ -d "$PROJECT_ROOT" ] || die "找不到專案目錄: $PROJECT_ROOT"
[ -f "$PROJECT_ROOT/scripts/start.sh" ] || die "專案目錄缺少 scripts/start.sh: $PROJECT_ROOT"
[ -f "$PROJECT_ROOT/scripts/stop.sh" ] || die "專案目錄缺少 scripts/stop.sh: $PROJECT_ROOT"

# 架構比對。AppImage 外層是 ELF，e_machine 位於 offset 18；0xB7 為 AArch64。
# 搬錯架構的產物時，錯誤訊息會很難懂，所以先擋下來。
HOST_ARCH=$(uname -m)
ELF_MACHINE=$(od -An -tx1 -j18 -N2 "$SOURCE_APPIMAGE" | tr -d ' \n')
case "$HOST_ARCH:$ELF_MACHINE" in
    aarch64:b700) : ;;
    aarch64:*)
        die "AppImage 不是 aarch64 建置（ELF e_machine=0x${ELF_MACHINE}），無法在這台機器執行" ;;
    *)
        echo -e "${YELLOW}⚠ 本機架構為 ${HOST_ARCH}，非 aarch64；未比對 AppImage 架構${NC}" ;;
esac

# FUSE 檢查必須在停止服務之前：缺 libfuse2 時新版根本起不來，
# 若已經停掉舊版才發現，service 會卡在 Restart=on-failure 的重試迴圈。
if needs_libfuse2 "$SOURCE_APPIMAGE"; then
    have_libfuse2
    case $? in
        0) echo "  FUSE: libfuse.so.2 可用" ;;
        1)
            echo -e "${RED}此 AppImage 的 runtime 需要 libfuse.so.2，但系統找不到。${NC}"
            echo -e "${RED}目前服務未被變動；安裝所需套件後再執行本腳本：${NC}"
            echo "  sudo apt install -y libfuse2t64    # Debian 13/trixie"
            echo "  sudo apt install -y libfuse2       # 較舊版本的套件名"
            echo "  套件名不確定時先查: apt-cache policy libfuse2t64 libfuse2"
            exit 1 ;;
        *) echo -e "${YELLOW}  FUSE: 找不到 ldconfig，無法確認 libfuse.so.2，略過檢查${NC}" ;;
    esac
fi

APPIMAGE_NAME=$(basename "$SOURCE_APPIMAGE")
RELEASE_DIR="$PROJECT_ROOT/release"
BACKUP_DIR="$PROJECT_ROOT/backups"

if [ -d "$RELEASE_DIR" ]; then
    NESTED_APPIMAGE=$(find "$RELEASE_DIR" -mindepth 2 -name 'TimeStation-*.AppImage' -print -quit 2>/dev/null) \
        || die "無法檢查 $RELEASE_DIR 子目錄，未變更安裝檔案"
    [ -z "$NESTED_APPIMAGE" ] \
        || die "release/ 子目錄含 AppImage: $NESTED_APPIMAGE。請移出後再安裝"
fi

echo "  專案目錄: $PROJECT_ROOT"
echo "  要安裝:   $APPIMAGE_NAME"
echo -e "${GREEN}✓ 前置檢查完成${NC}"

# 步驟 2: 停止正在執行的程式
echo -e "${YELLOW}[2/6] 停止正在執行的 Time Station...${NC}"

SERVICE_EXISTED=0
SERVICE_UNITS=""
if command -v systemctl > /dev/null 2>&1; then
    SERVICE_UNITS=$(systemctl list-unit-files "${SERVICE_NAME}.service" --no-legend 2>/dev/null) \
        || die "無法查詢 ${SERVICE_NAME}.service，未變更安裝檔案"
fi
if [ -n "$SERVICE_UNITS" ]; then
    SERVICE_EXEC=$(systemctl show "${SERVICE_NAME}.service" --property=ExecStart --value 2>/dev/null) \
        || die "無法確認 ${SERVICE_NAME}.service 的啟動路徑，未變更安裝檔案"
    EXPECTED_START=$(abs_path "$PROJECT_ROOT/scripts/start.sh") \
        || die "無法解析啟動腳本路徑，未變更安裝檔案"
    case "$SERVICE_EXEC" in
        *"path="*) SERVICE_PATH=${SERVICE_EXEC#*path=} ;;
        *) die "無法確認 ${SERVICE_NAME}.service 的啟動路徑，未變更安裝檔案" ;;
    esac
    SERVICE_PATH=${SERVICE_PATH%% ;*}
    SERVICE_PATH=${SERVICE_PATH%%;*}
    SERVICE_ROOT=$(cd "$(dirname "$SERVICE_PATH")/.." 2>/dev/null && pwd -P) \
        || die "${SERVICE_NAME}.service 的 ExecStart 與 $EXPECTED_START 不符，未變更安裝檔案"
    EXPECTED_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd -P) \
        || die "無法確認專案目錄，未變更安裝檔案"
    [ "$SERVICE_PATH" -ef "$EXPECTED_START" ] && [ "$SERVICE_ROOT" = "$EXPECTED_ROOT" ] \
        || die "${SERVICE_NAME}.service 的 ExecStart 與 $EXPECTED_START 不符，未變更安裝檔案"
    SERVICE_EXISTED=1
    echo "  偵測到 systemd 服務 ${SERVICE_NAME}.service，停止中..."
    sudo systemctl stop "$SERVICE_NAME" || die "無法停止 ${SERVICE_NAME}.service，未變更安裝檔案"
else
    echo "  未偵測到 systemd 服務，檢查此專案的 AppImage 程序"
fi

# 只處理可確認屬於此安裝目錄的 AppImage；其他程序由使用者確認。
sleep 1
LEFTOVER=$(leftover_pids) || die "無法確認程序狀態，未變更安裝檔案；請檢查服務狀態"
if [ -n "$LEFTOVER" ]; then
    echo "  仍有殘留程序 ($LEFTOVER)，強制終止..."
    kill $LEFTOVER 2>/dev/null
    sleep 2
    LEFTOVER=$(leftover_pids) || die "無法確認程序狀態，未變更安裝檔案；請檢查服務狀態"
    if [ -n "$LEFTOVER" ]; then
        echo "  仍未結束 ($LEFTOVER)，強制終止..."
        kill -9 $LEFTOVER 2>/dev/null
        sleep 1
        LEFTOVER=$(leftover_pids) || die "無法確認程序狀態，未變更安裝檔案；請檢查服務狀態"
        if [ -n "$LEFTOVER" ]; then
            echo -e "${RED}無法停止本專案的 AppImage 程序，未變更安裝檔案${NC}"
            echo -e "${RED}已跳過自動啟動，請先確認殘留程序${NC}"
            exit 1
        fi
    fi
fi
echo -e "${GREEN}✓ 已完成停止步驟；請確認舊程序已退出${NC}"

# 步驟 3: 備份既有版本
echo -e "${YELLOW}[3/6] 備份既有版本...${NC}"

mkdir -p "$RELEASE_DIR" || die_after_stop "無法建立 $RELEASE_DIR"
mkdir -p "$BACKUP_DIR" || die_after_stop "無法建立 $BACKUP_DIR"

SOURCE_ABS=$(abs_path "$SOURCE_APPIMAGE") || die_after_stop "無法解析來源路徑: $SOURCE_APPIMAGE"
RELEASE_ABS=$(cd "$RELEASE_DIR" && pwd -P) || die_after_stop "無法解析 $RELEASE_DIR"
TARGET_ABS="$RELEASE_ABS/$APPIMAGE_NAME"

# 在 Pi 本機打包時，新的 AppImage 本來就產生在 release/ 內，來源與目標是同一個檔案。
SOURCE_IN_PLACE=0
[ "$SOURCE_ABS" = "$TARGET_ABS" ] && SOURCE_IN_PLACE=1

# scripts/start.sh 以 `find release -name 'TimeStation-*.AppImage' | head -n 1`
# 選擇要啟動的檔案，取到哪一個由檔案系統順序決定，而且 find 會遞迴。
# 因此 release/ 必須只留一個 AppImage，備份也必須放在 release/ 之外。
MOVED=0
for old in "$RELEASE_DIR"/TimeStation-*.AppImage; do
    [ -e "$old" ] || continue
    old_abs=$(abs_path "$old") || continue
    # 要安裝的檔案若已在 release/ 內，不能把它當成舊版備份掉——
    # 那會讓後續的安裝步驟找不到來源。
    [ "$old_abs" = "$SOURCE_ABS" ] && continue

    old_name=$(basename "$old")
    dest="$BACKUP_DIR/${old_name}"
    if [ -e "$dest" ]; then
        dest="$BACKUP_DIR/${old_name}.$(date +%Y%m%d-%H%M%S)"
    fi
    mv "$old" "$dest" || die_after_stop "備份失敗: $old"
    BACKUP_FROM+=("$old_abs")
    BACKUP_TO+=("$dest")
    echo "  $old_name -> backups/$(basename "$dest")"
    MOVED=$((MOVED + 1))
done

if [ "$MOVED" -eq 0 ]; then
    if [ "$SOURCE_IN_PLACE" -eq 1 ]; then
        echo "  release/ 內只有要安裝的版本，沒有舊版需要備份"
    else
        echo "  release/ 內沒有既有 AppImage（初次安裝）"
    fi
else
    echo -e "${GREEN}✓ 已備份 $MOVED 個版本到 $BACKUP_DIR${NC}"
fi

# 步驟 4: 安裝新版本
echo -e "${YELLOW}[4/6] 安裝新版本...${NC}"

if [ "$SOURCE_IN_PLACE" -eq 1 ]; then
    echo "  來源已位於 release/，不需搬移（Pi 本機打包的情形）"
    # 不是本次搬進來的，但後續若失敗仍須移出 release/ 才能確定還原舊版。
    # 原位就是 release/，沒有可退回的來源位置，因此 ORIGIN 留空。
    INSTALLED_PATH="$TARGET_ABS"
    INSTALLED_ORIGIN=""
else
    if ! mv "$SOURCE_APPIMAGE" "$TARGET_ABS"; then
        # 跨檔案系統搬移失敗時可能留下不完整的目標檔，先清掉再回退
        if [ -e "$SOURCE_ABS" ] && [ -e "$TARGET_ABS" ]; then
            rm -f "$TARGET_ABS"
        fi
        die_after_stop "安裝失敗：無法將 $APPIMAGE_NAME 放入 release/"
    fi
    INSTALLED_PATH="$TARGET_ABS"
    INSTALLED_ORIGIN="$SOURCE_ABS"
fi
echo -e "${GREEN}✓ $APPIMAGE_NAME 已在 release/${NC}"

# 步驟 5: 設定執行權限（對應 deploy-pi.sh 步驟 6）
echo -e "${YELLOW}[5/6] 設定腳本與 AppImage 執行權限...${NC}"
chmod +x "$RELEASE_DIR"/*.AppImage || die_after_stop "無法設定 AppImage 執行權限"
chmod +x "$PROJECT_ROOT/scripts/start.sh" || die_after_stop "無法設定 start.sh 執行權限"
chmod +x "$PROJECT_ROOT/scripts/stop.sh" || die_after_stop "無法設定 stop.sh 執行權限"
verify_release_state || die_after_stop "安裝後 AppImage 版本狀態不明確"

echo -e "${GREEN}✓ 權限設定完成${NC}"

# 步驟 6: 設定開機自動啟動（對應 deploy-pi.sh 步驟 7）
echo -e "${YELLOW}[6/6] 設定開機自動啟動 (systemd)...${NC}"

if [ "$SERVICE_EXISTED" -eq 1 ]; then
    # service 的 ExecStart 指向 scripts/start.sh，與版號無關，更新時不需重建。
    echo "  ${SERVICE_NAME}.service 已存在，沿用現有設定（ExecStart 與版號無關）"
    if ! sudo systemctl start "$SERVICE_NAME"; then
        sudo systemctl stop "$SERVICE_NAME" \
            || die "服務啟動失敗且無法確認服務已停止，請手動檢查後回退"
        die_after_stop "服務啟動失敗，嘗試回退到先前版本"
    fi
    echo -e "${GREEN}✓ 已送出服務啟動指令，請確認服務狀態與畫面${NC}"
else
    read -p "是否要設定 Time Station 開機自動啟動？ (y/N) " choice
    case "$choice" in
      y|Y )
        echo "正在建立 systemd 服務..."

        # 取得目前使用者名稱
        CURRENT_USER=$(whoami)

        # 建立 service 檔案內容（與 deploy-pi.sh 步驟 7 相同）
        SERVICE_FILE_CONTENT="[Unit]
Description=Time Station Electron App
After=graphical.target network.target

[Service]
User=$CURRENT_USER
Group=$CURRENT_USER
Type=simple
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$CURRENT_USER/.Xauthority
ExecStart=$PROJECT_ROOT/scripts/start.sh
Restart=on-failure
RestartSec=5
WorkingDirectory=$PROJECT_ROOT

[Install]
WantedBy=graphical.target"

        # 寫入 systemd 服務檔案
        echo "$SERVICE_FILE_CONTENT" | sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null \
            || die "無法建立 systemd 服務；AppImage 已安裝，請手動檢查"

        # 重新載入 systemd 並啟用服務
        sudo systemctl daemon-reload || die "無法重新載入 systemd；AppImage 已安裝，請手動檢查"
        sudo systemctl enable "${SERVICE_NAME}.service" || die "無法啟用 systemd 服務；AppImage 已安裝，請手動檢查"
        sudo systemctl start "${SERVICE_NAME}.service" || die "無法啟動 systemd 服務；AppImage 已安裝，請手動檢查"

        echo -e "${GREEN}✓ systemd 服務已建立並啟用${NC}"
        echo "  已送出啟動指令，請確認服務狀態與畫面"
        echo "  你可以使用以下指令管理服務:"
        echo "    - 啟動: sudo systemctl start $SERVICE_NAME"
        echo "    - 停止: sudo systemctl stop $SERVICE_NAME"
        echo "    - 狀態: sudo systemctl status $SERVICE_NAME"
        echo "    - 停用: sudo systemctl disable $SERVICE_NAME"
        ;;
      * )
        echo "跳過設定自動啟動。手動啟動: $PROJECT_ROOT/scripts/start.sh"
        ;;
    esac
fi

# 完成
echo ""
echo "======================================"
echo -e "${GREEN}  安裝完成！${NC}"
echo "======================================"
echo ""
echo "已安裝版本:"
echo "  $RELEASE_DIR/$APPIMAGE_NAME"
echo ""
if [ "$MOVED" -gt 0 ]; then
    echo "回退方式（舊版仍保留在 ${BACKUP_DIR}）:"
    echo "  sudo systemctl stop $SERVICE_NAME"
    echo "  mv $RELEASE_DIR/$APPIMAGE_NAME $BACKUP_DIR/"
    echo "  mv $BACKUP_DIR/<舊版檔名> $RELEASE_DIR/"
    echo "  sudo systemctl start $SERVICE_NAME"
    echo ""
fi
echo "檢查執行狀況:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  tail -f /tmp/time-station.log"
echo ""
echo "測試開機自動啟動:"
echo "  sudo reboot"
echo ""
