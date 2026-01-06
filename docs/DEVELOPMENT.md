# 🚀 Time Station - 快速開發指南

## 開發環境設定

### 1. 前置需求
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git

### 2. 本地開發（非 Raspberry Pi）

```bash
# Clone 專案
git clone <repo-url> time-station-electron
cd time-station-electron

# 安裝依賴
npm install

# 啟動開發模式
npm run electron:dev
```

開發模式特色：
- ✅ 視窗化（非全螢幕）
- ✅ 熱重載 (Hot Reload)
- ✅ DevTools 自動開啟
- ✅ 按 ESC 退出

---

## 專案架構說明

### 核心檔案

```
electron/main.js           → Electron 主進程
src/components/TimeStation.vue  → 主要 UI 組件
src/App.vue               → Vue 根組件
src/main.js               → Vue 入口
config.json               → 應用設定
```

### 修改佈局

**檔案：** `src/components/TimeStation.vue`

**Grid 佈局設定：**

```vue
<div class="h-full grid grid-cols-3 gap-0">
  <div class="col-span-2">  <!-- 左側 2/3 -->
    <!-- 時間與日期 -->
  </div>
  <div class="col-span-1">  <!-- 右側 1/3 -->
    <!-- 天氣資訊 -->
  </div>
</div>
```

**調整比例：**
- 改為 4:1 → `grid-cols-5`, `col-span-4`, `col-span-1`
- 改為 3:2 → `grid-cols-5`, `col-span-3`, `col-span-2`

### 修改顏色

**日間模式：**
```javascript
isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
```

**夜間模式：**
```javascript
isDarkMode ? 'text-white' : 'text-gray-900'
```

### 修改字體大小

在 `TimeStation.vue` 中搜尋 `text-` 開頭的 Tailwind class：

```vue
<!-- 時間 -->
<div class="text-[140px]">  <!-- 改為 text-[160px] 變更大 -->

<!-- 日期 -->
<div class="text-3xl">      <!-- 改為 text-4xl 變更大 -->

<!-- 天氣溫度 -->
<div class="text-6xl">      <!-- 改為 text-7xl 變更大 -->
```

---

## API 整合

### OpenWeatherMap API

**位置：** `src/components/TimeStation.vue`

**函數：** `updateWeather()`

```javascript
const updateWeather = async () => {
  try {
    const apiKey = 'YOUR_API_KEY';
    const lat = 25.0330;  // 台北
    const lon = 121.5654;
    
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // 更新 weather.value
    weather.value = {
      current: Math.round(data.current.temp),
      icon: getWeatherIcon(data.current.weather[0].icon),
      condition: data.current.weather[0].description,
      // ... 其他資料
    };
  } catch (error) {
    console.error('Weather API failed:', error);
  }
};
```

### AI API 整合

**位置：** `src/components/TimeStation.vue`

**函數：** `updateAIMessage()`

```javascript
const updateAIMessage = async () => {
  try {
    const response = await fetch('YOUR_AI_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        weather: weather.value.condition,
        temperature: weather.value.current
      })
    });
    
    const data = await response.json();
    aiMessage.value = data.message;
  } catch (error) {
    console.error('AI API failed:', error);
  }
};
```

---

## 常見開發任務

### 任務 1：改變日夜模式切換邏輯

**檔案：** `src/components/TimeStation.vue`

**函數：** `checkDarkMode()`

```javascript
// 方法一：固定時間
const checkDarkMode = (now) => {
  const hour = now.getHours();
  isDarkMode.value = hour >= 18 || hour < 6;
};

// 方法二：根據日出日落（需要天氣 API）
const checkDarkMode = (now) => {
  const hour = now.getHours();
  const sunrise = 6;  // 從 API 取得
  const sunset = 18;  // 從 API 取得
  isDarkMode.value = hour >= sunset || hour < sunrise;
};
```

### 任務 2：隱藏 AI 訊息區塊

**檔案：** `src/components/TimeStation.vue`

找到：

```vue
<div v-if="aiMessage" ...>
```

改為：

```vue
<div v-if="false" ...>  <!-- 永遠隱藏 -->
```

或直接刪除該 div 區塊。

### 任務 3：改變農曆顯示格式

**檔案：** `src/components/TimeStation.vue`

**函數：** `updateTime()`

```javascript
// 原本
lunarDate.value = `${ganZhi}年 ${lunarMonth} ${lunarDay}`;

// 改為只顯示農曆日期
lunarDate.value = `${lunarMonth} ${lunarDay}`;

// 加入節氣
lunarDate.value = `${ganZhi}年 ${lunarMonth} ${lunarDay} - ${lunar.Term}`;
```

### 任務 4：調整更新頻率

**時間更新：** 固定每秒（不建議更改）

**天氣更新：** `onMounted()` 中

```javascript
// 原本 30 分鐘
weatherInterval = setInterval(updateWeather, 30 * 60 * 1000);

// 改為 1 小時
weatherInterval = setInterval(updateWeather, 60 * 60 * 1000);
```

---

## 建置與部署

### 本地建置測試

```bash
# 建置 Web 部分
npm run build

# 預覽建置結果
npm run preview
```

### Raspberry Pi 建置

```bash
# 建置 AppImage
npm run electron:build:appimage

# 建置完成後
./release/TimeStation-*.AppImage
```

---

## 除錯技巧

### 1. Chrome DevTools

開發模式下自動開啟，可以：
- 查看 Console 輸出
- 檢查 Element 樣式
- 使用 Vue DevTools

### 2. Electron 主進程日誌

```bash
# 啟動時顯示日誌
ELECTRON_ENABLE_LOGGING=1 npm run electron:dev
```

### 3. Vue 組件狀態

在 `TimeStation.vue` 的 `setup()` 中加入：

```javascript
watch(weather, (newVal) => {
  console.log('Weather updated:', newVal);
});
```

### 4. 網路請求監控

在 DevTools 的 Network 標籤中查看 API 請求。

---

## 效能優化建議

### Raspberry Pi 優化

1. **禁用硬體加速**

`electron/main.js`:

```javascript
app.disableHardwareAcceleration();
```

2. **減少動畫**

在 Tailwind class 中移除 `transition-` 相關的 class。

3. **降低更新頻率**

```javascript
// 天氣更新改為 1 小時
weatherInterval = setInterval(updateWeather, 60 * 60 * 1000);
```

4. **關閉 DevTools**

生產模式下自動關閉，但確保 `main.js` 中：

```javascript
if (isDev) {
  mainWindow.webContents.openDevTools();  // 只在開發模式開啟
}
```

---

## Git 工作流程

### 開發新功能

```bash
# 創建新分支
git checkout -b feature/new-feature

# 開發完成後提交
git add .
git commit -m "Add: 新功能描述"

# 合併回主分支
git checkout main
git merge feature/new-feature
```

### 版本發布

```bash
# 更新版本號
npm version patch  # 1.0.0 → 1.0.1

# 建置發布版本
npm run electron:build:appimage

# 推送到 Git
git push origin main --tags
```

---

## 常見問題

**Q: 如何在 Windows/macOS 上開發？**

A: 開發模式可以跨平台執行，但建置 ARM64 版本需要在 Raspberry Pi 上進行。

**Q: 可以改成垂直佈局嗎？**

A: 可以，修改 Grid 為 `grid-rows-3` 並調整 `row-span-*`。

**Q: 如何加入新的天氣資訊？**

A: 在 `weather` ref 中加入新欄位，然後在 template 中顯示。

**Q: 可以用其他 CSS 框架嗎？**

A: 可以，但需要移除 Tailwind 並重新設計樣式。

---

**開發愉快！** 🚀

如有問題，請參考完整 README.md 或提交 Issue。
