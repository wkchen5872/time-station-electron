#!/bin/bash
# Time Station - 上傳 AppImage 與安裝腳本到 Raspberry Pi
#
# 在開發機（已完成 npm run electron:build:appimage）執行。
# 把 release/ 的 AppImage 與 scripts/install-pi.sh 送到 Pi，然後可選擇直接執行安裝。
#
# host 由互動輸入；密碼由 ssh 自行詢問，本腳本不讀取、不保存、不傳遞密碼。
# 使用 ssh ControlMaster 共用單一連線，所以密碼只需輸入一次。

echo "======================================"
echo "  Time Station - 上傳到 Raspberry Pi"
echo "======================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

die() { echo -e "${RED}$1${NC}"; exit 1; }

# --- Path setup ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT" || die "無法切換到專案根目錄: $PROJECT_ROOT"
echo "目前工作目錄: $(pwd)"
# --- End of Path setup ---

REMOTE_STAGING="time-station-staging"
INSTALL_SCRIPT="$SCRIPT_DIR/install-pi.sh"

# 步驟 1: 選擇要上傳的 AppImage
echo -e "${YELLOW}[1/5] 選擇要上傳的 AppImage...${NC}"

[ -f "$INSTALL_SCRIPT" ] || die "找不到 $INSTALL_SCRIPT"

# 用版號排序（-V），不是字典序：字典序會把 1.10.0 排在 1.3.0 前面。
# 舊版產物常留在 release/ 內，所以預設選最新版而不是碰到的第一個。
SORT_CMD=(sort -V)
printf 'x\n' | sort -V > /dev/null 2>&1 || SORT_CMD=(sort)

APPIMAGES=()
while IFS= read -r f; do
    APPIMAGES+=("$f")
done < <(find release -maxdepth 1 -name "TimeStation-*.AppImage" 2>/dev/null | "${SORT_CMD[@]}")

case "${#APPIMAGES[@]}" in
    0)
        die "release/ 內找不到 AppImage。請先執行: npm run electron:build:appimage" ;;
    1)
        LOCAL_APPIMAGE="${APPIMAGES[0]}" ;;
    *)
        NEWEST=${#APPIMAGES[@]}
        echo "release/ 內有多個 AppImage（依版號排序）："
        for i in "${!APPIMAGES[@]}"; do
            if [ "$((i + 1))" -eq "$NEWEST" ]; then
                echo "  [$((i + 1))] $(basename "${APPIMAGES[$i]}")  <- 最新"
            else
                echo "  [$((i + 1))] $(basename "${APPIMAGES[$i]}")"
            fi
        done
        read -p "要上傳哪一個？ (1-$NEWEST) [$NEWEST] " pick
        pick="${pick:-$NEWEST}"
        [[ "$pick" =~ ^[0-9]+$ ]] || die "請輸入數字"
        [ "$pick" -ge 1 ] && [ "$pick" -le "$NEWEST" ] || die "超出範圍"
        LOCAL_APPIMAGE="${APPIMAGES[$((pick - 1))]}" ;;
esac

APPIMAGE_NAME=$(basename "$LOCAL_APPIMAGE")
LOCAL_SIZE=$(wc -c < "$LOCAL_APPIMAGE" | tr -d ' ')

echo "  檔案: $APPIMAGE_NAME"
echo "  大小: $((LOCAL_SIZE / 1024 / 1024)) MB"
echo -e "${GREEN}✓ 已選擇${NC}"

# 步驟 2: 輸入連線資訊
echo -e "${YELLOW}[2/5] 輸入 Raspberry Pi 連線資訊...${NC}"

DEFAULT_HOST="${PI_HOST:-pi@raspberrypi.local}"
read -p "Pi host (user@host) [$DEFAULT_HOST]: " PI_TARGET
PI_TARGET="${PI_TARGET:-$DEFAULT_HOST}"

# 只填主機時 ssh 會用本機的登入名稱，在 Pi 上通常不存在而認證失敗
case "$PI_TARGET" in
    *@*) : ;;
    *)
        echo -e "${YELLOW}  未指定使用者名稱，ssh 會改用本機帳號 $(whoami)${NC}"
        read -p "  Pi 上的使用者名稱 [pi]: " PI_USER
        PI_TARGET="${PI_USER:-pi}@$PI_TARGET" ;;
esac

DEFAULT_DIR="${PI_PROJECT_DIR:-/home/pi/time-station-electron}"
read -p "Pi 上的專案目錄 [$DEFAULT_DIR]: " PI_DIR
PI_DIR="${PI_DIR:-$DEFAULT_DIR}"

echo "  目標: $PI_TARGET:$PI_DIR"

# 步驟 3: 建立共用連線（密碼在此由 ssh 詢問，只需輸入一次）
echo -e "${YELLOW}[3/5] 建立 SSH 連線...${NC}"

# ControlPath 需夠短，Unix socket 路徑有長度上限
CTL_PATH="/tmp/ts-upload-$$.sock"
SSH_OPTS=(-o "ControlPath=$CTL_PATH")

cleanup() {
    if [ -S "$CTL_PATH" ]; then
        ssh "${SSH_OPTS[@]}" -O exit "$PI_TARGET" 2>/dev/null
    fi
    rm -f "$CTL_PATH"
}
trap cleanup EXIT

echo "  若使用密碼登入，ssh 會在此詢問（本腳本不處理密碼）"
ssh -o ControlMaster=yes -o ControlPersist=600 "${SSH_OPTS[@]}" \
    -o ConnectTimeout=15 -N -f "$PI_TARGET" \
    || die "SSH 連線失敗: $PI_TARGET"

echo -e "${GREEN}✓ 已連線${NC}"

# 步驟 4: 檢查遠端環境並上傳
echo -e "${YELLOW}[4/5] 檢查遠端環境...${NC}"

REMOTE_ARCH=$(ssh "${SSH_OPTS[@]}" "$PI_TARGET" "uname -m" 2>/dev/null | tr -d '\r')
[ -n "$REMOTE_ARCH" ] || die "無法取得遠端架構"
echo "  遠端架構: $REMOTE_ARCH"
if [ "$REMOTE_ARCH" != "aarch64" ]; then
    echo -e "${YELLOW}⚠ 遠端不是 aarch64，arm64 的 AppImage 可能無法執行${NC}"
    read -p "仍要繼續？ (y/N) " go
    case "$go" in y|Y ) ;; * ) die "已取消" ;; esac
fi

ssh "${SSH_OPTS[@]}" "$PI_TARGET" "[ -f '$PI_DIR/scripts/start.sh' ]" \
    || die "遠端 $PI_DIR 不像是專案目錄（找不到 scripts/start.sh）"

ssh "${SSH_OPTS[@]}" "$PI_TARGET" "mkdir -p ~/$REMOTE_STAGING" \
    || die "無法建立遠端暫存目錄 ~/$REMOTE_STAGING"

echo -e "${GREEN}✓ 遠端環境正常${NC}"

echo -e "${YELLOW}  上傳 $APPIMAGE_NAME ...${NC}"
scp "${SSH_OPTS[@]}" "$LOCAL_APPIMAGE" "$PI_TARGET:~/$REMOTE_STAGING/" \
    || die "AppImage 上傳失敗"

echo -e "${YELLOW}  上傳 install-pi.sh ...${NC}"
scp "${SSH_OPTS[@]}" "$INSTALL_SCRIPT" "$PI_TARGET:~/$REMOTE_STAGING/" \
    || die "install-pi.sh 上傳失敗"

# 比對大小。AppImage 不完整時 install-pi.sh 的架構檢查未必會擋下來，
# 所以在這裡確認傳輸完整。
REMOTE_SIZE=$(ssh "${SSH_OPTS[@]}" "$PI_TARGET" \
    "wc -c < ~/$REMOTE_STAGING/$APPIMAGE_NAME" 2>/dev/null | tr -d ' \r')
if [ "$REMOTE_SIZE" != "$LOCAL_SIZE" ]; then
    die "大小不符：本機 ${LOCAL_SIZE}，遠端 ${REMOTE_SIZE:-無法取得}。請重新上傳"
fi
echo -e "${GREEN}✓ 上傳完成，大小相符 ($LOCAL_SIZE bytes)${NC}"

# 步驟 5: 執行安裝
echo -e "${YELLOW}[5/5] 執行安裝...${NC}"
echo ""
echo "接下來會在 Pi 上執行安裝，動作包含："
echo "  - 停止目前執行中的 Time Station"
echo "  - 把 release/ 內既有的 AppImage 移到 backups/（保留回退）"
echo "  - 安裝新版並設定執行權限"
echo "  - 設定或重新啟動 systemd 服務"
echo ""
read -p "現在執行安裝？ (y/N) " run_now

case "$run_now" in
  y|Y )
    echo ""
    # 需要 TTY：install-pi.sh 會詢問自動啟動設定，sudo 也可能要求密碼
    ssh "${SSH_OPTS[@]}" -t "$PI_TARGET" \
        "bash ~/$REMOTE_STAGING/install-pi.sh ~/$REMOTE_STAGING/$APPIMAGE_NAME '$PI_DIR'"
    INSTALL_RC=$?
    echo ""
    if [ $INSTALL_RC -eq 0 ]; then
        echo -e "${GREEN}✓ 安裝流程結束${NC}"
    else
        echo -e "${RED}✗ 安裝腳本回傳 ${INSTALL_RC}，請檢查上方訊息${NC}"
        exit $INSTALL_RC
    fi
    ;;
  * )
    echo "已跳過安裝。稍後可自行在 Pi 上執行："
    echo "  ssh $PI_TARGET"
    echo "  bash ~/$REMOTE_STAGING/install-pi.sh ~/$REMOTE_STAGING/$APPIMAGE_NAME '$PI_DIR'"
    ;;
esac

echo ""
echo "======================================"
echo -e "${GREEN}  完成${NC}"
echo "======================================"
echo ""
echo "檢查執行狀況:"
echo "  ssh $PI_TARGET 'sudo systemctl status time-station'"
echo "  ssh $PI_TARGET 'tail -f /tmp/time-station.log'"
echo ""
