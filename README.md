# Time Station - 時光台 ⏰
## Raspberry Pi 智慧桌曆與氣象站 (Electron Version)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi-red)
![Tech](https://img.shields.io/badge/tech-Electron%20%7C%20Vue.js%20%7C%20Tailwind-green)

基於 Electron + Vue.js + Tailwind CSS 打造的全螢幕智慧顯示器，專為 Raspberry Pi 4 (4GB) 與 7 吋觸控螢幕設計。

### 📸 專案特色

- ⏰ **超大時間顯示** - 清晰易讀的數位時鐘
- 📅 **雙曆法顯示** - 國曆 + 農曆 + 節氣
- 🌤️ **即時天氣** - OpenWeatherMap API 整合
- 🌓 **自動日夜模式** - 根據日出日落自動切換主題
- 🤖 **AI 訊息預留** - 可串接 AI 生成每日建議
- 📱 **觸控優化** - Kiosk 模式，隱藏滑鼠游標
- 🎨 **方案二設計** - 左時間 (2/3) + 右天氣 (1/3)

---

## 📋 技術規格

### 硬體需求
- **主機板：** Raspberry Pi 4 Model B (4GB RAM)
- **螢幕：** 7 吋觸控螢幕 (800x480 或 1024x600)
- **儲存：** microSD 卡 16GB 以上
- **系統：** Raspberry Pi OS (Debian based)

### 技術棧
```
├── Electron 28.x      (跨平台桌面應用框架)
├── Vue.js 3.x         (前端框架)
├── Tailwind CSS 3.x   (樣式框架)
├── Vite 5.x           (建置工具)
├── solarlunar         (農曆計算)
└── Node.js 18.x+      (執行環境)
```

---

## 🚀 快速開始

### 方法一：開發模式（推薦用於測試）

#### 1. 安裝 Node.js

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js 18.x (推薦使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 驗證安裝
node -v  # 應顯示 v18.x.x
npm -v   # 應顯示 9.x.x
```

#### 2. Clone 專案並安裝依賴

```bash
# Clone 專案
cd ~
git clone <your-repo-url> time-station-electron
cd time-station-electron

# 安裝依賴套件（首次執行較慢）
npm install
```

#### 3. 設定 API Key

編輯 `config.json`：

```bash
nano config.json
```

修改以下內容：

```json
{
  "location": {
    "city": "你的城市",
    "latitude": 你的緯度,
    "longitude": 你的經度
  },
  "weather": {
    "apiKey": "貼上你的 OpenWeatherMap API Key"
  }
}
```

💡 **取得免費 API Key：** [OpenWeatherMap](https://openweathermap.org/api)

#### 4. 開發模式執行

```bash
# 啟動開發伺服器
npm run electron:dev
```

**開發模式特色：**
- ✅ 視窗化執行（非全螢幕）
- ✅ 即時熱重載 (Hot Reload)
- ✅ 開啟 DevTools 方便除錯
- ✅ 可以按 ESC 退出

---

### 方法二：生產模式（實際部署）

#### 1. 建置 Electron App

```bash
# 建置 AppImage（Linux ARM64）
npm run electron:build:appimage
```

建置完成後，在 `release/` 目錄下會產生 `.AppImage` 檔案。

#### 2. 執行 AppImage

```bash
# 給予執行權限
chmod +x release/TimeStation-*.AppImage

# 執行應用程式
./release/TimeStation-*.AppImage
```

**生產模式特色：**
- ✅ 全螢幕 Kiosk 模式
- ✅ 無邊框、無選單列
- ✅ 自動隱藏滑鼠游標
- ✅ 優化記憶體使用

---

## ⚙️ 設定開機自動啟動

### 方法 A：使用 systemd（推薦）

1. **創建 service 檔案：**

```bash
sudo nano /etc/systemd/system/time-station.service
```

2. **貼上以下內容：**

```ini
[Unit]
Description=Time Station Electron App
After=graphical.target

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
WorkingDirectory=/home/pi/time-station-electron/release
ExecStart=/home/pi/time-station-electron/release/TimeStation-1.0.0.AppImage
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
```

3. **啟用服務：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable time-station.service
sudo systemctl start time-station.service
```

4. **檢查狀態：**

```bash
sudo systemctl status time-station.service
```

### 方法 B：使用 Autostart（桌面環境）

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/time-station.desktop
```

貼上：

```ini
[Desktop Entry]
Type=Application
Name=Time Station
Exec=/home/pi/time-station-electron/release/TimeStation-1.0.0.AppImage
X-GNOME-Autostart-enabled=true
```

---

## 📖 專案結構

```
time-station-electron/
├── electron/
│   └── main.js                  # Electron 主進程
├── src/
│   ├── components/
│   │   └── TimeStation.vue      # ⭐ 主要 UI 組件
│   ├── App.vue                  # Vue 根組件
│   ├── main.js                  # Vue 入口
│   └── index.css                # Tailwind CSS
├── public/                      # 靜態資源
├── build/                       # 建置資源（圖示等）
├── index.html                   # HTML 入口
├── config.json                  # 應用設定檔
├── package.json                 # NPM 設定
├── vite.config.js               # Vite 設定
├── tailwind.config.js           # Tailwind 設定
└── README.md                    # 本文件
```

---

## 🎨 UI 佈局說明（方案二設計）

### Grid 佈局 (3 欄，2:1 比例)

```
┌───────────────────────┬──────────┐
│                       │  台北市   │
│                       │          │
│                       │  ☀️     │
│       14:35          │  28°    │ ← 右側 1/3
│                       │  晴天    │   天氣資訊
│                       │          │
│  2026年1月6日 星期二   │  今26°   │
│  乙巳年 臘月 初八     │  明24°   │
│                       │  💧40%   │
│  [AI 訊息區塊]        │          │
└───────────────────────┴──────────┘
       左側 2/3
    時間 + 日期 + AI
```

### 區域配置
- **左側 (2/3)**：超大時間 + 國曆 + 農曆 + AI 訊息
- **右側 (1/3)**：天氣圖示 + 溫度 + 預報 + 濕度

### 響應式支援
- ✅ 800x480 (標準 7 吋)
- ✅ 1024x600 (7 吋高解析度)

---

## 🔧 API 整合指南

### OpenWeatherMap API

#### 1. 註冊並取得 API Key
- 前往 [OpenWeatherMap](https://openweathermap.org/api)
- 選擇 Free Plan（免費方案）
- 註冊後在 Dashboard 取得 API Key

#### 2. 修改 `src/components/TimeStation.vue`

在 `updateWeather()` 函數中取消註解：

```javascript
const updateWeather = async () => {
  try {
    const apiKey = 'YOUR_API_KEY'; // 從 config.json 讀取
    const lat = 25.0330;
    const lon = 121.5654;
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // 解析天氣資料
    weather.value = {
      location: '台北市',
      current: Math.round(data.current.temp),
      icon: getWeatherIcon(data.current.weather[0].icon),
      condition: data.current.weather[0].description,
      humidity: data.current.humidity,
      todayRange: `${Math.round(data.daily[0].temp.min)}-${Math.round(data.daily[0].temp.max)}°C`,
      tomorrowRange: `${Math.round(data.daily[1].temp.min)}-${Math.round(data.daily[1].temp.max)}°C`,
      sunrise: data.current.sunrise,
      sunset: data.current.sunset
    };
  } catch (error) {
    console.error('Weather update failed:', error);
  }
};
```

#### 3. 天氣圖示對應

```javascript
const getWeatherIcon = (code) => {
  const iconMap = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return iconMap[code] || '🌤️';
};
```

---

## 🤖 AI 訊息整合（預留功能）

### 架構說明
在 `TimeStation.vue` 中已預留 `aiMessage` 區塊和 `updateAIMessage()` 函數。

### 串接範例

```javascript
const updateAIMessage = async () => {
  try {
    // 範例：串接 OpenAI API
    const response = await fetch('YOUR_AI_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        prompt: `根據今日天氣 ${weather.value.condition}，溫度 ${weather.value.current}°C，給我一句穿衣建議`,
        max_tokens: 50
      })
    });
    
    const data = await response.json();
    aiMessage.value = data.choices[0].text.trim();
  } catch (error) {
    console.error('AI message update failed:', error);
  }
};
```

### 功能建議
- 每日天氣建議
- 穿衣指南
- 運動建議
- 節氣提醒

---

## 🛠️ 開發筆記

### 常用指令

```bash
# 開發模式
npm run electron:dev

# 建置生產版本
npm run electron:build

# 僅建置 Web 部分
npm run build

# 預覽建置結果
npm run preview

# 安裝新套件
npm install <package-name>
```

### 除錯技巧

#### 1. 查看 Electron 主進程日誌

```bash
# 啟動時加上環境變數
ELECTRON_ENABLE_LOGGING=1 npm run electron:dev
```

#### 2. Vue DevTools

開發模式下自動啟用，可在 Chrome DevTools 中查看 Vue 組件。

#### 3. 查看 Console 輸出

```bash
# 執行 AppImage 時查看日誌
./TimeStation-1.0.0.AppImage > app.log 2>&1
```

### 效能優化

#### Raspberry Pi 專屬優化

1. **禁用硬體加速**（如果畫面閃爍）

在 `electron/main.js` 中取消註解：

```javascript
app.disableHardwareAcceleration();
```

2. **減少記憶體使用**

在 `electron/main.js` 的 `webPreferences` 中加入：

```javascript
webPreferences: {
  backgroundThrottling: false,
  offscreen: false
}
```

3. **調整更新頻率**

修改 `config.json` 的 `updateInterval`：

```json
{
  "weather": {
    "updateInterval": 1800  // 改為 3600 (1 小時) 節省資源
  }
}
```

---

## 🐛 疑難排解

### 問題 1：npm install 失敗

**原因：** Node.js 版本過舊或網路問題

**解決：**

```bash
# 確認 Node.js 版本
node -v  # 應該是 v18.x 以上

# 清除快取重試
npm cache clean --force
npm install
```

### 問題 2：Electron 無法啟動

**原因：** 缺少系統依賴

**解決：**

```bash
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libasound2
```

### 問題 3：農曆顯示錯誤

**原因：** solarlunar 套件問題

**解決：**

```bash
# 重新安裝
npm uninstall solarlunar
npm install solarlunar
```

### 問題 4：全螢幕無法退出

**原因：** Kiosk 模式鎖定

**解決：**

- 按 `Ctrl + Alt + F1` 切換到 TTY
- 執行 `pkill electron` 強制關閉
- 或在開發模式下按 ESC

### 問題 5：觸控不靈敏

**原因：** 螢幕驅動問題

**解決：**

```bash
# 安裝觸控驅動
sudo apt install -y xserver-xorg-input-evdev

# 重新啟動
sudo reboot
```

---

## 🔮 未來功能規劃

- [ ] 多城市天氣切換
- [ ] 整點報時功能
- [ ] 節氣動畫效果
- [ ] 觸控設定介面
- [ ] 支援中央氣象署 API
- [ ] 農民曆宜忌顯示
- [ ] 語音播報功能
- [ ] 多語系支援

---

## 📄 授權

MIT License

---

## 🙏 致謝

- [Electron](https://www.electronjs.org/)
- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenWeatherMap](https://openweathermap.org/)
- [solarlunar](https://github.com/yize/solarlunar)

---

**專案名稱：** Time Station - 時光台  
**設計方案：** 方案二 - 左時間 (2/3) + 右天氣 (1/3)  
**最佳顯示：** 7 吋 800x480 觸控螢幕  
**開發者：** wkchen

享受你的智能時鐘！⏰✨
