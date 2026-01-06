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

# 檢查是否為 root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}請不要使用 sudo 執行此腳本${NC}"
   exit 1
fi

# 步驟 1: 檢查 Node.js
echo -e "${YELLOW}[1/6] 檢查 Node.js...${NC}"
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
echo -e "${YELLOW}[2/6] 安裝系統依賴...${NC}"
sudo apt update
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libasound2

echo -e "${GREEN}✓ 系統依賴安裝完成${NC}"

# 步驟 3: 安裝 NPM 套件
echo -e "${YELLOW}[3/6] 安裝 NPM 套件...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ NPM 套件安裝完成${NC}"
else
    echo -e "${RED}✗ NPM 套件安裝失敗${NC}"
    exit 1
fi

# 步驟 4: 檢查設定檔
echo -e "${YELLOW}[4/6] 檢查設定檔...${NC}"
if [ ! -f "config.json" ]; then
    echo -e "${RED}找不到 config.json！${NC}"
    exit 1
fi

API_KEY=$(grep -o '"apiKey": "[^"]*"' config.json | cut -d'"' -f4)
if [ "$API_KEY" == "YOUR_API_KEY_HERE" ]; then
    echo -e "${YELLOW}⚠ 警告: 尚未設定天氣 API Key${NC}"
    echo "  請編輯 config.json 並填入你的 OpenWeatherMap API Key"
fi

echo -e "${GREEN}✓ 設定檔檢查完成${NC}"

# 步驟 5: 建置應用程式
echo -e "${YELLOW}[5/6] 建置 Electron 應用程式...${NC}"
echo "  這可能需要 10-20 分鐘，請耐心等待..."

npm run electron:build:appimage

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 應用程式建置完成${NC}"
else
    echo -e "${RED}✗ 建置失敗${NC}"
    exit 1
fi

# 步驟 6: 設定執行權限
echo -e "${YELLOW}[6/6] 設定執行權限...${NC}"
chmod +x release/*.AppImage

echo -e "${GREEN}✓ 權限設定完成${NC}"

# 完成
echo ""
echo "======================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "======================================"
echo ""
echo "下一步:"
echo "1. 測試執行:"
echo "   ./release/TimeStation-*.AppImage"
echo ""
echo "2. 設定開機自動啟動:"
echo "   請參考 README.md 的說明"
echo ""
echo "3. 編輯天氣 API Key (如果還沒設定):"
echo "   nano config.json"
echo ""
