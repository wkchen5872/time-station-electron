# Proposal

## Why

使用者回報臺北市內湖區的時鐘在更新後持續顯示「天氣資料已超過更新時間」，至 2026-11-01 12:02 仍未解除，並要求先移除這則畫面提示，保留時間釐清真正的資料有效性邏輯。本變更是暫時的呈現調整，不宣稱已修復氣象署資料時段或更新判定的根因。

## What Changes

- 在 Codex 與 Claude 兩個版面暫時隱藏天氣資料過期提示，單獨的 `stale` 狀態不再佔用提示區或使用異常樣式；提示區顯示原有外出提示，沒有建議時顯示既有預設訊息。
- 保留「目前無法取得天氣資料」與「目前無法確認所在地區」提示；`stale` 與定位異常同時存在時，仍呈現定位異常，不能因隱藏過期訊息而一起隱藏。
- 保留內部 `stale` 判定、成功更新時間、最後已知資料、刷新排程及恢復條件；隱藏訊息不得把舊資料標成新資料，也不得清除診斷狀態。
- 同步開發用異常長文字範例與相關文件，避免測試開關繼續呈現已暫停的過期文案。
- 將恢復或重新設計過期提示列為後續獨立決策，不設自動恢復日期、不新增設定開關。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `time-station`：調整 `AI Message Area` 與 `Data Validity And Anomaly States`，將內部過期狀態與畫面可見警告分開；保留其他異常、資料與時鐘行為。
- `layout-variant`：調整 `Shared Behaviour Across Variants`，兩個變體一致套用暫時的過期訊息隱藏政策。

## Impact

- Renderer：主要影響 `src/composables/useWeatherStation.js` 的共用提示選擇，以及 `src/services/devFixtures.mjs` 的異常長文字；兩個變體沿用共用輸出，不重排版面。
- 測試：以 station 整合測試驗證三種過期成因、異常同時發生、兩個版面及睡眠模式；保留既有資料有效性測試。
- 文件：更新 `docs/current-implementation.md` 與 `docs/theme/v2/README.md` 中的提示行為說明，標明為暫時措施及未完成的根因釐清。
- Electron main process、設定來源、API key、打包與部署腳本均不在本次變更範圍；不調整氣象署請求、30 分鐘刷新排程或過期門檻。
- Raspberry Pi：提示區減少干擾，沒有新增網路請求、動畫、元件或硬體需求。
- 與 `centralize-builtin-config` 分別追蹤；該變更可能同樣修改 `useWeatherStation.js`。實作整合時須保留其設定集中化結果，不把本次暫時政策混入設定預設值或改回舊常數。
