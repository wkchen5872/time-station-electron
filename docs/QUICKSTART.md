# ⚡ Time Station - 5 分鐘快速開始

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
2. `DEVELOPMENT.md` - 學習如何修改
3. `SPECIFICATION.md` - 對照規格與實作

**主要檔案：**
- `src/components/TimeStation.vue` - 所有 UI 邏輯
- `config.json` - 設定檔（城市、API Key）
- `electron/main.js` - Electron 設定

---

## 🔑 必須設定的東西

### OpenWeatherMap API Key（必要）

1. 前往 https://openweathermap.org/api
2. 註冊免費帳號
3. 取得 API Key
4. 編輯 `config.json`：

```json
{
  "weather": {
    "apiKey": "貼上你的 API Key"
  }
}
```

### 城市與經緯度（建議）

```json
{
  "location": {
    "city": "你的城市",
    "latitude": 你的緯度,
    "longitude": 你的經度
  }
}
```

💡 **如何找經緯度？**
- Google Maps → 右鍵點擊 → 複製經緯度

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
├── config.json               ← 👈 設定檔（API Key）
└── package.json              ← NPM 設定
```

---

## 🎨 我想改外觀

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

### 改變顏色

**找到：**
```vue
isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
```

**改為：**
```vue
isDarkMode ? 'bg-black' : 'bg-blue-50'  <!-- 藍色背景 -->
```

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

**A:** 檢查 API Key 是否正確設定在 `config.json`

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
- **開發指南：** `DEVELOPMENT.md`
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
