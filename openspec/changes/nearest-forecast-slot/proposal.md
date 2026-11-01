# Proposal

## Why

天氣畫面目前完全取不到資料，console 持續輸出 `Weather response had no usable data for the present moment`。根因不是 API 故障，也不是解析錯誤：**CWA 不回傳已經開始的預報時段**。

2026-11-01 17:15 直接對原始 API 查詢（繞過本專案全部程式碼），`F-D0047-061` 的 `天氣現象` 首格為 `StartTime 18:00 / EndTime 21:00`，涵蓋當下的 `15:00–18:00` 那格整格不存在；逐時的 `溫度` 首筆 `DataTime` 同樣是 18:00。此行為跨地區、跨資料集一致（內湖區、信義區、`F-D0047-089` 臺北市、`F-D0047-063` 一週），加 `timeFrom` 指向過去也拿不到。

`isSuccessfulUpdate()` 要求「至少一個元素涵蓋當下」才算成功更新，而該條件在此資料源上結構性地幾乎永遠不成立——只有回應剛好落在整點界線之後的瞬間才會通過。條件不成立即 `everSucceeded` 恆為 false，畫面所有天氣值因此是缺值。

改寫前的 `TimeStation.vue` 以「最後一個 `startTime <= now` 的時段」挑選當前值，找不到時 `currentIndex` 留在 0，等於默默把下一個未來時段當成「目前」顯示。畫面看起來正常，數字其實是未來的。`dataState.mjs` 正確地要消滅這種「HTTP 200 就算成功」的默默錯誤，但把判準訂成「涵蓋當下」，與資料源的實際供給對不起來。

## What Changes

- 「目前」的定義由「涵蓋當下的時段」改為「**最近的預報時段**」：當沒有任何時段涵蓋當下時，取第一個尚未開始且起點距現在不超過一個時段長度的時段。超過一個時段長度即視為沒有可用資料，不無限往後找。
- 成功更新的判準隨之改為「解析後存在最近的可用時段」。資料真的缺漏、回應無法解析或整份資料都已過期時，仍不算成功更新。
- `stale` 的三個成因與門檻維持不變，只是「涵蓋」的定義一併採用上述放寬；過期提示目前仍暫停顯示（`hide-stale-weather-notice`）。
- 短期預報四格的起點由「涵蓋當下的格」改為「最近的格」，與上述定義一致。
- 文件改正：`docs/theme/v2/README.md` 與 `docs/current-implementation.md` 現行敘述「目前數值取自涵蓋當下的預報時段」已不成立，改為「最近的預報時段」，並載明 CWA 不提供已開始的時段。

不在範圍：不改 CWA 請求參數、端點、刷新週期與 `staleThresholdMs`；不改提示區呈現；不恢復過期提示；不引入觀測站實測資料來源。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `time-station`：`Data Validity And Anomaly States` 的「回應不涵蓋當下」與「異常獨立解除」兩個 scenario 改用最近時段判定；`Short-term Forecast Slot Count` 的起始格定義隨之一致。

## Impact

- Renderer：`src/services/forecastSlots.mjs` 的 `entryCovering`／`hasUsableData`／`composeSlots` 起始格選擇，以及 `src/services/dataState.mjs` 的 `isSuccessfulUpdate` 語意。`src/composables/useWeatherStation.js` 的 `coverageActive` 與 `deriveCurrent` 沿用共用函式，預期不需各自改寫。
- 測試：`tests/forecastSlots.test.mjs`、`tests/dataState.test.mjs`、`tests/dataGuards.test.mjs`、`tests/stationIntegration.test.mjs` 皆以「涵蓋當下」為前提，需隨新定義調整；須保留「資料真的缺漏時不算成功」與零值為有效值的既有斷言。
- 文件：`docs/current-implementation.md`、`docs/theme/v2/README.md`。
- Electron main process、設定來源、API key、打包與部署腳本不在範圍。
- Raspberry Pi：修正後畫面才會有天氣值，對效能無影響；不新增請求。
- **相依既有 change**：`hide-stale-weather-notice` 已修改同一個 `Data Validity And Anomaly States` requirement，本變更的 delta 以其版本為基礎並包含其內容，archive 順序須排在它之後。與 `two-line-advisory` 無共用 requirement。
- 本變更只處理「取不到資料」的根因，**不宣稱**過期提示的恢復政策已決定。
