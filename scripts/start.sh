#!/bin/bash
# Time Station - 啟動腳本

# 取得此腳本所在的目錄
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# 專案根目錄 (上一層)
PROJECT_ROOT="$DIR/.."

# 進入專案根目錄
cd "$PROJECT_ROOT"

# 找到 AppImage 檔案
APP_IMAGE=$(find "$PROJECT_ROOT/release" -name "TimeStation-*.AppImage" | head -n 1)

if [ -z "$APP_IMAGE" ]; then
  echo "錯誤：找不到 AppImage 檔案！"
  exit 1
fi

echo "正在啟動 Time Station..."
# 啟動應用程式，並傳入 --no-sandbox 參數，這在 Raspberry Pi 上有時是必要的
# 將日誌導出到 /tmp/time-station.log
"$APP_IMAGE" --no-sandbox > /tmp/time-station.log 2>&1 &
