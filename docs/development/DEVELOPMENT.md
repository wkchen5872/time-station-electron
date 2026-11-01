---
type: Playbook
title: Time Station 早期開發指南
description: 保留早期開發說明，現行架構與操作請參閱目前實作說明。
tags: [development, legacy]
timestamp: 2026-10-31T00:00:00+08:00
---

# 🚀 Time Station - 快速開發指南

## 現行版本說明

本頁以下保留早期範例；Node.js 版本、Grid、主題函式及天氣與 AI 串接程式碼不代表目前實作。請先閱讀 [目前實作與使用說明](/docs/current-implementation.md)，再以原始碼為準；不要直接套用下方舊程式碼。

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
config.json               → 應用設定（使用者可修改）
src/defaultConfig.js      → 預設設定
src/services/ConfigManager.js → 設定管理服務
```

### 設定系統架構 (v1.2.1+)

本專案採用分層設定系統，確保靈活性與可維護性：

```
┌─────────────────────────────────────────┐
│         defaultConfig.js                │
│      (程式碼中的預設值)                   │
└──────────────┬──────────────────────────┘
               │
               ├──── merge ────┐
               │               │
┌──────────────▼──────────┐    │
│      config.json         │    │
│    (使用者可修改)         │────┤
└──────────────────────────┘    │
                                │
                    ┌───────────▼──────────┐
                    │   ConfigManager.js   │
                    │  (設定管理服務)       │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   應用程式使用        │
                    │  (TimeStation.vue)   │
                    └──────────────────────┘
```

**運作原理：**
1. **ConfigManager** 首先載入 `defaultConfig.js` 包含所有預設值。
2. 接著嘗試讀取 `config.json`。
3. 如果 `config.json` 存在，將使用者設定深度合併 (Deep Merge) 到預設值中。
4. 應用程式透過 `ConfigManager.get('path.to.config')` 取得設定。


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

**Light Mode（淺色模式）：**
```javascript
// 背景
isDarkMode ? 'bg-gray-900' : 'bg-gray-50'

// 主文字（務必使用深色以增強對比）
isDarkMode ? 'text-white' : 'text-gray-900'

// 次要文字（避免使用 gray-400/500/600，太淺）
isDarkMode ? 'text-gray-200' : 'text-gray-700'  // ✅ 推薦
isDarkMode ? 'text-gray-300' : 'text-gray-800'  // ✅ 更深
```

**Dark Mode（深色模式）：**
```javascript
// 次要文字（避免使用 gray-400/500，太暗）
isDarkMode ? 'text-gray-200' : 'text-gray-700'  // ✅ 推薦
isDarkMode ? 'text-gray-300' : 'text-gray-800'  // ✅ 也可以
```

**⚠️ 樹莓派注意事項：**
- 16-bit 色深螢幕無法呈現細微灰階
- Light Mode 避免使用 `text-gray-400` 以下（太淺）
- Dark Mode 避免使用 `text-gray-400` 以下（太暗）

### 修改字體大小

**✨ 樹莓派優化後的字體大小：**

在 `TimeStation.vue` 中搜尋 `text-` 開頭的 Tailwind class：

```vue
<!-- 時間（超大顯示） -->
<div class="text-[140px]">  <!-- 改為 text-[160px] 變更大 -->

<!-- 日期 -->
<div class="text-3xl">      <!-- 改為 text-4xl 變更大 -->

<!-- 天氣溫度 -->
<div class="text-7xl">      <!-- 已經是最大，不建議再調整 -->

<!-- 小文字（務必 >= text-sm） -->
<div class="text-sm">       <!-- ✅ 最小推薦 (14px) -->
<div class="text-xs">       <!-- ❌ 禁止使用 (12px 太小) -->
```

**字體大小升級對照表：**

| 原始 | 優化後 | 說明 |
|------|--------|------|
| `text-xs` (12px) | `text-sm` (14px) | ✨ 升級 |
| `text-sm` (14px) | `text-base` (16px) | ✨ 升級 |
| `text-base` (16px) | `text-lg` (18px) | 🔧 選用 |
| `text-lg` (18px) | `text-xl` (20px) | 🔧 選用 |

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

### 任務 1：使用主題切換按鈕

**位置：** 左上角浮動按鈕

**功能：** 點擊循環切換 Auto → Light → Dark → Auto

**使用方式：**
- 🌗 **Auto**：根據日出日落時間自動切換（預設）
- ☀️ **Light**：強制淺色模式（開發時測試用）
- 🌙 **Dark**：強制深色模式（開發時測試用）

**持久化：** 設定會自動儲存，重新啟動後保持

**開發建議：**
- 在 MacBook 開發時，可以強制切換到 Dark 模式測試對比度
- 部署到樹莓派後，仍可手動調整而不受日落時間限制

### 任務 2：改變日夜模式切換邏輯（程式碼層級）

**檔案：** `src/components/TimeStation.vue`

**函數：** `checkDarkMode()`

**當前實作：** 根據日出日落時間（從 CWA API 取得）

```javascript
const checkDarkMode = (now) => {
  // 手動模式優先
  if (themeMode.value === 'light') {
    isDarkMode.value = false;
    return;
  }
  if (themeMode.value === 'dark') {
    isDarkMode.value = true;
    return;
  }

  // Auto 模式：使用日出日落
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sunrise = parseSunTime(weather.value.sunrise);
  const sunset = parseSunTime(weather.value.sunset);

  if (sunrise && sunset) {
    isDarkMode.value = currentMinutes < sunrise || currentMinutes >= sunset;
  } else {
    // Fallback: 固定時間 18:00-6:00
    const darkModeStart = 18 * 60;
    const darkModeEnd = 6 * 60;
    isDarkMode.value = currentMinutes >= darkModeStart || currentMinutes < darkModeEnd;
  }
};
```

### 任務 3：隱藏 AI 訊息區塊

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

### 任務 4：改變農曆顯示格式

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

### 任務 5：調整更新頻率

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
