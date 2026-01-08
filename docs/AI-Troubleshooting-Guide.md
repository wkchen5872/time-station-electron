# AI 天氣建議功能 - 疑難排解指南

## 🐛 常見錯誤與解決方案

### ❌ 錯誤 1: "Cannot read properties of undefined (reading 'replace')"

**完整錯誤訊息**:
```
TypeError: Cannot read properties of undefined (reading 'replace')
    at new ChatGoogleGenerativeAI
    at AIWeatherAdvisor._initializeLLM
    at new AIWeatherAdvisor
```

#### 原因分析

這個錯誤表示傳入 LangChain 的 API Key 是 `undefined`，導致 LangChain 在初始化時嘗試呼叫 `apiKey.replace()` 時失敗。

可能的原因：
1. **未設定 API Key**: `.env` 檔案中沒有設定正確的 API Key
2. **Vite 沒有重新載入**: 修改 `.env` 後沒有重新啟動開發伺服器
3. **環境變數名稱錯誤**: 使用了錯誤的環境變數名稱
4. **API Key 格式錯誤**: API Key 包含空格或特殊字元

#### 解決步驟

**步驟 1: 檢查 .env 檔案**

確認 `.env` 檔案中有正確設定 API Key：

```bash
# .env

# Google Gemini API Key
VITE_GEMINI_API_KEY=AIzaSy...你的完整_API_Key

# AI 服務選擇
VITE_AI_PROVIDER=gemini
```

**注意事項**:
- ✅ 變數名稱必須是 `VITE_GEMINI_API_KEY`（不是 `GEMINI_API_KEY`）
- ✅ 不要加引號（不是 `VITE_GEMINI_API_KEY="..."`）
- ✅ API Key 不要有空格或換行
- ✅ 檔案名稱是 `.env`（不是 `.env.local` 或其他）

**步驟 2: 重新啟動開發伺服器**

**⚠️ 重要**: Vite 只會在啟動時讀取 `.env` 檔案。如果您修改了 `.env`，必須重新啟動：

```bash
# 停止目前的開發伺服器 (Ctrl + C)

# 重新啟動
npm run dev
```

**步驟 3: 驗證環境變數**

在瀏覽器 Console 中檢查環境變數是否正確載入：

```javascript
// 檢查 API Key 是否存在
console.log('Provider:', import.meta.env.VITE_AI_PROVIDER);
console.log('Gemini Key exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
console.log('OpenAI Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);

// 檢查 Key 的前幾個字元（不要印出完整 Key）
if (import.meta.env.VITE_GEMINI_API_KEY) {
  console.log('Gemini Key starts with:', import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10) + '...');
}
```

**預期輸出**:
```
Provider: gemini
Gemini Key exists: true
OpenAI Key exists: false
Gemini Key starts with: AIzaSy...
```

**步驟 4: 測試 API Key 是否有效**

如果環境變數正確載入，但仍有錯誤，請測試 API Key 是否有效：

```bash
# 測試 Gemini API Key
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=你的_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

如果回傳錯誤，請重新產生 API Key：
https://aistudio.google.com/app/apikey

---

### ❌ 錯誤 2: Console 顯示 "API Key not configured"

**Console 訊息**:
```
⚠️ GEMINI API Key not configured, skipping AI advice
⚠️ Please set VITE_GEMINI_API_KEY in your .env file
```

#### 原因

程式碼檢測到 API Key 未設定或為預設值。

#### 解決方案

1. 確認 `.env` 檔案中的 API Key 不是預設值：
   ```bash
   # ❌ 錯誤
   VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

   # ✅ 正確
   VITE_GEMINI_API_KEY=AIzaSy...真實的_Key
   ```

2. 重新啟動開發伺服器

---

### ❌ 錯誤 3: "Failed to fetch AI advice" + 網路錯誤

**Console 訊息**:
```
❌ Failed to fetch AI advice: TypeError: Failed to fetch
```

#### 可能原因

1. **網路連線問題**: 無法連線到 Gemini/OpenAI API
2. **防火牆阻擋**: 公司或學校網路可能封鎖 AI API
3. **API 配額用盡**: 超過免費額度限制
4. **API Key 權限問題**: API Key 沒有正確權限

#### 解決方案

**檢查網路連線**:
```bash
# 測試能否連線到 Gemini
ping generativelanguage.googleapis.com

# 測試能否連線到 OpenAI
ping api.openai.com
```

**檢查 API 配額**:
- Gemini: https://aistudio.google.com/
- OpenAI: https://platform.openai.com/usage

**嘗試切換 Provider**:

如果 Gemini 無法使用，嘗試切換到 OpenAI：

```bash
# .env
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...你的_OpenAI_Key
```

---

### ❌ 錯誤 4: AI 建議顯示空白

**現象**: UI 上的 AI 訊息欄沒有顯示任何內容

#### 可能原因

1. API Key 未設定（程式故意清空訊息）
2. 快取問題
3. 元件渲染問題

#### 解決方案

**檢查 Console**:

查看是否有警告或錯誤訊息：
```
⚠️ GEMINI API Key not configured, skipping AI advice
```

**清除快取**:

```javascript
// 在瀏覽器 Console 執行
localStorage.clear();
location.reload();
```

**檢查元件**:

在 Console 檢查 aiMessage 的值：
```javascript
// 檢查 Vue 元件的狀態（需要 Vue DevTools）
// 或手動檢查 localStorage
console.log('Cache:', localStorage.getItem('aiWeatherAdviceCache'));
```

---

### ❌ 錯誤 5: 建議文字超過 25 字

**現象**: AI 建議的字數超出預期

#### 解決方案

這是正常現象，AI 有時會忽略字數限制。可以考慮：

1. **調整 System Prompt**:

   編輯 `src/services/AIWeatherAdvisor.js` 的 `getSystemPrompt()` 方法，強調字數限制：

   ```javascript
   2. 字數限制：最多 25 字，嚴格遵守，不可超過。
   ```

2. **程式碼層級截斷**:

   在取得建議後自動截斷：

   ```javascript
   let advice = response.content.trim();
   if (advice.length > 25) {
     advice = advice.substring(0, 25) + '...';
   }
   ```

3. **調整 Token 限制**:

   減少 `maxOutputTokens` 參數（目前是 100）

---

## 🔧 快速診斷工具

### 診斷腳本

在瀏覽器 Console 執行以下腳本，快速診斷問題：

```javascript
// === AI 天氣建議診斷工具 ===
console.log('=== 環境變數檢查 ===');
console.log('Provider:', import.meta.env.VITE_AI_PROVIDER || '未設定');
console.log('Gemini Key:', import.meta.env.VITE_GEMINI_API_KEY ? '✅ 已設定' : '❌ 未設定');
console.log('OpenAI Key:', import.meta.env.VITE_OPENAI_API_KEY ? '✅ 已設定' : '❌ 未設定');

console.log('\n=== 快取狀態 ===');
const cache = localStorage.getItem('aiWeatherAdviceCache');
const timestamp = localStorage.getItem('aiWeatherAdviceCacheTimestamp');
if (cache) {
  const age = Date.now() - parseInt(timestamp);
  const minutes = Math.floor(age / 60000);
  console.log('快取內容:', cache);
  console.log('快取時間:', minutes, '分鐘前');
  console.log('快取狀態:', age < 3600000 ? '✅ 有效' : '⚠️ 已過期');
} else {
  console.log('快取狀態: 無快取');
}

console.log('\n=== 建議操作 ===');
if (!import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_OPENAI_API_KEY) {
  console.log('⚠️ 請設定 API Key 後重新啟動開發伺服器');
  console.log('1. 編輯 .env 檔案');
  console.log('2. 設定 VITE_GEMINI_API_KEY=你的_Key');
  console.log('3. 執行 npm run dev');
} else {
  console.log('✅ API Key 已設定');
  console.log('如果仍有問題，請重新啟動開發伺服器');
}
```

---

## 📚 相關資源

### API Key 取得

- **Gemini API**: https://aistudio.google.com/app/apikey
- **OpenAI API**: https://platform.openai.com/api-keys

### 文件

- [AI 天氣建議功能指南](./AI-Weather-Advisor-Guide.md)
- [LangChain 遷移測試指南](./LangChain-Migration-Test-Guide.md)
- [主要 README](../README.md)

### 支援

如果上述方法都無法解決問題：

1. 檢查 GitHub Issues: [專案 Issues 頁面]
2. 提交新的 Issue（包含 Console 錯誤訊息和環境資訊）
3. 查閱 LangChain 官方文件: https://js.langchain.com/

---

**文件版本**: 1.0.0
**更新日期**: 2026-01-07
**維護者**: Claude AI Assistant
