#!/bin/bash
# Time Station - Raspberry Pi 部署腳本

echo "======================================"
echo "  Time Station - 部署到 Raspberry Pi"
echo "======================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Path setup ---
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# The project root is one level up
PROJECT_ROOT="$SCRIPT_DIR/.."

# Change to the project root directory
cd "$PROJECT_ROOT" || { echo -e "${RED}無法切換到專案根目錄: $PROJECT_ROOT${NC}"; exit 1; }
echo "目前工作目錄: $(pwd)"
# --- End of Path setup ---


# 檢查是否為 root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}請不要使用 sudo 執行此腳本${NC}"
   exit 1
fi

# 步驟 1: 檢查 Node.js
echo -e "${YELLOW}[1/7] 檢查 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js 未安裝！${NC}"
    echo "請先安裝 Node.js 18.x:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 步驟 2: 安裝系統依賴
echo -e "${YELLOW}[2/7] 安裝系統依賴...${NC}"
sudo apt update
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libasound2

echo -e "${GREEN}✓ 系統依賴安裝完成${NC}"

# 步驟 3: 安裝 NPM 套件
echo -e "${YELLOW}[3/7] 安裝 NPM 套件...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ NPM 套件安裝完成${NC}"
else
    echo -e "${RED}✗ NPM 套件安裝失敗${NC}"
    exit 1
fi

# 步驟 4: 檢查 .env 設定檔
echo -e "${YELLOW}[4/7] 檢查 .env 設定檔...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}找不到 .env 檔案，正在從 .env.example 複製...${NC}"
    cp .env.example .env
fi

# 檢查 API Keys
CWA_API_KEY=$(grep "VITE_CWA_API_KEY" .env | cut -d '=' -f2)
IPGEO_API_KEY=$(grep "VITE_IPGEOLOCATION_API_KEY" .env | cut -d '=' -f2)

if [ -z "$CWA_API_KEY" ] || [[ "$CWA_API_KEY" == "YOUR_CWA_API_KEY_HERE" ]]; then
    echo -e "${YELLOW}⚠ 警告: 尚未設定 CWA 天氣 API Key (VITE_CWA_API_KEY)${NC}"
    echo "  請編輯 .env 檔案並填入你的 API Key"
fi
if [ -z "$IPGEO_API_KEY" ] || [[ "$IPGEO_API_KEY" == "YOUR_IPGEOLOCATION_API_KEY" ]]; then
    echo -e "${YELLOW}⚠ 警告: 尚未設定 IP Geolocation API Key (VITE_IPGEOLOCATION_API_KEY)${NC}"
    echo "  請編輯 .env 檔案並填入你的 API Key"
fi

echo -e "${GREEN}✓ .env 設定檔檢查完成${NC}"

# 步驟 5: 建置應用程式
echo -e "${YELLOW}[5/7] 建置 Electron 應用程式...${NC}"
echo "  這可能需要 10-20 分鐘，請耐心等待..."

npm run electron:build:appimage

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 應用程式建置完成${NC}"
else
    echo -e "${RED}✗ 建置失敗${NC}"
    exit 1
fi

# 步驟 6: 設定執行權限
echo -e "${YELLOW}[6/7] 設定腳本與 AppImage 執行權限...${NC}"
chmod +x release/*.AppImage
chmod +x scripts/start.sh
chmod +x scripts/stop.sh

echo -e "${GREEN}✓ 權限設定完成${NC}"


# 步驟 7: 設定開機自動啟動
echo -e "${YELLOW}[7/7] 設定開機自動啟動 (systemd)...${NC}"
read -p "是否要設定 Time Station 開機自動啟動？ (y/N) " choice
case "$choice" in
  y|Y )
    echo "正在建立 systemd 服務..."

    # 取得目前使用者名稱
    CURRENT_USER=$(whoami)
    # 取得專案的絕對路徑
    PROJECT_PATH=$(pwd)

    # 建立 service 檔案內容
    SERVICE_FILE_CONTENT="[Unit]
Description=Time Station Electron App
After=graphical.target network.target

[Service]
User=$CURRENT_USER
Group=$CURRENT_USER
Type=simple
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$CURRENT_USER/.Xauthority
ExecStart=$PROJECT_PATH/scripts/start.sh
Restart=on-failure
RestartSec=5
WorkingDirectory=$PROJECT_PATH

[Install]
WantedBy=graphical.target"

    # 寫入 systemd 服務檔案
    echo "$SERVICE_FILE_CONTENT" | sudo tee /etc/systemd/system/time-station.service > /dev/null

    # 重新載入 systemd 並啟用服務
    sudo systemctl daemon-reload
    sudo systemctl enable time-station.service

    echo -e "${GREEN}✓ systemd 服務已建立並啟用${NC}"
    echo "  你可以使用以下指令管理服務:"
    echo "    - 啟動: sudo systemctl start time-station"
    echo "    - 停止: sudo systemctl stop time-station"
    echo "    - 狀態: sudo systemctl status time-station"
    echo "    - 停用: sudo systemctl disable time-station"
    ;;
  * )
    echo "跳過設定自動啟動。"
    ;;
esac


# 完成
echo ""
echo "======================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "======================================"
echo ""
echo "下一步:"
echo "1. 執行部署腳本:"
echo "   ./scripts/deploy-pi.sh"
echo ""
echo "2. 測試執行:"
echo "   ./release/TimeStation-*.AppImage"
echo ""
echo "3. 如果剛才沒有設定自動啟動，你可以手動設定或重新執行此腳本。"
echo ""
echo "4. 編輯 API Keys (如果還沒設定):"
echo "   nano .env"
echo ""
echo "5. 重新開機以測試自動啟動功能:"
echo "   sudo reboot"
echo ""
