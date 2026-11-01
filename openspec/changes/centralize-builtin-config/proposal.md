# Proposal

## Why

`config.json` 在正式建置下從未生效：`ConfigManager.js:54` 的 `fetch('/config.json')` 在
`loadFile` 的 `file://` origin 下解析為檔案系統根目錄的 `file:///config.json`，而該檔也不在
`package.json` 的 `build.files` 或 `public/` 內，`dist/` 中並不存在。開發模式下 Vite dev server
會以 HTTP 200 送出該檔，正式模式不會——這個落差使問題長期未被發現。失敗是靜默的：
`console.warn` 在 kiosk 模式看不見，而 HTTP 非成功狀態連 warning 都沒有。

使用這套機制將近一年，使用者未曾修改過該設定檔。檢查後發現它從未完整接線：
`defaultConfig.js` 的 20 個葉欄位中 11 個沒有任何功能讀取點，其中 `ai.enabled` 外觀像開關
但完全不生效（AI 啟用只看環境變數與憑證）。另有五組值重複定義於 2–3 處，且
`sleepState.mjs` 的 `DEFAULT_SLEEP_CONFIG.enabled` 因 fallback 寫成 `config.enabled !== false`
而永遠不會被讀取。

因此問題不是「功能壞了」，而是「這個機制從未成立，且有一半欄位會主動誤導維護者」。
使用者決定移除執行期設定能力，改為把內建預設集中為單一來源。

## What Changes

- **BREAKING（對設定行為）** 移除 `config.json` 與 `ConfigManager` 的外部載入路徑
  （`fetch('/config.json')` 及合併邏輯）。正式版與開發模式都不再支援外部 JSON 覆寫；
  開發模式的行為一併改變，屬有意調整。日後修改內建值需重新建置與部署。
- 內建預設收斂為單一來源。驗收標準是「各缺值 fallback 路徑實際取自集中來源」，
  而非「各模組恰好寫著相同數字」——`DEFAULT_SLEEP_CONFIG.enabled` 是永不被讀取的幽靈預設，
  僅搬移常數宣告不足以達成單一來源。
- 移除 10 個無功能讀取點的設定欄位（原始盤點的 11 個中，`cache.aiAdvice.duration`
  改為實際生效而保留，見下一項）：`display.timeFormat`、`display.hideCursor`、
  `weather.provider`、`location.latitude`、`location.longitude`、`ai.enabled`、
  `ai.apiEndpoint`、`ai.updateInterval`、`updateInterval.time`、`updateInterval.weather`。
  移除這些欄位**不改變任何執行行為**。
- `cache.aiAdvice.duration` 反向處理：它目前無消費者，但 `AIWeatherAdvisor.js:32` 另有一份
  生效中的 `60 * 60 * 1000` 裸字面值。改為讓服務讀取集中來源的具名預設，
  **維持 1 小時行為不變**，使該值成為單一來源。
- 盤點現有 fallback 的 `||` 與 `??` 語意：`startHour: 0`（午夜）是合法值，而 `||` 會誤判為缺值。
  此盤點須在集中化時一併處理，不得順手改變既有語意。
- 同步更新仍描述外部 JSON 合併機制的文件，含 `openspec/specs/time-station/design.md`
  的「Configuration Management」三層架構敘述與 `openspec/config.yaml` 的 context。

## Capabilities

### New Capabilities

- `builtin-defaults`: 內建預設值的來源、解析順序與載入契約。涵蓋「不提供執行期設定檔」
  這項產品決策、預設值的單一來源要求（含缺值 fallback 必須取自該來源）、以及設定載入
  相對於時鐘與天氣排程的時序契約。此契約目前只有測試保護、沒有規格依據。

### Modified Capabilities

- `time-station`: 「Smart Mode Switching」requirement 的末句
  「these values MUST remain configuration rather than hard-coded constants」
  明文要求 `sleepMode` 的 `enabled`/`startHour`/`endHour` 必須保持為 configuration。
  移除外部設定後已無 configuration 層，需改寫為「必須取自單一的集中內建來源，
  不得散落為各模組的字面值」——保留原意（禁止把 23/6 寫死在判斷邏輯裡），
  移除對外部設定檔的綁定。

## Impact

**Renderer（`src/`）**

- `src/services/ConfigManager.js`：移除 `fetch`、`deepMerge` 與合併路徑。`deepMerge` 目前**有**
  呼叫點（`:60` 由 `loadConfig`、`:32` 遞迴），僅在移除外部合併後才成為可刪邏輯；
  `get`/`set`/`saveConfig`/`reset` 無消費者。須保留可注入的載入介面。
- `src/defaultConfig.js`：移除 10 個死欄位（20 → 10 葉欄位）；成為集中來源。
- `src/services/sleepState.mjs`、`dataState.mjs`、`locationSource.mjs`、
  `AIWeatherAdvisor.js`、`src/composables/useWeatherStation.js`：各自的 `DEFAULT_*` 常數與
  inline fallback 改為取自集中來源。
- `config.json`（專案根目錄）：刪除。

**Main process（`electron/`）** 不變。設定從未經由主進程載入。

**測試** `tests/stationIntegration.test.mjs` 以 `config: { weather: {} }` 與
`config: pending.promise` 斷言 fallback 與非同步載入契約；`tests/helpers/mountStation.mjs`
的 `config` 參數為全部 station 測試的掛載方式。這些能力必須保留——契約是實際的
Promise／等待行為，而非 `async` 關鍵字本身。

**不在範圍內**

- `.env` 的 build-time `VITE_*` 憑證機制（獨立議題）。移除 `ai.enabled` 等欄位不得被實作或
  文件寫成新啟用或新停用 AI；AI 判斷維持現行的環境變數與天氣可用性。
- CSP。`index.html:7` 的 `connect-src` 未含 `file:` 是事實，但它是否構成載入失敗的獨立成因
  未經實測。移除 fetch 後無需為此改動 CSP，亦不擴大為 protocol 改造。
- 版面選擇、睡眠按鈕及其 `localStorage` 值；定位來源條件次序與快取；天氣刷新週期與
  異常門檻。全部維持原行為。
- `AIWeatherAdvisor` 的「溫度差 3 度／降雨機率差 30%／體感差 4 度」門檻屬 AI 建議調校參數，
  不隨 `cache.aiAdvice.duration` 一併搬移。
- `design.md` 中與設定無關的歷史敘述（例如仍寫 7:3 的版面比例）不順帶重寫。

**Raspberry Pi / kiosk** 無效能或顯示影響。移除一次啟動期的 `fetch` 嘗試，
不改變畫面、觸控或刷新行為。

## 決策來源

本提案的方向由使用者於 2026-11-01 確認，相關調查、review 與決策紀錄見
`work-items/WI-20261101-config-json-prod-ineffective/`（`decisions.md` D-001、D-002）。
該紀錄為忽略版控的臨時協作紀錄，本提案不依賴其存續。
