---
type: Playbook
title: Time Station 早期快速開始
description: 保留早期快速開始內容，現行步驟請參閱目前實作說明。
tags: [getting-started, legacy]
timestamp: 2026-10-31T00:00:00+08:00
---

# ⚡ Time Station - 5 分鐘快速開始

## 現行版本說明

本頁以下是早期指南，Node.js 版本、OpenWeatherMap、API Key 位置、部署腳本路徑、版面和按鍵操作有過時內容。請使用 [目前實作與使用說明](/docs/current-implementation.md) 的指令及設定；不要依下方舊範例修改程式或設定 API Key。

## 你需要知道的事

這是一個 **Electron + Vue.js** 專案，專為 **Raspberry Pi 7吋觸控螢幕** 設計。

**設計方案：** 左側顯示時間/日期 (2/3)，右側顯示天氣 (1/3)

---

## 🎯 三種使用方式

### 1️⃣ 我只想快速看效果（推薦新手）

```bash
# 在你的電腦上（Windows/macOS/Linux）
git clone <repo-url> time-station-electron
cd time-station-electron
npm install
npm run electron:dev
```

**結果：** 視窗會彈出，顯示時鐘介面（不是全螢幕，方便測試）

**特色：**
- ✅ 即時預覽
- ✅ 修改程式碼自動更新
- ✅ 按 ESC 關閉視窗
- ✅ 左上角主題切換按鈕（測試 Light/Dark 模式）

---

### 2️⃣ 我要部署到 Raspberry Pi

```bash
# 在 Raspberry Pi 上執行
cd ~
git clone <repo-url> time-station-electron
cd time-station-electron

# 執行自動部署腳本
chmod +x deploy-pi.sh
./deploy-pi.sh

# 等待建置完成（約 15 分鐘）
# 完成後執行
./release/TimeStation-*.AppImage
```

**結果：** 全螢幕 Kiosk 模式啟動，佔滿整個螢幕

---

### 3️⃣ 我是開發者，想客製化

**閱讀順序：**
1. `README.md` - 了解專案架構
2. `development/DEVELOPMENT.md` - 學習如何修改
3. `SPECIFICATION.md` - 對照規格與實作

**主要檔案：**
- `src/components/TimeStation.vue` - 所有 UI 邏輯
- `.env` - API Key
- `src/defaultConfig.js` - 內建預設值（城市、睡眠時段、刷新週期）
- `electron/main.js` - Electron 設定

---

## 🔑 必須設定的東西

### 中央氣象署 API Key（天氣功能必要）

1. 前往 https://opendata.cwa.gov.tw/
2. 註冊免費帳號
3. 取得 API Key
4. 複製 `.env.example` 為 `.env` 並填入：

```
VITE_CWA_API_KEY=貼上你的 API Key
```

⚠️ `.env` 的值會在建置時打包進前端產物，不要公開建置出的 AppImage。

### 城市（選用）

地區預設由 IP 定位決定。定位停用或失敗且無快取時，才使用
`src/defaultConfig.js` 的後備值：

```js
location: {
    city: '台北市',
    district: ''
}
```

本專案不提供執行期設定檔——改了這個檔需要重新建置才會生效。

---

## 📂 專案結構（簡化版）

```
time-station-electron/
├── src/
│   └── components/
│       └── TimeStation.vue    ← 👈 主要 UI，改這裡！
│
├── electron/
│   └── main.js               ← 👈 全螢幕設定
│
├── .env                      ← 👈 API Key
└── package.json              ← NPM 設定
```

---

## 🎨 我想改外觀

### 使用主題切換按鈕（最簡單）

**位置：** 左上角

**功能：** 點擊按鈕循環切換三種模式
- 🌗 **Auto** - 自動根據日出日落切換
- ☀️ **Light** - 強制淺色模式
- 🌙 **Dark** - 強制深色模式

**用途：**
- 開發時快速測試不同配色
- 在 MacBook 上模擬樹莓派夜間模式
- 部署後仍可手動調整

### 改變字體大小

**檔案：** `src/components/TimeStation.vue`

**找到：**
```vue
<div class="text-[140px]">  <!-- 時間 -->
```

**改為：**
```vue
<div class="text-[160px]">  <!-- 更大 -->
<div class="text-[120px]">  <!-- 更小 -->
```

**⚠️ 注意：** 樹莓派 7 寸螢幕建議避免使用 `text-xs` (12px)，最小使用 `text-sm` (14px)

### 改變顏色

**找到：**
```vue
isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
```

**改為：**
```vue
isDarkMode ? 'bg-black' : 'bg-blue-50'  <!-- 藍色背景 -->
```

**⚠️ 樹莓派注意：**
- Light Mode 主文字使用 `text-gray-900` 或 `text-gray-800`（避免 `gray-600` 以下）
- Dark Mode 主文字使用 `text-white` 或 `text-gray-200`（避免 `gray-400` 以下）
- 16-bit 色深螢幕對比度要求更高

### 改變佈局比例

**找到：**
```vue
<div class="col-span-2">  <!-- 左側 2/3 -->
<div class="col-span-1">  <!-- 右側 1/3 -->
```

**改為：**
```vue
<div class="col-span-3">  <!-- 左側 3/4 -->
<div class="col-span-1">  <!-- 右側 1/4 -->
```

並記得修改：
```vue
<div class="grid grid-cols-3">  <!-- 改為 4 -->
```

---

## 🐛 常見問題

### Q: npm install 失敗？

**A:** 確認 Node.js 版本

```bash
node -v  # 應該是 v18.x 或更高

# 如果版本太舊，重新安裝
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Q: Electron 無法啟動？

**A:** 安裝系統依賴

```bash
sudo apt install -y libgtk-3-0 libnotify4 libnss3 \
  libxss1 libxtst6 xdg-utils
```

### Q: 天氣顯示「載入中」？

**A:** 檢查 `.env` 的 `VITE_CWA_API_KEY` 是否正確，並確認修改後已重新建置

### Q: 全螢幕無法退出？

**A:** 
- 開發模式：按 ESC
- 生產模式：按 `Ctrl + Alt + F1` 切換到 TTY，執行 `pkill electron`

### Q: 農曆顯示錯誤？

**A:** 重新安裝套件

```bash
npm install solarlunar --save
```

---

## 🚀 開機自動啟動

### 最簡單方法

```bash
# 創建 autostart 檔案
mkdir -p ~/.config/autostart
nano ~/.config/autostart/time-station.desktop
```

**貼上：**

```ini
[Desktop Entry]
Type=Application
Name=Time Station
Exec=/home/pi/time-station-electron/release/TimeStation-1.0.0.AppImage
X-GNOME-Autostart-enabled=true
```

**儲存後重新啟動：**

```bash
sudo reboot
```

---

## 📚 進階閱讀

- **完整文件：** `README.md`
- **開發指南：** `development/DEVELOPMENT.md`
- **規格對照：** `SPECIFICATION.md`

---

## 💬 需要幫助？

### 使用 Claude Code

```bash
cd time-station-electron
claude code

# 然後問 Claude：
# "幫我調整時間字體到 160px"
# "把天氣區域改大一點"
# "加入節氣顯示"
```

### 檢查日誌

```bash
# 開發模式
npm run electron:dev  # 日誌會顯示在終端機

# 生產模式
./TimeStation-1.0.0.AppImage > app.log 2>&1
cat app.log  # 查看日誌
```

---

**就這麼簡單！** 🎉

5 分鐘內你應該能看到時鐘運行了。

有問題隨時查閱完整的 `README.md`！
