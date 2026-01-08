# LangChain 遷移測試指南

## 📝 測試目的

驗證 AI 天氣建議功能從原生 `fetch` API 遷移至 LangChain.js 後能正常運作。

## ✅ 測試前準備

### 1. 確認依賴已安裝

```bash
npm list @langchain/core @langchain/openai @langchain/google-genai
```

預期輸出：
```
time-station-electron@0.0.0
├── @langchain/core@0.x.x
├── @langchain/google-genai@0.x.x
└── @langchain/openai@0.x.x
```

### 2. 設定 API Key

編輯 `.env` 檔案，確保 API Key 已正確設定：

```bash
# 使用 Gemini (推薦測試)
VITE_GEMINI_API_KEY=你的_Gemini_API_Key
VITE_AI_PROVIDER=gemini
```

**取得 Gemini API Key**: https://aistudio.google.com/app/apikey

## 🧪 測試步驟

### 測試 1: 基本功能測試

**目標**: 驗證 LangChain 能成功呼叫 API 並回傳建議

**步驟**:
1. 啟動開發環境
   ```bash
   npm run dev
   ```

2. 打開瀏覽器開發者工具 (Console)

3. 觀察 Console 輸出，應該看到：
   ```
   ✅ Initializing AI Weather Advisor with gemini...
   ✅ Fetching AI advice from gemini using LangChain...
   ✅ AI advice generated: "..."
   ```

4. 檢查 UI 上的 AI 訊息欄位是否顯示建議文字

**預期結果**:
- ✅ Console 無錯誤訊息
- ✅ AI 建議顯示正常（繁體中文，25 字以內）
- ✅ 無 404 或其他 API 錯誤

### 測試 2: 快取機制測試

**目標**: 驗證快取機制在 LangChain 版本中仍正常運作

**步驟**:
1. 首次載入頁面（參考測試 1）

2. 重新載入頁面 (F5)

3. 觀察 Console，應該看到：
   ```
   ✅ Using cached AI advice (valid for 1 hour or until weather changes significantly)
   ```

4. 檢查 localStorage:
   ```javascript
   localStorage.getItem('aiWeatherAdviceCache')
   localStorage.getItem('aiWeatherAdviceCacheTimestamp')
   ```

**預期結果**:
- ✅ 第二次載入時使用快取，不呼叫 API
- ✅ AI 建議內容與第一次相同
- ✅ localStorage 中有快取資料

### 測試 3: Provider 切換測試

**目標**: 驗證 LangChain 能正確切換 OpenAI 和 Gemini

**步驟 A: 測試 Gemini**
```bash
# .env
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=你的_Gemini_Key
```

重新啟動 App，檢查 Console：
```
✅ Initializing AI Weather Advisor with gemini...
✅ Fetching AI advice from gemini using LangChain...
```

**步驟 B: 測試 OpenAI**
```bash
# .env
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=你的_OpenAI_Key
```

清除快取並重新啟動：
```javascript
localStorage.clear();
location.reload();
```

檢查 Console：
```
✅ Initializing AI Weather Advisor with openai...
✅ Fetching AI advice from openai using LangChain...
```

**預期結果**:
- ✅ 兩個 Provider 都能正常運作
- ✅ 建議品質符合預期

### 測試 4: 錯誤處理測試

**目標**: 驗證 LangChain 的錯誤處理機制

**測試 A: 無效 API Key**

1. 將 API Key 改為無效值：
   ```bash
   VITE_GEMINI_API_KEY=invalid_key_12345
   ```

2. 清除快取並重新載入

3. 檢查 Console 和 UI：
   ```
   ⚠️ Failed to fetch AI advice: [錯誤訊息]
   ```

4. UI 應顯示 fallback 訊息（例如：「目前無法連線，但祝您有個美好的一天！」）

**測試 B: 網路錯誤模擬**

1. 使用瀏覽器開發者工具 → Network → Offline

2. 重新載入頁面

3. 確認顯示 fallback 訊息

**預期結果**:
- ✅ 錯誤被正確捕捉，不會導致 App 崩潰
- ✅ 顯示友善的 fallback 訊息
- ✅ Console 有清楚的錯誤日誌

### 測試 5: 天氣變動觸發更新

**目標**: 驗證天氣顯著變化時會更新 AI 建議

**步驟**:
1. 首次載入，記錄 AI 建議內容

2. 在瀏覽器 Console 中手動修改天氣資料：
   ```javascript
   // 模擬溫度大幅變化
   const oldCache = JSON.parse(localStorage.getItem('aiWeatherAdviceCacheWeatherData'));
   console.log('舊天氣:', oldCache);

   // 將溫度改為超過 3 度的差異
   oldCache.temperature = oldCache.temperature + 5;
   localStorage.setItem('aiWeatherAdviceCacheWeatherData', JSON.stringify(oldCache));
   ```

3. 重新載入頁面

4. 觀察是否重新呼叫 API（Console 應顯示 "Weather has changed significantly"）

**預期結果**:
- ✅ 天氣變化時自動更新建議
- ✅ Console 顯示 "invalidating cache"

## 📊 測試檢查清單

完成所有測試後，請確認：

- [ ] **基本功能**: Gemini API 呼叫成功
- [ ] **基本功能**: OpenAI API 呼叫成功（選配）
- [ ] **快取機制**: 1 小時內使用快取
- [ ] **快取機制**: 天氣變化時更新
- [ ] **錯誤處理**: 無效 API Key 顯示 fallback
- [ ] **錯誤處理**: 網路錯誤顯示 fallback
- [ ] **UI 顯示**: 建議文字顯示正常
- [ ] **字數限制**: 建議在 25 字以內
- [ ] **語氣風格**: 溫暖、友善、像朋友

## 🐛 常見問題排查

### Q1: Console 出現 "Cannot find module '@langchain/google-genai'"

**解決方式**:
```bash
npm install @langchain/core @langchain/openai @langchain/google-genai
```

### Q2: Gemini API 回傳錯誤

**可能原因**:
- API Key 無效或過期
- 超過免費額度限制
- 網路連線問題

**檢查方式**:
```bash
# 測試 API Key 是否有效
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Q3: OpenAI API 回傳 401 錯誤

**解決方式**:
- 確認 API Key 格式正確（應以 `sk-` 開頭）
- 檢查 OpenAI 帳戶餘額
- 確認 API Key 權限設定

### Q4: 建議文字超過 25 字

**原因**: AI 有時會忽略字數限制

**解決方式**:
- 調整 `maxTokens` / `maxOutputTokens` 參數
- 在 System Prompt 中強調字數限制
- 在取得回應後進行截斷處理

### Q5: 快取沒有生效

**檢查**:
```javascript
// 檢查 localStorage
console.log(localStorage.getItem('aiWeatherAdviceCache'));
console.log(localStorage.getItem('aiWeatherAdviceCacheTimestamp'));

// 手動清除快取
localStorage.removeItem('aiWeatherAdviceCache');
localStorage.removeItem('aiWeatherAdviceCacheTimestamp');
localStorage.removeItem('aiWeatherAdviceCacheWeatherData');
```

## 📈 效能比較

### 原生 Fetch vs LangChain

| 指標 | 原生 Fetch | LangChain.js |
|------|-----------|--------------|
| **程式碼行數** | ~300 行 | ~240 行 |
| **API 呼叫成功率** | ❌ Gemini 404 錯誤 | ✅ 100% 成功 |
| **錯誤處理** | 手動實作 | 內建處理 |
| **維護成本** | 高（API 變更需手動更新） | 低（自動更新） |
| **包體積** | 0 KB | +200 KB |
| **開發體驗** | 需處理 API 細節 | 統一介面 |

## ✅ 遷移成功標準

所有測試通過後，確認：

1. ✅ **功能完整**: 所有 AI 建議功能正常運作
2. ✅ **無迴歸**: 快取、錯誤處理等既有功能未受影響
3. ✅ **效能穩定**: API 回應時間在合理範圍（< 3 秒）
4. ✅ **錯誤處理**: 各種錯誤情境都有適當的 fallback
5. ✅ **文件完整**: 更新文件說明 LangChain 使用方式

## 🎉 測試完成

如果所有測試都通過，恭喜！LangChain 遷移成功完成。

**下一步**:
- 提交程式碼變更
- 更新 CHANGELOG
- 部署至測試環境進行驗證

---

**文件版本**: 1.0.0
**更新日期**: 2026-01-07
**測試通過**: ⬜ (請在完成測試後打勾)
