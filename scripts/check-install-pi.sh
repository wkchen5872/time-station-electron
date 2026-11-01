#!/bin/bash
# install-pi.sh 的檔案搬移與回退邏輯檢查
#
# 在隔離的暫存目錄建立假專案，並以 stub 隔離系統工具與程序訊號。
#
# 這裡驗的是「失敗時 release/ 必須只剩下一個確定的版本」——
# scripts/start.sh 用 `find release -name 'TimeStation-*.AppImage' | head -n 1`
# 選擇要啟動的檔案，取到哪一個由檔案系統順序決定，所以版本不唯一等於啟動不確定。
#
# 用法:
#   ./check-install-pi.sh            # 檢查 scripts/install-pi.sh
#   SUT=/path/to/variant.sh ./check-install-pi.sh   # 檢查指定版本（用於注入回歸）

set -u

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SCRIPT_UNDER_TEST="${SUT:-$SCRIPT_DIR/install-pi.sh}"

[ -f "$SCRIPT_UNDER_TEST" ] || { echo "找不到待測腳本: $SCRIPT_UNDER_TEST"; exit 1; }

SANDBOX_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/check-install-pi.XXXXXX") \
    || { echo "無法建立暫存目錄"; exit 1; }

# 讓 stub 能呼叫真正的工具（stub 自己會在 PATH 最前面）
REAL_MV=$(command -v mv)
REAL_CHMOD=$(command -v chmod)
REAL_FIND=$(command -v find)

FAILED=0
SCENARIO_FAILED=0
fail() { echo "  FAIL: $1"; FAILED=1; SCENARIO_FAILED=1; }
pass() { [ "$SCENARIO_FAILED" -eq 0 ] && echo "  ok: $1"; SCENARIO_FAILED=0; return 0; }

SANDBOX=""; PROJ=""; RELEASE=""; BACKUPS=""; STAGING=""
SCENARIO_N=0

setup() {
    SCENARIO_FAILED=0
    SCENARIO_N=$((SCENARIO_N + 1))
    SANDBOX="$SANDBOX_ROOT/s$SCENARIO_N"
    PROJ="$SANDBOX/home/time-station-electron"
    RELEASE="$PROJ/release"
    BACKUPS="$PROJ/backups"
    STAGING="$SANDBOX/staging"
    mkdir -p "$SANDBOX/bin" "$PROJ/scripts" "$RELEASE" "$STAGING"

    echo '#!/bin/bash' > "$PROJ/scripts/start.sh"
    echo '#!/bin/bash' > "$PROJ/scripts/stop.sh"

    printf '#!/bin/bash\nexit 0\n' > "$SANDBOX/bin/sudo"
    printf '#!/bin/bash\nexit 0\n' > "$SANDBOX/bin/systemctl"   # 服務不存在
    printf '#!/bin/bash\nexit 1\n' > "$SANDBOX/bin/pgrep"       # 沒有殘留程序
    cat > "$SANDBOX/bash-env" <<'EOF'
kill() { printf '%s\n' "$*" >> "$TS_TEST_SIGNAL_LOG"; return 0; }
EOF
    : > "$SANDBOX/kill.log"
    "$REAL_CHMOD" +x "$SANDBOX/bin"/*
    stub_ps_pgid
}

# 讓 mv 在搬移檔名含 FAIL 的來源時失敗，用來注入「安裝搬移失敗」
stub_failing_mv() {
    {
        echo '#!/bin/bash'
        echo 'for a in "$@"; do'
        echo '    case "$(basename "$a")" in *FAIL*) exit 1 ;; esac'
        echo 'done'
        echo "exec $REAL_MV \"\$@\""
    } > "$SANDBOX/bin/mv"
    "$REAL_CHMOD" +x "$SANDBOX/bin/mv"
}

# 讓 chmod 在對 .AppImage 設定權限時失敗，用來注入「步驟 5 失敗」。
# 此時新檔已成功進入 release/、舊檔已備份，是回退最容易出錯的階段。
stub_failing_chmod() {
    {
        echo '#!/bin/bash'
        echo 'for a in "$@"; do'
        echo '    case "$a" in *.AppImage) exit 1 ;; esac'
        echo 'done'
        echo "exec $REAL_CHMOD \"\$@\""
    } > "$SANDBOX/bin/chmod"
    "$REAL_CHMOD" +x "$SANDBOX/bin/chmod"
}

stub_systemd_service() {
    printf '#!/bin/bash\ncase "$1" in\n  list-unit-files) echo "time-station.service enabled" ;;\n  show) echo "{ path=%s ; argv[]=%s ; }" ;;\nesac\n' \
        "$1" "$1" > "$SANDBOX/bin/systemctl"
    "$REAL_CHMOD" +x "$SANDBOX/bin/systemctl"
}

# 固定 PID 配合 pgrep、ps、readlink 與 kill stub，不對真實程序發信號。
PID_EXTERNAL=999001       # pgid 與待測腳本不同 -> 必須被終止
PID_SAME_GROUP=999003     # pgid 與待測腳本相同 -> 必須被排除
PID_UNRELATED=999004      # 其他工作階段，命令列可能含專案路徑
PID_OTHER_INSTALL=999005  # 另一個安裝目錄的 AppImage

# 固定 process group，避免測試相依於平台的 ps 權限或程序生命週期。
stub_ps_pgid() {
    {
        echo '#!/bin/bash'
        echo 'if [ "$1" = "-o" ] && [ "$2" = "pgid=" ] && [ "$3" = "-p" ]; then'
        echo '    case "$4" in'
        echo "        $PID_EXTERNAL|$PID_UNRELATED|$PID_OTHER_INSTALL) echo ' 999002'; exit 0 ;;"
        echo "        *) echo ' 999000'; exit 0 ;;"
        echo '    esac'
        echo 'fi'
        echo 'exit 1'
    } > "$SANDBOX/bin/ps"
    "$REAL_CHMOD" +x "$SANDBOX/bin/ps"
}

stub_readlink_exe() {
    local release_real
    release_real=$(cd "$RELEASE" && pwd -P)
    {
        echo '#!/bin/bash'
        echo 'case "$1" in'
        echo "    /proc/$PID_EXTERNAL/exe) echo '$release_real/TimeStation-1.2.3-arm64.AppImage' ;;"
        echo "    /proc/$PID_UNRELATED/exe) echo '/bin/bash' ;;"
        echo "    /proc/$PID_OTHER_INSTALL/exe) echo '/other/release/TimeStation-1.2.3-arm64.AppImage' ;;"
        echo '    *) exit 1 ;;'
        echo 'esac'
    } > "$SANDBOX/bin/readlink"
    "$REAL_CHMOD" +x "$SANDBOX/bin/readlink"
}

# pgrep stub 回報自己的 PID、本專案程序與不應終止的外部程序。
# 重現 pkill -f 殺掉自己的情境——專案路徑 /home/pi/time-station-electron
# 本身含 "time-station-electron"，而待測腳本與執行它的 SSH 工作階段的
# 指令列都含該路徑，所以 pgrep -f 會命中自己。
stub_pgrep_matching_self() {
    local keep_external="${1:-0}"
    {
        echo '#!/bin/bash'
        echo "count=\$(cat '$SANDBOX/pgrep-count' 2>/dev/null || echo 0)"
        echo 'count=$((count + 1))'
        echo "echo \"\$count\" > '$SANDBOX/pgrep-count'"
        echo "echo \"\$PPID\" > \"$SANDBOX/pgrep-self-pid.txt\""
        echo 'echo "$PPID"'
        echo "echo $PID_SAME_GROUP"
        echo "if [ '$keep_external' = 1 ] || [ \"\$count\" -le 2 ]; then echo $PID_EXTERNAL; fi"
        echo "echo $PID_UNRELATED"
        echo "echo $PID_OTHER_INSTALL"
    } > "$SANDBOX/bin/pgrep"
    "$REAL_CHMOD" +x "$SANDBOX/bin/pgrep"
    stub_ps_pgid
    stub_readlink_exe
}

# 只回報不該被終止的 PID：代表沒有真正的殘留程序
stub_pgrep_only_self() {
    {
        echo '#!/bin/bash'
        echo "echo \"\$PPID\" > \"$SANDBOX/pgrep-self-pid.txt\""
        echo 'echo "$PPID"'
        echo "echo $PID_SAME_GROUP"
    } > "$SANDBOX/bin/pgrep"
    "$REAL_CHMOD" +x "$SANDBOX/bin/pgrep"
    stub_ps_pgid
    stub_readlink_exe
}

run_install() {
    local rc
    if ! BASH_ENV="$SANDBOX/bash-env" TS_TEST_SIGNAL_LOG="$SANDBOX/kill.log" \
        bash -c '[ "$(type -t kill)" = function ]'; then
        echo "未載入 kill 訊號攔截函式，取消測試" >&2
        echo 99
        return
    fi
    ( PATH="$SANDBOX/bin:$PATH" BASH_ENV="$SANDBOX/bash-env" \
        TS_TEST_SIGNAL_LOG="$SANDBOX/kill.log" bash "$SCRIPT_UNDER_TEST" \
        "$1" "$PROJ" <<< "${2:-n}" ) > "$SANDBOX/out.raw" 2>&1
    rc=$?
    # 去掉 ANSI 色碼，否則貼回終端會亂碼
    LC_ALL=C sed $'s/\033\\[[0-9;]*m//g' "$SANDBOX/out.raw" > "$SANDBOX/out.log"
    echo "$rc"
}

show_log() { echo "    --- 腳本輸出（末 10 行）---"; tail -10 "$SANDBOX/out.log" | sed 's/^/    /'; }

count_appimages() {
    find "$1" -maxdepth 1 -name 'TimeStation-*.AppImage' 2>/dev/null | wc -l | tr -d ' '
}

# release/ 的版本必須唯一，否則 start.sh 會任選一個
assert_single_release() {
    local n
    n=$(count_appimages "$RELEASE")
    [ "$n" = "1" ] || fail "release/ 應只有 1 個 AppImage，實際 ${n}（start.sh 的 find|head 會任選）"
}

echo "== 情境 1：更新（新檔在 release/ 之外）=="
setup
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 $rc"; }
assert_single_release
grep -q "NEW-1.4.0" "$RELEASE/TimeStation-1.4.0-arm64.AppImage" 2>/dev/null \
    || fail "release/ 內容不是新版"
grep -q "OLD-1.2.3" "$BACKUPS/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "舊版沒有被完整備份"
[ -x "$RELEASE/TimeStation-1.4.0-arm64.AppImage" ] || fail "AppImage 沒有執行權限"
[ -x "$PROJ/scripts/start.sh" ] && [ -x "$PROJ/scripts/stop.sh" ] \
    || fail "start.sh/stop.sh 沒有執行權限"
case "$BACKUPS" in "$RELEASE"/*) fail "backups 在 release/ 內，start.sh 的遞迴 find 會撈到" ;; esac
pass "更新流程正確，舊版可回退"

echo "== 情境 2：初次安裝（release/ 是空的）=="
setup
echo "FIRST" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 $rc"; }
assert_single_release
grep -q "初次安裝" "$SANDBOX/out.log" || fail "未回報初次安裝"
pass "初次安裝正常"

echo "== 情境 3：空檔案（上傳中斷）應被擋下 =="
setup
: > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
echo "OLD" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "空檔案應該失敗"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "失敗時不該動到既有版本"
assert_single_release
pass "空檔案被擋下，舊版未受損"

echo "== 情境 4：缺少 start.sh 的目錄應被擋下 =="
setup
rm "$PROJ/scripts/start.sh"
echo "NEW" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "缺 start.sh 應該失敗"
pass "非專案目錄被擋下"

echo "== 情境 5：缺少參數應顯示用法 =="
setup
out=$(PATH="$SANDBOX/bin:$PATH" bash "$SCRIPT_UNDER_TEST" 2>&1); rc=$?
[ "$rc" != "0" ] || fail "缺參數應該失敗"
echo "$out" | grep -q "用法" || fail "未顯示用法"
pass "缺參數顯示用法"

echo "== 情境 6：新檔已在 release/ 內，且是唯一檔案（Pi 本機打包、初次）=="
setup
echo "LOCAL-BUILD" > "$RELEASE/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$RELEASE/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}（應成功：檔案已在正確位置）"; }
assert_single_release
grep -q "LOCAL-BUILD" "$RELEASE/TimeStation-1.4.0-arm64.AppImage" 2>/dev/null \
    || fail "release/ 的檔案不見了或內容錯誤（source 被自己備份掉）"
[ -x "$RELEASE/TimeStation-1.4.0-arm64.AppImage" ] 2>/dev/null || fail "沒有執行權限"
pass "新檔已在 release/ 內時正確處理"

echo "== 情境 7：新檔在 release/ 內 + release 另有舊檔 + backups 已有更早版本 =="
setup
mkdir -p "$BACKUPS"
echo "OLDER-1.1.0" > "$BACKUPS/TimeStation-1.1.0-arm64.AppImage"
echo "OLD-1.2.3"   > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0"   > "$RELEASE/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$RELEASE/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}（應成功）"; }
assert_single_release
grep -q "NEW-1.4.0" "$RELEASE/TimeStation-1.4.0-arm64.AppImage" 2>/dev/null \
    || fail "release/ 留下的不是新版"
grep -q "OLD-1.2.3" "$BACKUPS/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "本次的舊版沒有被備份"
grep -q "OLDER-1.1.0" "$BACKUPS/TimeStation-1.1.0-arm64.AppImage" 2>/dev/null \
    || fail "既有的更早備份被動掉了"
pass "舊版入庫、既有備份保留、release/ 只剩新版"

echo "== 情境 8：安裝搬移失敗時只還原本次移出的檔案 =="
setup
stub_failing_mv
mkdir -p "$BACKUPS"
echo "OLDER-1.1.0" > "$BACKUPS/TimeStation-1.1.0-arm64.AppImage"
echo "OLD-1.2.3"   > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "BROKEN"      > "$STAGING/TimeStation-FAIL-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-FAIL-arm64.AppImage")
[ "$rc" != "0" ] || fail "安裝失敗時應回傳非 0"
grep -q "OLD-1.2.3" "$RELEASE/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "本次移出的舊版沒有被還原回 release/"
assert_single_release
grep -q "OLDER-1.1.0" "$BACKUPS/TimeStation-1.1.0-arm64.AppImage" 2>/dev/null \
    || fail "既有的更早備份被搬走了（回退誤動歷史備份）"
grep -q "已嘗試啟動" "$SANDBOX/out.log" || fail "失敗後未嘗試恢復服務"
pass "只還原本次移出的檔案，既有備份保留，並嘗試恢復服務"

echo "== 情境 9：chmod 失敗（來源在 staging，新檔已進 release/）=="
setup
stub_failing_chmod
mkdir -p "$BACKUPS"
echo "OLDER-1.1.0" > "$BACKUPS/TimeStation-1.1.0-arm64.AppImage"
echo "OLD-1.2.3"   > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0"   > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "chmod 失敗時應回傳非 0"
assert_single_release
grep -q "OLD-1.2.3" "$RELEASE/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "舊版沒有被確定還原回 release/"
[ -e "$RELEASE/TimeStation-1.4.0-arm64.AppImage" ] \
    && fail "本次新檔仍留在 release/，會與舊版並存"
NEW_KEPT=$(find "$SANDBOX" -name 'TimeStation-1.4.0-arm64.AppImage*' 2>/dev/null | head -1)
[ -n "$NEW_KEPT" ] || fail "本次新檔被刪掉了，應保留可恢復性"
[ -n "$NEW_KEPT" ] && { grep -q "NEW-1.4.0" "$NEW_KEPT" 2>/dev/null || fail "保留的新檔內容已損壞"; }
grep -q "OLDER-1.1.0" "$BACKUPS/TimeStation-1.1.0-arm64.AppImage" 2>/dev/null \
    || fail "既有的更早備份被動掉了"
pass "新檔移出且可恢復、舊版確定還原、歷史備份保留"

echo "== 情境 10：chmod 失敗（來源在 release/，Pi 本機打包）=="
setup
stub_failing_chmod
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$RELEASE/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$RELEASE/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "chmod 失敗時應回傳非 0"
assert_single_release
grep -q "OLD-1.2.3" "$RELEASE/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "舊版沒有被確定還原回 release/"
NEW_KEPT=$(find "$SANDBOX" -name 'TimeStation-1.4.0-arm64.AppImage*' 2>/dev/null | head -1)
[ -n "$NEW_KEPT" ] || fail "本次新檔被刪掉了，應保留可恢復性"
case "$NEW_KEPT" in "$RELEASE"/*) fail "新檔仍在 release/ 內" ;; esac
pass "原地來源失敗時同樣移出新檔並還原舊版"

echo "== 情境 11：chmod 失敗且無舊版可還原時，不可提示直接啟動 =="
setup
stub_failing_chmod
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "chmod 失敗時應回傳非 0"
[ "$(count_appimages "$RELEASE")" = "0" ] \
    || fail "沒有舊版可還原時 release/ 應為空，實際 $(count_appimages "$RELEASE")"
grep -q "沒有任何 AppImage" "$SANDBOX/out.log" \
    || fail "未明確告知 release/ 已無可啟動的版本"
pass "無舊版可還原時明確回報，不假裝可以啟動"

echo "== 情境 12：不得把自己當成殘留程序終止 =="
setup
stub_pgrep_matching_self
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
SELF_PID=$(cat "$SANDBOX/pgrep-self-pid.txt" 2>/dev/null)
[ -n "$SELF_PID" ] || fail "pgrep stub 未被呼叫，情境沒有真的重現"
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}（不該因誤殺自己而中斷）"; }
grep -q "強制終止" "$SANDBOX/out.log" || fail "未辨識出外部殘留程序"
grep -q "($PID_EXTERNAL" "$SANDBOX/out.log" \
    || fail "外部殘留程序 $PID_EXTERNAL 沒有被列入終止對象"
grep -Fxq "$PID_EXTERNAL" "$SANDBOX/kill.log" \
    || fail "未記錄對本專案 AppImage 程序的終止訊號"
grep -Fxq -- "-9 $PID_EXTERNAL" "$SANDBOX/kill.log" \
    || fail "未記錄仍未結束時的強制終止訊號"
grep -Eq "(^| )($PID_UNRELATED|$PID_OTHER_INSTALL)($| )" "$SANDBOX/kill.log" \
    && fail "對其他工作階段或安裝目錄的程序發出終止訊號"
grep -q "$PID_SAME_GROUP" "$SANDBOX/out.log" \
    && fail "把同 process group 的 PID $PID_SAME_GROUP 列為要終止的殘留程序"
[ -n "$SELF_PID" ] && grep -q "($SELF_PID" "$SANDBOX/out.log" \
    && fail "把自己行程樹內的 PID $SELF_PID 列為要終止的殘留程序"
assert_single_release
pass "只終止本專案 AppImage 程序，並隔離所有測試訊號"

echo "== 情境 13：只有自己符合比對時，不應回報殘留 =="
setup
stub_pgrep_only_self
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}"; }
grep -q "強制終止" "$SANDBOX/out.log" \
    && fail "沒有真正的殘留程序，卻回報並嘗試終止"
[ -s "$SANDBOX/kill.log" ] && fail "沒有殘留程序時不應發出終止訊號"
assert_single_release
pass "同 process group 的比對結果不算殘留"


echo "== 情境 14：無法取得 process group 時不得繼續安裝 =="
setup
# ps 全面失效：此時無法分辨真正的殘留與本腳本自己
printf '#!/bin/bash\nexit 1\n' > "$SANDBOX/bin/ps"
"$REAL_CHMOD" +x "$SANDBOX/bin/ps"
{
    echo '#!/bin/bash'
    echo "echo $PID_EXTERNAL"
} > "$SANDBOX/bin/pgrep"
"$REAL_CHMOD" +x "$SANDBOX/bin/pgrep"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "無法檢查程序時應停止安裝"
grep -q "無法取得 process group" "$SANDBOX/out.log" \
    || fail "未告知無法檢查殘留程序"
grep -q "強制終止" "$SANDBOX/out.log" \
    && fail "無法判斷 pgid 時仍嘗試終止程序，有誤殺自己的風險"
[ -s "$SANDBOX/kill.log" ] && fail "無法檢查程序時不應發出終止訊號"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
assert_single_release
pass "無法檢查程序時不終止程序，也不搬移檔案"

# ---- FUSE 相依檢查：缺 libfuse2 時 AppImage 根本起不來 ----

# electron-builder 內附的 AppImage runtime 會 dlopen("libfuse.so.2")，
# 所以產物本身含這個字串；用它判斷該產物是否需要 libfuse 2。
write_appimage_needing_libfuse2() {
    printf 'NEW-1.4.0 payload\ndlopen(): error loading libfuse.so.2\n' > "$1"
}

stub_ldconfig() {
    {
        echo '#!/bin/bash'
        if [ "$1" = "with-libfuse2" ]; then
            echo 'echo "        libfuse.so.2 (libc6,AArch64) => /lib/aarch64-linux-gnu/libfuse.so.2"'
        else
            echo 'echo "        libfuse3.so.3 (libc6,AArch64) => /lib/aarch64-linux-gnu/libfuse3.so.3"'
        fi
    } > "$SANDBOX/bin/ldconfig"
    "$REAL_CHMOD" +x "$SANDBOX/bin/ldconfig"
}

echo "== 情境 15：缺 libfuse2 時必須在停止服務前就擋下 =="
setup
stub_ldconfig without-libfuse2
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
write_appimage_needing_libfuse2 "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || { show_log; fail "缺 libfuse2 應該失敗"; }
grep -q "libfuse.so.2" "$SANDBOX/out.log" || fail "未說明缺少 libfuse.so.2"
grep -q "libfuse2t64" "$SANDBOX/out.log" || fail "未提供可執行的安裝指令"
grep -q "2/6" "$SANDBOX/out.log" \
    && fail "已進入步驟 2（停止服務），應在停止前就擋下"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
[ -d "$BACKUPS" ] && fail "不該建立 backups/，因為沒有進入備份階段"
assert_single_release
pass "停止服務前擋下，服務與檔案都未被動到，且給出安裝指令"

echo "== 情境 16：有 libfuse2 時正常安裝 =="
setup
stub_ldconfig with-libfuse2
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
write_appimage_needing_libfuse2 "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}（libfuse2 存在時應成功）"; }
grep -q "libfuse.so.2 可用" "$SANDBOX/out.log" || fail "未回報 libfuse.so.2 可用"
assert_single_release
grep -q "OLD-1.2.3" "$BACKUPS/TimeStation-1.2.3-arm64.AppImage" 2>/dev/null \
    || fail "舊版沒有被備份"
pass "libfuse2 存在時照常安裝"

echo "== 情境 17：不需要 libfuse2 的產物不應被 FUSE 檢查阻擋 =="
setup
stub_ldconfig without-libfuse2
echo "NEW-1.4.0 payload only" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "離開碼 ${rc}（產物不需 libfuse2，不該被擋）"; }
grep -q "libfuse" "$SANDBOX/out.log" && fail "對不需要 libfuse2 的產物做了 FUSE 檢查"
assert_single_release
pass "只在產物真的需要時才檢查"

echo "== 情境 18：systemd 停止失敗時不得搬移檔案 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
printf '#!/bin/bash\nexit 1\n' > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "停止服務失敗時應停止安裝"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
[ -d "$BACKUPS" ] && fail "停止服務失敗時不應建立備份"
grep -q "無法停止" "$SANDBOX/out.log" || fail "未回報服務停止失敗"
pass "停止服務失敗時保留現有檔案與來源檔"

echo "== 情境 19：既有服務屬於其他安裝目錄時不得停止 =="
setup
stub_systemd_service /other/time-station/scripts/start.sh
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "服務指向其他目錄時應停止安裝"
[ ! -s "$SANDBOX/sudo.log" ] || fail "不應停止其他安裝的服務"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
grep -q "ExecStart.*不符" "$SANDBOX/out.log" || fail "未回報服務啟動路徑不符"
pass "不停止其他安裝的服務，也不搬移檔案"

echo "== 情境 20：無法查詢 systemd 時不得搬移檔案 =="
setup
printf '#!/bin/bash\nexit 1\n' > "$SANDBOX/bin/systemctl"
"$REAL_CHMOD" +x "$SANDBOX/bin/systemctl"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "服務查詢失敗時應停止安裝"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
grep -q "無法查詢" "$SANDBOX/out.log" || fail "未回報服務查詢失敗"
pass "無法查詢服務時不搬移檔案"

echo "== 情境 21：既有服務指向本專案時應停止並啟動 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "本專案服務應能正常更新"; }
grep -Fxq 'systemctl stop time-station' "$SANDBOX/sudo.log" || fail "未停止本專案服務"
grep -Fxq 'systemctl start time-station' "$SANDBOX/sudo.log" || fail "未重新啟動本專案服務"
assert_single_release
pass "停止並啟動本專案的既有服務"

echo "== 情境 22：AppImage 程序仍未退出時不得搬移檔案 =="
setup
stub_pgrep_matching_self 1
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "程序仍存在時應停止安裝"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
[ -d "$BACKUPS" ] && fail "程序仍存在時不應建立備份"
grep -q "無法停止本專案的 AppImage 程序" "$SANDBOX/out.log" || fail "未回報程序仍存在"
pass "程序仍存在時保留現有檔案與來源檔"

echo "== 情境 23：服務停止後仍有殘留時不得重新啟動 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
stub_pgrep_matching_self 1
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "程序仍存在時應停止安裝"
grep -Fxq 'systemctl stop time-station' "$SANDBOX/sudo.log" || fail "未停止服務"
grep -q 'systemctl start' "$SANDBOX/sudo.log" && fail "殘留程序存在時不應重新啟動服務"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
pass "保留安裝檔案且不重新啟動服務"

echo "== 情境 24：新版服務啟動失敗時回退舊版 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
{
    echo '#!/bin/bash'
    echo "echo \"\$*\" >> '$SANDBOX/sudo.log'"
    echo "if [ \"\$*\" = 'systemctl start time-station' ] && [ ! -e '$SANDBOX/first-start' ]; then"
    echo "    touch '$SANDBOX/first-start'; exit 1"
    echo 'fi'
    echo 'exit 0'
} > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "新版服務啟動失敗應回傳非 0"
grep -q 'OLD-1.2.3' "$RELEASE/TimeStation-1.2.3-arm64.AppImage" || fail "舊版沒有還原"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "新版來源沒有保留"
expected=$(printf '%s\n' 'systemctl stop time-station' 'systemctl start time-station' \
    'systemctl stop time-station' 'systemctl start time-station')
[ "$(cat "$SANDBOX/sudo.log")" = "$expected" ] || fail "停止、啟動與回退的順序不正確"
assert_single_release
pass "停止失敗的新版服務，還原並嘗試啟動舊版"

echo "== 情境 25：release 子目錄含 AppImage 時不得停止服務 =="
setup
mkdir -p "$RELEASE/nested"
echo "NESTED" > "$RELEASE/nested/TimeStation-1.1.0-arm64.AppImage"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "子目錄有 AppImage 時應停止安裝"
grep -q 'release/ 子目錄含 AppImage' "$SANDBOX/out.log" || fail "未回報子目錄中有 AppImage"
grep -q '2/6' "$SANDBOX/out.log" && fail "不應進入停止服務步驟"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
pass "停止服務前擋下不唯一的版本"

echo "== 情境 26：無法查詢程序時不得搬移檔案 =="
setup
printf '#!/bin/bash\nexit 2\n' > "$SANDBOX/bin/pgrep"
"$REAL_CHMOD" +x "$SANDBOX/bin/pgrep"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "程序查詢失敗時應停止安裝"
grep -q '無法查詢殘留程序' "$SANDBOX/out.log" || fail "未回報程序查詢失敗"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
pass "程序查詢失敗時不搬移檔案"

echo "== 情境 27：安裝途中出現子目錄 AppImage 時不得自動啟動 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
{
    echo '#!/bin/bash'
    echo 'for a in "$@"; do'
    echo '    case "$a" in *.AppImage)'
    echo "        mkdir -p '$RELEASE/nested'"
    echo "        echo NESTED > '$RELEASE/nested/TimeStation-1.1.0-arm64.AppImage' ;;"
    echo '    esac'
    echo 'done'
    echo "exec $REAL_CHMOD \"\$@\""
} > "$SANDBOX/bin/chmod"
"$REAL_CHMOD" +x "$SANDBOX/bin/chmod"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "出現子目錄 AppImage 時應停止安裝"
grep -q '已跳過自動啟動' "$SANDBOX/out.log" || fail "未回報跳過自動啟動"
grep -q 'systemctl start' "$SANDBOX/sudo.log" && fail "版本不唯一時不應啟動服務"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "舊版沒有還原"
pass "遞迴檢查到版本不唯一時不啟動服務"

echo "== 情境 28：遞迴版本檢查失敗時不得自動啟動 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
{
    echo '#!/bin/bash'
    echo "if [ \"\$1\" = '$RELEASE' ] && [ \"\$2\" = '-name' ]; then"
    echo "    echo '$RELEASE/TimeStation-1.4.0-arm64.AppImage'; exit 1"
    echo 'fi'
    echo "exec $REAL_FIND \"\$@\""
} > "$SANDBOX/bin/find"
"$REAL_CHMOD" +x "$SANDBOX/bin/find"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "版本檢查失敗時應停止安裝"
grep -q '無法確認 release/ 的 AppImage 版本' "$SANDBOX/out.log" || fail "未回報版本檢查失敗"
grep -q '已跳過自動啟動' "$SANDBOX/out.log" || fail "未回報跳過自動啟動"
grep -q 'systemctl start' "$SANDBOX/sudo.log" && fail "無法確認版本時不應啟動服務"
pass "版本檢查不完整時不自動啟動服務"

echo "== 情境 29：新版啟動失敗且無法停止服務時不得回退 =="
setup
stub_systemd_service "$(cd "$PROJ/scripts" && pwd -P)/start.sh"
{
    echo '#!/bin/bash'
    echo "echo \"\$*\" >> '$SANDBOX/sudo.log'"
    echo "if [ \"\$*\" = 'systemctl stop time-station' ]; then"
    echo "    [ -e '$SANDBOX/first-stop' ] && exit 1"
    echo "    touch '$SANDBOX/first-stop'; exit 0"
    echo 'fi'
    echo "[ \"\$*\" = 'systemctl start time-station' ] && exit 1"
    echo 'exit 0'
} > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "無法停止服務時應回傳非 0"
grep -q '無法確認服務已停止' "$SANDBOX/out.log" || fail "未要求手動確認服務"
[ -f "$RELEASE/TimeStation-1.4.0-arm64.AppImage" ] || fail "無法確認服務停止時不應回退新版"
[ -f "$BACKUPS/TimeStation-1.2.3-arm64.AppImage" ] || fail "舊版備份不應被動到"
pass "無法確認服務已停止時保留檔案並要求人工處理"

echo "== 情境 30：服務使用相同啟動腳本的符號連結 =="
setup
ln -s "$PROJ" "$SANDBOX/project-link"
stub_systemd_service "$SANDBOX/project-link/scripts/start.sh"
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" = "0" ] || { show_log; fail "指向同一腳本的符號連結應可更新"; }
grep -Fxq 'systemctl start time-station' "$SANDBOX/sudo.log" || fail "未啟動本專案服務"
assert_single_release
pass "以檔案身分確認同一服務啟動腳本"

echo "== 情境 31：建立新服務失敗時不得回報安裝成功 =="
setup
printf '#!/bin/bash\nexit 1\n' > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage" y)
[ "$rc" != "0" ] || fail "建立服務失敗應回傳非 0"
grep -q '無法建立 systemd 服務' "$SANDBOX/out.log" || fail "未回報服務建立失敗"
grep -q '服務已建立並啟用' "$SANDBOX/out.log" && fail "不應回報服務建立成功"
[ -f "$RELEASE/TimeStation-1.4.0-arm64.AppImage" ] || fail "應保留已安裝的 AppImage"
pass "服務建立失敗時明確回報並保留已安裝檔案"

echo "== 情境 32：其他目錄的啟動腳本連結不得視為本專案 =="
setup
mkdir -p "$SANDBOX/other/scripts"
ln -s "$PROJ/scripts/start.sh" "$SANDBOX/other/scripts/start.sh"
stub_systemd_service "$SANDBOX/other/scripts/start.sh"
printf '#!/bin/bash\nprintf "%%s\\n" "$*" >> "%s"\n' "$SANDBOX/sudo.log" > "$SANDBOX/bin/sudo"
"$REAL_CHMOD" +x "$SANDBOX/bin/sudo"
echo "OLD-1.2.3" > "$RELEASE/TimeStation-1.2.3-arm64.AppImage"
echo "NEW-1.4.0" > "$STAGING/TimeStation-1.4.0-arm64.AppImage"
rc=$(run_install "$STAGING/TimeStation-1.4.0-arm64.AppImage")
[ "$rc" != "0" ] || fail "啟動腳本位於其他專案時應停止安裝"
[ ! -s "$SANDBOX/sudo.log" ] || fail "不應停止其他專案的服務"
[ -f "$RELEASE/TimeStation-1.2.3-arm64.AppImage" ] || fail "既有版本被動到了"
[ -f "$STAGING/TimeStation-1.4.0-arm64.AppImage" ] || fail "來源檔被搬走了"
grep -q "ExecStart.*不符" "$SANDBOX/out.log" || fail "未回報服務啟動目錄不符"
pass "不把其他目錄的啟動腳本連結視為本專案"

echo
if [ "$FAILED" -eq 0 ]; then
    echo "全部通過（32 個情境）"
    rm -rf "$SANDBOX_ROOT"
    exit 0
else
    echo "有失敗項目。sandbox 保留在 $SANDBOX_ROOT 供檢查"
    exit 1
fi
