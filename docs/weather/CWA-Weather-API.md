---
type: API
title: CWA 預報資料挑選與排查
description: 本專案的 CWA 回應解析、最近預報時段選擇、成功更新判定與排查入口。
tags: [weather, cwa, forecast, troubleshooting]
timestamp: 2026-11-01T17:34:14+08:00
---

# CWA 預報資料挑選與排查

本頁描述 `e9b46d9` 的本機實作，不是 CWA 官方供給契約，也不代表 Pi 或外部服務已驗收。畫面上的溫度、天氣與降雨資訊來自預報，不能稱為觀測站實測值。

## 資料流程

| 階段 | 程式 | 行為 |
| --- | --- | --- |
| 請求與解析 | `src/services/CWAWeatherAPI.js` | 解析各元素為 `{ value, start, end }`；各元素保留自己的區間 |
| 時段挑選與組格 | `src/services/forecastSlots.mjs` | `entryFor()` 選適用條目，`composeSlots()` 組成最多四格；顯示層補足缺值位置 |
| 成功與異常判定 | `src/services/dataState.mjs` | `isSuccessfulUpdate()` 委派 `hasUsableData()`，不是只檢查 HTTP 成功 |
| 呈現與更新時間 | `src/composables/useWeatherStation.js` | 成功才更新 `series`、`lastSuccessAt`；沒有可見異常時使用一般提示 |

`StartTime`／`EndTime` 直接解析為區間；只有 `DataTime` 時，以該筆為起點、下一筆 `DataTime` 為終點，最後一筆由解析器補為三小時。無效時間或終點不大於起點的條目不納入序列。因此「自身區間長度」以解析後的 `end - start` 計算，不保證所有溫度條目都是一小時。

## 最近時段的選擇

`entryCovering()` 仍只接受嚴格包含當下的半開區間 `[start, end)`。`entryFor()` 在其上增加有界的後備選擇：

1. 有條目滿足 `start <= now < end` 時，優先使用它。
2. 沒有時，找出所有未開始條目中起點最早的一筆。
3. 只有 `start - now <= end - start` 才接受該筆；等於上限時仍接受。
4. 沒有符合條目時回傳缺值，不回頭使用已結束時段，也不無限向後找遠期資料。

這個選擇逐元素進行。溫度與天氣現象可以選到不同區間；成功更新只要求至少一個共用資料元素選到可用值，並不保證所有欄位都有值。數值欄位的 `0` 有效，空值或非數值內容不能被轉成假的 `0°`／`0%`。

以下以台灣本地時間示範本機挑選規則，不是新的 API 查詢結果：

| 現在 | 解析後條目 | 結果 |
| --- | --- | --- |
| 17:15 | 17:00–18:00 與 18:00–19:00 | 採用涵蓋當下的 17:00–18:00 |
| 17:15 | 僅 18:00–19:00 | 接受；前瞻 45 分鐘不超過一小時 |
| 17:00 | 僅 18:00–19:00 | 接受；前瞻正好等於一小時 |
| 16:59:59 | 僅 18:00–19:00 | 拒絕；前瞻超過該筆一小時長度 |
| 17:15 | 僅 18:00–21:00 | 接受；前瞻 45 分鐘不超過三小時 |
| 17:15 | 僅數日後的條目 | 拒絕；超過該筆長度 |

挑選不改寫原始 `start`／`end`。四格預報的首格可從未來開始，標籤仍依來源區間顯示，不能為了填滿「現在」而把 18:00 的起點改成 17:15。格內取值仍使用嚴格包含，不把三小時機率複製成假逐時資訊。

### 修復的觀察來源與限制

`nearest-forecast-slot` 的 [封存 proposal](/openspec/changes/archive/2026-11-01-nearest-forecast-slot/proposal.md) 記錄，Claude 在 2026-11-01 17:15 查詢內湖區 `F-D0047-061` 時，天氣現象首格為 18:00–21:00，溫度首筆也從 18:00 開始，沒有涵蓋當時的條目。對應的模擬資料已加入 [forecastSlots 測試](/tests/forecastSlots.test.mjs) 與 [station 整合測試](/tests/stationIntegration.test.mjs)。

本次文件更新未重新呼叫 CWA，也未獨立核對該次完整原始回應。這份紀錄支持處理「缺少涵蓋當下時段」的案例，不足以保證所有地區、發布批次或時間都只回傳未開始時段。程式因此保留「有涵蓋當下條目就優先使用」的規則。

## `no usable data for the present moment` 排查

`useWeatherStation.js` 在解析後序列未通過 `isSuccessfulUpdate()` 時印出：

```text
Weather response had no usable data for the present moment
```

這行表示沒有選到可用值，不能單憑文字判定 API 斷線或 JSON 解析失敗。依序記錄：

1. 確認執行中的來源 commit 與產物；舊 AppImage 不會因來源碼更新而自動改變。開發模式也先確認 Vite 使用的目錄。
2. 記下裝置的時間、時區、查詢地名與解析出的端點。不要貼出帶 `Authorization` 的完整請求網址或 API Key。
3. 在 Network 回應比對 `success`、`LocationName`、元素名稱、首筆 `DataTime` 或 `StartTime`／`EndTime`，再比對解析後的 `value`、`start`、`end`。
4. 依上述規則檢查涵蓋條目或最近未開始條目，以及其可用值。只剩過去或過遠未來資料時，拒絕更新是預期行為。

資料曾成功後，失敗回應不改寫最後成功時間。內部 stale 的原因依序為 `no-cover`（最新回應不符）、`coverage-exhausted`（保留資料已無適用值）、`threshold`（超過成功更新時間門檻）。預設刷新為 30 分鐘，過期門檻為 90 分鐘，實際值取自 `src/defaultConfig.js`。stale 畫面提示暫停顯示，所以畫面沒有過期警告不能證明剛剛更新成功。

可在專案根目錄執行離線回歸：

```bash
node --test tests/forecastSlots.test.mjs tests/dataState.test.mjs tests/dataGuards.test.mjs tests/stationIntegration.test.mjs
```

這些測試使用模擬資料，不驗證真實 CWA 服務。Pi 畫面與後續刷新另依 [本輪功能驗收](/docs/deployment/install-update.md#本輪功能驗收) 記錄。

## 帳戶註冊

請先至 [中央氣象署-開放資料平臺](https://opendata.cwa.gov.tw/userLogin) 註冊帳號，取得 API Key。

## 資料與 API 文件

- [氣象開放平台 - 資料主題](https://opendata.cwa.gov.tw/dataset/forecast?page=1)
- [Opendata API 線上說明文件](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)


其他氣象署的文件資料，請參考本 `weather` 目錄：

- [中央氣象署開放資料平臺資料標準說明文件.pdf](./中央氣象署開放資料平臺資料標準說明文件.pdf)
- [Weather_Icon.pdf](./Weather_Icon.pdf)
- [天氣圖示對照表 _ 交通部中央氣象署.pdf](<./天氣圖示對照表 _ 交通部中央氣象署.pdf>)
