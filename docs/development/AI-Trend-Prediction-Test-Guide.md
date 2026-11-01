---
type: Playbook
title: AI 天氣趨勢早期測試指南
description: 保留早期趨勢測試情境；現行資料結構與驗證方式請參閱目前實作說明。
tags: [ai, testing, legacy]
timestamp: 2026-11-01T01:30:00+08:00
---

# AI 天氣趨勢預測功能 - 測試指南

## 現行版本說明

本頁以下為 2026-01 的歷史測試範例，不可直接套用：目前預報格依來源區間組成，不保證四格等於四小時；AI 資料使用 `temperature` 與天氣描述，而非舊範例的 `temp` 與 emoji 圖示。舊有準確率、效能數字和測試報告屬示例，不能視為本版驗證結果。

現行資料與測試入口見 [目前實作與使用說明](/docs/current-implementation.md#ai-提示資料)；趨勢與 Prompt 的自動測試分別位於 `tests/forecastTrend.test.mjs`、`tests/advisorPrompts.test.mjs`。實際 LLM 回覆的品質仍需以真實服務與測試情境另行驗證。

## 📋 功能升級說明

### 升級前（v1.0）
❌ **問題**: 只分析「當前」天氣，容易產生誤導性建議
- 範例：現在晴天 → AI 說「天氣很好，適合出門」
- 實際：2 小時後會下大雨 → 使用者沒帶傘被淋濕

### 升級後（v2.0）
✅ **改進**: 綜合分析「當前 + 未來 4 小時」趨勢，提供前瞻性建議
- 範例：現在晴天，但 2 小時後下雨 → AI 說「現在雖晴，但下午會下雨，記得帶傘」

---

## 🔧 核心改動

### 1. 資料結構升級

**升級前 (v1.0)**:
```javascript
const weatherData = {
  temperature: 28,
  weather: '晴時多雲',
  feelsLike: 29,
  rainProbability: 20,
  humidity: 65,
  windSpeed: '2-3',
  comfort: '舒適'
};
```

**升級後 (v2.0)**:
```javascript
const weatherData = {
  // 當前狀態
  current: {
    temperature: 28,
    weather: '晴時多雲',
    feelsLike: 29,
    rainProbability: 20,
    humidity: 65,
    windSpeed: '2-3',
    comfort: '舒適'
  },
  // 未來 4 小時預報
  forecast: [
    { time: '14:00', temp: 28, weather: '☀️' },
    { time: '15:00', temp: 27, weather: '⛅' },
    { time: '16:00', temp: 25, weather: '🌧️' },  // 注意：會下雨！
    { time: '17:00', temp: 24, weather: '🌧️' }
  ]
};
```

### 2. Prompt 邏輯升級

**新增的趨勢分析規則**:

1. **變天預警（最高優先）**
   - 檢測：current 晴朗 + forecast 有雨
   - 建議：「稍後會下雨，記得帶傘」

2. **溫差預警**
   - 檢測：forecast 溫度下降 > 3-5°C
   - 建議：「晚點會變冷，記得帶外套」

3. **趨勢優先原則**
   - 預警未來變化 > 描述當前狀態

### 3. 快取邏輯升級

**新增檢測項目**:
- 溫度趨勢改變（從上升變下降）
- 兼容舊快取格式

---

## 🧪 測試場景

### 場景 1: 變天預警測試

**模擬情境**: 現在晴天，2 小時後下雨

**步驟**:
1. 確保當前天氣為晴天
2. 檢查 `weather.value.hourly` 中後面的時段有雨的圖示 (🌧️)
3. 清除快取並重新載入
4. 觀察 AI 建議

**預期結果**:
```
✅ 正確: "現在雖晴，但下午會下雨，記得帶傘"
❌ 錯誤: "天氣很好，適合出門散步"
```

**測試代碼**:
```javascript
// 在 Console 檢查傳入 AI 的數據
console.log('Current:', weather.value.current);
console.log('Forecast:', weather.value.hourly);

// 檢查是否有降雨趨勢
const hasRainLater = weather.value.hourly.some(h => h.icon.includes('🌧️'));
console.log('Will rain later:', hasRainLater);
```

---

### 場景 2: 溫差預警測試

**模擬情境**: 現在 28°C，4 小時後降到 22°C

**步驟**:
1. 確保當前溫度較高
2. 檢查 `forecast` 最後一個時段溫度明顯下降
3. 清除快取並重新載入

**預期結果**:
```
✅ 正確: "晚點會變冷，記得帶件外套"
❌ 錯誤: "溫度適中，很舒適"
```

**檢查溫差**:
```javascript
const firstTemp = weather.value.hourly[0].temp;
const lastTemp = weather.value.hourly[3].temp;
const tempDiff = lastTemp - firstTemp;
console.log('Temp trend:', tempDiff > 0 ? '上升' : '下降', Math.abs(tempDiff), '°C');
```

---

### 場景 3: 穩定天氣測試

**模擬情境**: 未來 4 小時天氣穩定

**步驟**:
1. 確保 current 和 forecast 狀態一致
2. 重新載入頁面

**預期結果**:
```
✅ 正確: 根據當前天氣給出適當建議（如「天氣舒適，適合出門」）
```

---

### 場景 4: 快取機制測試

**測試目標**: 驗證趨勢改變時會更新快取

**步驟**:
1. 首次載入，記錄建議內容
2. 等待 5 分鐘（天氣預報可能會更新）
3. 重新載入頁面
4. 檢查是否檢測到趨勢改變

**檢查代碼**:
```javascript
// 檢查快取
const cache = localStorage.getItem('aiWeatherAdviceCacheWeatherData');
const cachedData = JSON.parse(cache);

console.log('Cached current:', cachedData.current);
console.log('Cached forecast:', cachedData.forecast);

// 計算舊快取的溫度趨勢
const oldTrend = cachedData.forecast[3].temp - cachedData.forecast[0].temp;
console.log('Cached trend:', oldTrend);

// 計算新的溫度趨勢
const newTrend = weather.value.hourly[3].temp - weather.value.hourly[0].temp;
console.log('New trend:', newTrend);

// 如果符號改變且差異 > 2，應該更新快取
if (Math.sign(oldTrend) !== Math.sign(newTrend) && Math.abs(newTrend) > 2) {
  console.log('✅ Should invalidate cache');
} else {
  console.log('✅ Can use cache');
}
```

---

## 📊 測試檢查清單

完成所有測試後，請確認：

- [ ] **變天預警**: 晴轉雨時會提醒帶傘
- [ ] **溫差預警**: 溫度驟降時會提醒帶外套
- [ ] **溫差預警**: 溫度上升時會提醒防曬
- [ ] **穩定天氣**: 天氣穩定時給出合適建議
- [ ] **快取更新**: 趨勢改變時自動更新
- [ ] **快取保留**: 趨勢不變時使用快取
- [ ] **字數限制**: 建議仍在 25 字以內
- [ ] **語氣溫暖**: 保持友善、貼心的語氣

---

## 🐛 常見問題排查

### Q1: AI 沒有給出變天預警

**可能原因**:
1. hourly 數據沒有正確傳入
2. LLM 沒有理解 Prompt 中的趨勢分析邏輯

**檢查方式**:
```javascript
// 檢查傳入 AI 的數據
console.log('Weather data sent to AI:', weatherData);

// 確認 forecast 欄位存在且有資料
console.log('Forecast exists:', !!weatherData.forecast);
console.log('Forecast length:', weatherData.forecast?.length);
```

### Q2: 建議文字超過 25 字

**解決方式**:
- 在 `getAdvice()` 中加入截斷邏輯
- 或在 Prompt 中更強調字數限制

### Q3: 快取沒有在趨勢改變時更新

**檢查**:
```javascript
// 僅清除一般模式 AI 快取；不清除版面、睡眠與位置設定
localStorage.removeItem('aiWeatherAdviceCache');
localStorage.removeItem('aiWeatherAdviceCacheTimestamp');
localStorage.removeItem('aiWeatherAdviceCacheWeatherData');
location.reload();
```

---

## 📈 效能比較

| 指標 | v1.0 (當前天氣) | v2.0 (趨勢預測) |
|------|----------------|----------------|
| **資料大小** | ~150 bytes | ~400 bytes |
| **API Token** | ~200 tokens | ~350 tokens |
| **準確度** | 60% | 90%+ |
| **預警能力** | ❌ 無 | ✅ 有 |
| **使用者滿意度** | 中 | 高 |

---

## 🎯 測試成功標準

1. ✅ **功能完整**: 所有場景測試通過
2. ✅ **準確性高**: 變天預警準確率 > 90%
3. ✅ **性能穩定**: API 回應時間 < 3 秒
4. ✅ **用戶體驗**: 建議實用且友善

---

## 📝 測試報告範例

```
測試日期: 2026-01-08
測試環境: 本地開發環境
Provider: Gemini 2.5 Flash

場景 1: 變天預警 ✅
- 當前: 晴天 28°C
- 2小時後: 雨天 24°C
- AI 建議: "現在雖晴朗，但下午會下雨，記得帶傘"
- 評分: 5/5

場景 2: 溫差預警 ✅
- 當前: 28°C
- 4小時後: 22°C (降6°C)
- AI 建議: "晚點會變涼，記得帶件外套"
- 評分: 5/5

場景 3: 穩定天氣 ✅
- 全天穩定晴朗
- AI 建議: "天氣舒適，適合外出活動"
- 評分: 4/5

總評: 趨勢預測功能運作正常 ✅
```

---

**文件版本**: 2.0.0
**更新日期**: 2026-01-08
**維護者**: Claude AI Assistant
