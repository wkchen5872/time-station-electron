#!/bin/bash
# Time Station - 停止腳本

echo "正在停止 Time Station..."

# 找到 AppImage 的進程並終止
# 我們需要找到由 AppImage 啟動的主進程
APP_NAME=$(find "release" -name "TimeStation-*.AppImage" -printf "%f\n" | head -n 1)

if [ -n "$APP_NAME" ]; then
    # pgrep -f 會比對整個命令列
    # 這會找到所有包含 AppImage 名稱的進程
    PIDS=$(pgrep -f "$APP_NAME")
    if [ -n "$PIDS" ]; then
        echo "找到 Time Station 進程，PID(s): $PIDS。正在終止..."
        kill $PIDS
        # 等待一會，然後檢查是否已終止
        sleep 2
        PIDS_AFTER=$(pgrep -f "$APP_NAME")
        if [ -n "$PIDS_AFTER" ]; {
            echo "進程未能正常終止，強制終止..."
            kill -9 $PIDS_AFTER
        }
        echo "Time Station 已停止。"
    else
        echo "Time Station 未在執行。"
    fi
else
    echo "錯誤：找不到 AppImage 檔案名稱。"
fi
