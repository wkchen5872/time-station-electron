# Gemini Context - Time Station Project

> 這是為 AI 助手（Gemini Code）準備的專案上下文文件
> 包含編碼風格、架構決策、重要檔案位置等資訊

---

## 專案概述

**名稱：** Time Station - 時光台
**類型：** Electron + Vue.js 智慧桌曆與氣象站
**目標平台：** Raspberry Pi 4 (4GB) + 7 吋觸控螢幕
**解析度：** 800x480 或 1024x600
**設計方案：** 左側時間/日期 (70%) + 右側天氣 (30%, iOS 風格)

---

## 技術堆疊

```
Electron 28.x       → 跨平台桌面應用框架
Vue.js 3.x          → 前端框架 (Composition API)
Tailwind CSS 3.x    → 樣式框架
Vite 5.x            → 建置工具
solarlunar 2.x      → 農曆計算庫
Node.js 18.x+       → 執行環境
```

---

## 核心檔案位置

### 主要程式碼檔案

| 檔案 | 路徑 | 用途 |
|------|------|------|
| Electron 主進程 | `electron/main.js` | 視窗管理、Kiosk 模式設定 |
| Vue 主元件 | `src/components/TimeStation.vue` | 所有 UI 邏輯和狀態管理 |
| Vue 根元件 | `src/App.vue` | 應用入口元件 |
| Vue 入口檔案 | `src/main.js` | Vue 應用初始化 |
| Tailwind 樣式 | `src/index.css` | 全域樣式和 Tailwind 匯入 |

### 設定檔

| 檔案 | 路徑 | 用途 |
|------|------|------|
| 應用設定 | `config.json` | 城市、API Key、顯示設定 |
| NPM 設定 | `package.json` | 依賴、腳本、建置設定 |
| Vite 設定 | `vite.config.js` | Vite 建置設定 |
| Tailwind 設定 | `tailwind.config.js` | Tailwind CSS 自訂 |

### 文件檔案

| 檔案 | 路徑 | 用途 |
|------|------|------|
| 完整說明 | `README.md` | 完整的使用和部署指南 |
| 快速開始 | `docs/QUICKSTART.md` | 5 分鐘快速上手 |
| 開發指南 | `docs/DEVELOPMENT.md` | 開發者指南和常見任務 |
| 技術規格 | `docs/SPECIFICATION.md` | 技術規格對照表 |
| **AI 上下文** | `docs/GEMINI.md` | **本檔案** |

---

## 編碼風格指南

### Vue.js 規範

**使用 Composition API（不使用 Options API）**

```vue
<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'ComponentName',
  setup() {
    const data = ref(initialValue);

    onMounted(() => {
      // 初始化邏輯
    });

    return { data };
  }
};
</script>
```

**命名規範：**
- 元件名：PascalCase (`TimeStation.vue`)
- ref 變數：camelCase (`currentTime`, `isDarkMode`)
- 函數：camelCase (`updateWeather`, `checkDarkMode`)

### Tailwind CSS 規範

**使用動態 class 綁定處理條件樣式：**

```vue
<div
  :class="[
    'base-classes',
    isDarkMode ? 'dark-classes' : 'light-classes'
  ]"
>
```

**字體大小規範：**
- 時間：`text-[140px]` （超大顯示）
- 日期：`text-3xl` (30px)
- 農曆：`text-2xl` (24px)
- 天氣溫度：`text-6xl` (60px)
- 小文字：`text-sm` 或 `text-base`

**顏色規範：**

| 元素 | Light Mode | Dark Mode |
|------|-----------|-----------|
| 背景 | `bg-gray-50` | `bg-gray-900` |
| 主文字 | `text-gray-900` | `text-white` |
| 次要文字 | `text-gray-600` | `text-gray-400` |
| 邊框 | `border-gray-200` | `border-gray-800` |

### JavaScript 規範

**使用 async/await（不使用 Promise.then）：**

```javascript
const updateWeather = async () => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    // 處理資料
  } catch (error) {
    console.error('Error:', error);
  }
};
```

**錯誤處理：**
- 所有 API 呼叫必須包含 try-catch
- 使用 console.error 記錄錯誤
- 失敗時保持現有資料不變

---

## 架構決策

### Grid 佈局（10 欄，7:3 比例）

```vue
<div class="h-full grid grid-cols-10 gap-0">
  <div class="col-span-7"><!-- 左側 70% --></div>
  <div class="col-span-3"><!-- 右側 30% --></div>
</div>
```

**為什麼選擇這個佈局？**
- 時間是主要資訊，佔據 70% 空間
- 天氣作為輔助資訊，佔據 30% 空間
- 天氣區域採用 iOS 風格三區塊設計（主區塊/小時預報/未來預報）
- 無輪播、無分頁，單一頁面設計

### 天氣區域設計（iOS 風格）

**三區塊佈局：**

1. **上方主區塊**（置中對齊）
   - 地區名稱
   - 當前溫度（超大字體 `text-7xl font-light`）
   - 天氣狀態描述
   - 今日高低溫
   - 體感溫度

2. **中間區塊**（小時預報）
   - 4 個時段橫向排列（`grid-cols-4`）
   - 每個時段：時間、圖示、溫度

3. **下方區塊**（未來預報）
   - 明天和後天的天氣
   - 格式：日期 + 圖示 + 溫度範圍

### 日夜模式切換

**方法：** 基於固定時間（18:00-6:00）

```javascript
const checkDarkMode = (now) => {
  const hour = now.getHours();
  isDarkMode.value = hour >= 18 || hour < 6;
};
```

**可選方案：** 基於日出日落（需要天氣 API）

### 更新頻率

| 資料類型 | 更新頻率 | 位置 |
|---------|---------|------|
| 時間 | 1 秒 | `setInterval(updateTime, 1000)` |
| 天氣 | 30 分鐘 | `setInterval(updateWeather, 30 * 60 * 1000)` |
| AI 訊息 | 手動/按需 | 預留功能 |

---

## API 整合指南

### OpenWeatherMap API

**設定位置：** `config.json`

```json
{
  "location": {
    "city": "台北市",
    "latitude": 25.0330,
    "longitude": 121.5654
  },
  "weather": {
    "apiKey": "YOUR_API_KEY_HERE",
    "updateInterval": 1800
  }
}
```

**實作位置：** `src/components/TimeStation.vue:228-249`

**API 端點：**
```
https://api.openweathermap.org/data/2.5/onecall
```

**參數：**
- `lat`: 緯度
- `lon`: 經度
- `units=metric`: 攝氏度
- `lang=zh_tw`: 繁體中文
- `appid`: API Key

**資料映射：**

```javascript
weather.value = {
  location: config.location.city,
  current: Math.round(data.current.temp),
  icon: getWeatherIcon(data.current.weather[0].icon),
  condition: data.current.weather[0].description,
  humidity: data.current.humidity,
  todayRange: `${data.daily[0].temp.min}-${data.daily[0].temp.max}°C`,
  tomorrowRange: `${data.daily[1].temp.min}-${data.daily[1].temp.max}°C`,
  sunrise: data.current.sunrise,
  sunset: data.current.sunset
};
```

### AI API 整合（預留）

**實作位置：** `src/components/TimeStation.vue:252-263`

**目前狀態：** Mock data，顯示固定文字

**整合步驟：**
1. 在 `config.json` 啟用 AI 功能
2. 設定 API endpoint
3. 實作 `updateAIMessage()` 函數
4. 根據天氣資料產生提示詞

---

## 常見開發任務

### 任務 1：修改佈局比例

**目標：** 將佈局從 7:3 改為 8:2（80% vs 20%）

**修改檔案：** `src/components/TimeStation.vue`

**步驟：**
1. 找到第 9 行：`<div class="h-full grid grid-cols-10 gap-0">`
2. 找到第 12 行：`<div class="col-span-7">`，改為：`<div class="col-span-8">`
3. 找到第 62 行：`<div class="col-span-3">`，改為：`<div class="col-span-2">`

**當前佈局：** 7:3 (70%:30%)
**其他常見比例：**
- 6:4 (60%:40%) - 更平衡的佈局
- 8:2 (80%:20%) - 更強調時間
- 3:1 (75%:25%) - 改用 `grid-cols-4`, `col-span-3`, `col-span-1`

### 任務 2：調整字體大小

**目標：** 讓時間顯示更大

**修改位置：** `src/components/TimeStation.vue:18`

**原始：** `'text-[140px]'`
**修改為：** `'text-[160px]'` 或 `'text-[180px]'`

### 任務 3：啟用天氣 API

**修改檔案：** `src/components/TimeStation.vue`

**步驟：**
1. 在 `config.json` 設定正確的 API Key
2. 在 `updateWeather()` 函數中取消註解 API 呼叫程式碼
3. 實作天氣圖示映射函數 `getWeatherIcon()`
4. 測試 API 呼叫是否成功

**參考程式碼：** `docs/DEVELOPMENT.md:99-125`

### 任務 4：隱藏 AI 訊息區塊

**修改位置：** `src/components/TimeStation.vue:46`

**方法 1：** 改為 `v-if="false"`
**方法 2：** 直接刪除 div (line 46-56)

### 任務 5：改變日夜模式切換時間

**修改位置：** `src/components/TimeStation.vue:217-218`

**原始：**
```javascript
const darkModeStart = 18;
const darkModeEnd = 6;
```

**修改範例：**
```javascript
const darkModeStart = 19;  // 晚上 7 點
const darkModeEnd = 7;     // 早上 7 點
```

**或讀取設定檔：**
```javascript
// 從 config.json 讀取
const darkModeStart = config.display.darkModeStart;
const darkModeEnd = config.display.darkModeEnd;
```

---

## 開發工作流程

### 1. 開發模式

```bash
npm run electron:dev
```

**特色：**
- 視窗化（非全螢幕）
- 熱重載
- DevTools 自動開啟
- 按 ESC 退出

### 2. 建置測試

```bash
# 僅建置 Web 部分
npm run build

# 預覽建置結果
npm run preview
```

### 3. 生產建置

```bash
# 建置 ARM64 AppImage
npm run electron:build:appimage

# 執行建置結果
./release/TimeStation-*.AppImage
```

---

## 除錯技巧

### Chrome DevTools

開發模式下自動開啟，可以：
- 查看 Console 輸出
- 檢查 Element 樣式
- 使用 Vue DevTools
- 監控網路請求

### Electron 主進程日誌

```bash
ELECTRON_ENABLE_LOGGING=1 npm run electron:dev
```

### Vue 元件狀態監控

在 `setup()` 中加入：

```javascript
import { watch } from 'vue';

watch(weather, (newVal) => {
  console.log('Weather updated:', newVal);
}, { deep: true });
```

---

## 效能最佳化建議

### Raspberry Pi 最佳化

1. **禁用硬體加速**（如果畫面閃爍）

`electron/main.js` 取消註解第 73 行：
```javascript
app.disableHardwareAcceleration();
```

2. **降低更新頻率**

```javascript
// 天氣更新改為 1 小時
weatherInterval = setInterval(updateWeather, 60 * 60 * 1000);
```

3. **減少動畫效果**

移除 `transition-` 相關的 Tailwind class

4. **最佳化字體渲染**

已在 `src/components/TimeStation.vue:300-303` 中設定

---

## 重要注意事項

### 不要修改的內容

1. **Grid 佈局結構** - 除非要改變整體設計
2. **時間更新頻率** - 固定每秒更新
3. **solarlunar 函式庫的使用** - 農曆計算依賴此函式庫
4. **Electron 安全設定** - `nodeIntegration` 等設定

### 修改前先測試

1. **API 整合** - 先在瀏覽器測試 API endpoint
2. **佈局調整** - 先在開發模式下測試
3. **顏色主題** - 確保 Dark/Light 模式都測試
4. **字體大小** - 確保在 800x480 解析度下可讀

### Git 工作流程

```bash
# 開發新功能
git checkout -b feature/功能名稱

# 提交更改
git add .
git commit -m "描述: 更改內容"

# 合併到 develop
git merge feature/功能名稱
```

---

## 快速參考

### 檔案快速定位

**要修改 UI？** → `src/components/TimeStation.vue`
**要修改視窗設定？** → `electron/main.js`
**要修改設定？** → `config.json`
**要查看文件？** → `docs/` 目錄

### 常用指令

```bash
# 開發
npm run electron:dev

# 建置
npm run build

# 打包
npm run electron:build:appimage

# 安裝依賴
npm install
```

### 關鍵行號參考

> **注意：** 行號會隨著代碼更新而改變，以下為參考值

| 功能 | 檔案 | 行號（參考） |
|------|------|------|
| Grid 佈局 (7:3) | TimeStation.vue | 8-12, 59-66 |
| 天氣區域三區塊 | TimeStation.vue | 68-206 |
| 上方主區塊（置中） | TimeStation.vue | 70-121 |
| 中間小時預報 | TimeStation.vue | 131-163 |
| 下方未來預報 | TimeStation.vue | 173-203 |
| 時間更新邏輯 | TimeStation.vue | 185-215 |
| 農曆與節氣 | TimeStation.vue | 201-211 |
| 天氣資料結構 | TimeStation.vue | 165-189 |
| 日夜模式切換 | TimeStation.vue | 213-225 |
| 時間字體大小 | TimeStation.vue | 18 |
| Kiosk 模式 | electron/main.js | 18 |
| 隱藏滑鼠 | electron/main.js | 42 |

---

## 常見問題速查

**Q: 如何讀取 config.json？**
```javascript
// 在 Electron 主進程中
const config = require('../config.json');

// 在 Vue 元件中（需要透過 IPC 或 HTTP）
const response = await fetch('/config.json');
const config = await response.json();
```

**Q: 如何新增天氣資料欄位？**
1. 在 `weather` ref 中新增欄位
2. 在 `updateWeather()` 中解析 API 資料
3. 在 template 中顯示

**Q: 如何改變 Grid 為垂直佈局？**
```vue
<!-- 從 -->
<div class="grid grid-cols-3">

<!-- 改為 -->
<div class="grid grid-rows-3">
```

**Q: 如何在生產模式下除錯？**
```bash
# 執行 AppImage 並記錄日誌
./TimeStation-*.AppImage > app.log 2>&1
cat app.log
```

---

## 總結

這個專案是一個**功能完整、文件齊全、易於客製化**的 Electron 應用。

**核心理念：**
- 單一職責：每個元件只做一件事
- 設定驅動：透過 config.json 控制行為
- 簡潔設計：無多餘功能，專注核心需求
- 易於擴充：預留 AI 介面，模組化設計

**開發建議：**
- 先閱讀 `SPECIFICATION.md` 了解規格
- 使用 `DEVELOPMENT.md` 作為開發參考
- 在修改前先在開發模式測試
- 保持程式碼風格一致性

**需要協助？**
- 查看 `README.md` 的完整說明
- 參考 `docs/` 目錄下的專門文件
- 使用 Gemini Code 進行互動式開發

---

**最後更新：** 2026-01-08
**專案版本：** 1.0.0
**適用於：** Gemini Code, AI 輔助開發工具
