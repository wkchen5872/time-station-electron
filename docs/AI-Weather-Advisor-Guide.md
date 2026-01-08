# AI 天氣建議功能 - 實作指南 (LangChain.js 版本)

## 📋 功能概述

本專案已整合 AI 天氣建議功能，透過 **LangChain.js** 框架串接 LLM API (OpenAI GPT-4o-mini 或 Google Gemini Flash)，根據當前天氣資料動態生成一段貼心、像真人管家的生活建議。

## 🔧 技術架構

### 為什麼使用 LangChain.js？

原先使用原生 `fetch` 呼叫 Gemini API 遇到 404 錯誤，改用 LangChain.js 後獲得以下優勢：

1. **統一的 API 介面**: 無需針對不同 Provider 寫不同的呼叫邏輯
2. **自動錯誤處理**: LangChain 內建完善的錯誤處理機制
3. **類型安全**: 提供 TypeScript 支援，減少運行時錯誤
4. **維護性佳**: 由社群維護，API 變更時會自動更新
5. **簡潔的程式碼**: 從 ~300 行減少至 ~240 行

### 依賴套件

```json
{
  "@langchain/core": "^0.x.x",
  "@langchain/openai": "^0.x.x",
  "@langchain/google-genai": "^0.x.x"
}
```

安裝指令：
```bash
npm install @langchain/core @langchain/openai @langchain/google-genai
```

## 🏗️ 架構設計

### 1. 核心檔案

```
src/
├── services/
│   ├── AIWeatherAdvisor.js          # AI 建議服務類別
│   └── AIWeatherAdvisor.example.js  # 使用範例
├── components/
│   └── TimeStation.vue              # 主元件（已整合）
└── data/
    └── taiwan-regions.json          # 台灣地區中英文對照
```

### 2. 環境變數設定

在 `.env` 檔案中加入以下設定：

```bash
# AI 建議服務 API Keys
# 選擇使用其中一個即可 (OpenAI 或 Google Gemini)

# OpenAI API Key
# 從 https://platform.openai.com/api-keys 註冊取得
# 推薦模型：gpt-4o-mini (便宜且快速)
VITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Google Gemini API Key
# 從 https://aistudio.google.com/app/apikey 註冊取得
# 推薦模型：gemini-1.5-flash (免費額度高)
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# AI 服務選擇 (openai 或 gemini)
VITE_AI_PROVIDER=gemini
```

**注意：** `.env` 檔案已加入 `.gitignore`，不會被提交到版本控制。

## 🎯 功能特點

### 1. 智慧快取機制

為節省 API 呼叫次數與費用，實作了以下快取策略：

- **時間快取**: 1 小時內不重複呼叫 API
- **天氣變動檢測**: 當天氣有顯著變化時，自動更新建議
  - 溫度變化 > 3°C
  - 降雨機率變化 > 30%
  - 天氣現象改變（晴天 → 雨天等）
  - 體感溫度變化 > 4°C

### 2. AI Prompt 設計

System Prompt 包含以下指令：

```
角色設定：
你是一個貼心的家庭智慧管家。

回應限制：
1. 繁體中文 (台灣用語)
2. 字數限制：25 字以內
3. 語氣：溫暖、像朋友一樣

判斷準則 (優先級由高至低)：
1. 危險/極端天氣 → 優先警告安全
2. 降雨 (>60%) → 提醒帶傘或行車安全
3. 極端溫度 (體感 <12°C 或 >32°C) → 提醒保暖或防曬/補水
4. 溫差大 → 提醒洋蔥式穿法
5. 舒適/一般 → 給予祝賀或心情小語
```

### 3. 錯誤處理與 Fallback

當 API 呼叫失敗時，會隨機回傳以下其中一句：

- 「目前無法連線，但祝您有個美好的一天！」
- 「網路似乎不穩定，不過別忘了保持好心情！」
- 「暫時無法取得建議，但記得照顧好自己喔！」
- 「連線中斷了，但祝您今天一切順利！」

### 4. 支援雙 Provider

可在 `.env` 中切換 AI 服務提供者：

| Provider | 模型 | 優點 | 適合情境 |
|----------|------|------|----------|
| **Gemini** | gemini-1.5-flash | 免費額度高、速度快 | 個人專案、測試開發 |
| **OpenAI** | gpt-4o-mini | 品質穩定、回應精準 | 正式環境、商業應用 |

## 🔧 使用方式

### LangChain 實作細節

#### 1. 初始化 LLM 模型

AIWeatherAdvisor 在建構時會自動初始化對應的 LangChain 模型：

```javascript
// OpenAI 模型
new ChatOpenAI({
  openAIApiKey: this.apiKey,
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 100
});

// Gemini 模型
new ChatGoogleGenerativeAI({
  apiKey: this.apiKey,
  modelName: 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 100
});
```

#### 2. 統一的訊息格式

使用 LangChain 的標準訊息格式：

```javascript
const messages = [
  ['system', systemPrompt],
  ['user', userPrompt]
];

const response = await this.llm.invoke(messages);
const advice = response.content.trim();
```

### 在 TimeStation.vue 中的整合

```javascript
import AIWeatherAdvisor from '../services/AIWeatherAdvisor.js';

// AI Advisor 實例（延遲初始化）
let aiAdvisor = null;

const updateAIMessage = async () => {
  // 初始化 AI Advisor (LangChain 會自動處理 API 格式)
  if (!aiAdvisor) {
    const provider = import.meta.env.VITE_AI_PROVIDER || 'gemini';
    const apiKey = provider === 'openai'
      ? import.meta.env.VITE_OPENAI_API_KEY
      : import.meta.env.VITE_GEMINI_API_KEY;

    aiAdvisor = new AIWeatherAdvisor(provider, apiKey);
  }

  // 準備天氣資料
  const weatherData = {
    temperature: weather.value.current,
    weather: weather.value.condition,
    feelsLike: weather.value.feelsLike,
    rainProbability: weather.value.rainProbability,
    humidity: weather.value.humidity,
    windSpeed: weather.value.windSpeed,
    comfort: weather.value.comfort
  };

  // 取得 AI 建議 (LangChain 統一介面)
  const advice = await aiAdvisor.getAdvice(weatherData);
  aiMessage.value = advice;
};
```

### 呼叫時機

AI 建議會在以下時機自動更新：

1. **App 啟動時**: `onMounted()` → `getLocationByIP()` → `updateWeather()` → `updateAIMessage()`
2. **定期更新**: 每 30 分鐘自動執行 `updateWeather()` → `updateAIMessage()`

## 📊 資料流程

```
┌─────────────────┐
│  使用者啟動 App  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 取得 IP 位置資訊 │ (24h 快取)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 查詢天氣資料 (CWA)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  準備天氣資料    │
│  - 溫度          │
│  - 體感溫度      │
│  - 降雨機率      │
│  - 濕度          │
│  - 風速          │
│  - 舒適度        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  檢查 AI 快取    │
├─────────────────┤
│ 1小時內？        │
│ 天氣變動？       │
└────┬───────┬────┘
     │       │
   有效     過期/變動
     │       │
     │       ▼
     │  ┌─────────────┐
     │  │ 呼叫 LLM API │
     │  │ (Gemini/GPT) │
     │  └──────┬──────┘
     │         │
     │         ▼
     │  ┌─────────────┐
     │  │  快取結果    │
     │  └──────┬──────┘
     │         │
     └────┬────┘
          │
          ▼
   ┌─────────────┐
   │ 顯示 AI 建議 │
   └─────────────┘
```

## 🧪 測試方式

### 1. 基本功能測試

```bash
# 啟動開發環境
npm run dev
```

檢查 Console 輸出：
- ✅ 「Initializing AI Weather Advisor with gemini...」
- ✅ 「Fetching AI weather advice...」
- ✅ 「AI advice updated: "..."」

### 2. 快取機制測試

**測試快取是否生效：**

```javascript
// 在瀏覽器 Console 中執行
localStorage.getItem('aiWeatherAdviceCache')
localStorage.getItem('aiWeatherAdviceCacheTimestamp')
```

**手動清除快取：**

```javascript
// 清除所有快取
localStorage.removeItem('aiWeatherAdviceCache');
localStorage.removeItem('aiWeatherAdviceCacheTimestamp');
localStorage.removeItem('aiWeatherAdviceCacheWeatherData');

// 重新載入頁面以觸發新的 API 呼叫
location.reload();
```

### 3. 錯誤處理測試

**測試 API Key 未設定：**

將 `.env` 中的 API Key 改為 `YOUR_GEMINI_API_KEY_HERE`，重新啟動 App。

預期結果：
- Console 顯示警告訊息
- AI 訊息欄位不顯示內容

**測試網路錯誤：**

暫時中斷網路連線，重新載入 App。

預期結果：
- Console 顯示錯誤訊息
- 顯示 Fallback 訊息

### 4. Provider 切換測試

在 `.env` 中切換 `VITE_AI_PROVIDER`：

```bash
# 測試 Gemini
VITE_AI_PROVIDER=gemini

# 測試 OpenAI
VITE_AI_PROVIDER=openai
```

重新啟動 App 並檢查 Console 輸出。

## 💰 成本估算

### Gemini Flash (免費額度)

- **免費額度**: 每分鐘 15 次請求
- **成本**: 完全免費（在免費額度內）

每次呼叫約消耗：
- Input: ~200 tokens
- Output: ~50 tokens

### OpenAI GPT-4o-mini

- **價格**:
  - Input: $0.150 / 1M tokens
  - Output: $0.600 / 1M tokens

每次呼叫約消耗：
- Input: ~200 tokens = $0.00003
- Output: ~50 tokens = $0.00003
- **總計**: ~$0.00006 / 次

每月成本估算（假設每 30 分鐘更新一次）：
- 每日: 48 次
- 每月: 1,440 次
- **月費**: ~$0.086 (約 NT$2.6)

**結論**: 使用快取機制後，實際呼叫次數會更少，成本幾乎可忽略。

## 🔐 安全性考量

1. **API Key 保護**
   - ✅ `.env` 已加入 `.gitignore`
   - ✅ 使用 `import.meta.env` 確保 Key 不會暴露在前端程式碼中
   - ⚠️ Electron App 打包時需注意環境變數處理

2. **建議檢查**
   - AI 生成的文字已限制字數（25 字以內）
   - 降低產生不當內容的風險

3. **Fallback 機制**
   - 確保 API 失敗時仍有良好的使用者體驗

## 📝 常見問題

### Q1: 如何更換 AI 服務提供者？

修改 `.env` 中的 `VITE_AI_PROVIDER`：

```bash
# 使用 Gemini (推薦)
VITE_AI_PROVIDER=gemini

# 使用 OpenAI
VITE_AI_PROVIDER=openai
```

### Q2: AI 建議為什麼沒有更新？

可能原因：
1. 快取仍在有效期（1 小時內）
2. 天氣資料未有顯著變化
3. API Key 未設定或無效

解決方式：
- 檢查 Console 是否有錯誤訊息
- 手動清除快取測試
- 確認 API Key 是否正確

### Q3: 如何調整 AI 建議的字數限制？

編輯 `src/services/AIWeatherAdvisor.js` 中的 `getSystemPrompt()` 方法，修改以下行：

```javascript
2. 字數限制：25 字以內 (因為螢幕空間有限)。
```

同時調整 API 呼叫的 `max_tokens` 參數：

```javascript
// OpenAI
max_tokens: 100  // 調整此數值

// Gemini
maxOutputTokens: 100  // 調整此數值
```

### Q4: 如何新增更多天氣判斷邏輯？

編輯 `getSystemPrompt()` 中的「判斷準則」部分，加入新的優先級規則。

### Q5: 能否完全關閉 AI 建議功能？

可以，有兩種方式：

**方式一**: 不設定 API Key（推薦）
```bash
# 在 .env 中保持預設值
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

**方式二**: 隱藏 UI 元件
在 `TimeStation.vue` 中移除或註解掉 AI 訊息區塊。

## 🚀 未來改進方向

1. **多語言支援**: 根據系統語言自動切換建議語言
2. **個人化設定**: 允許使用者自訂建議風格（專業/輕鬆/幽默）
3. **歷史記錄**: 儲存過去的 AI 建議，提供回顧功能
4. **語音播報**: 整合 TTS 功能，語音播報建議
5. **主題整合**: 根據天氣自動切換 App 主題配色

## 📚 相關文件

- [CWA 天氣 API 文件](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)
- [OpenAI API 文件](https://platform.openai.com/docs/api-reference)
- [Google Gemini API 文件](https://ai.google.dev/gemini-api/docs)
- [專案 README](../README.md)

---

**版本**: 1.0.0
**更新日期**: 2026-01-07
**維護者**: Claude AI Assistant
