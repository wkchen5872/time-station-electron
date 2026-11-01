# Design

## Context

動機與實測證據見 [proposal.md](proposal.md)。本變更以 `e8f4cca` 加上 `hide-stale-weather-notice` / `two-line-advisory` 的未提交修正為基準。

現況三處共用同一個嚴格判定：

- `forecastSlots.mjs:41` `entryCovering()`：`atMs >= e.start && atMs < e.end`，半開區間嚴格包含。
- `forecastSlots.mjs:218` `hasUsableData()`：任一元素有涵蓋當下且值可用即為 true。
- `dataState.mjs` `isSuccessfulUpdate()` 直接委派 `hasUsableData()`。

`useWeatherStation.js` 的 `deriveCurrent()`、`coverageActive` 與 `composeSlots()` 的起始格都走這條路，所以改共用函式即可，不需在各取用處各改一次。

一個時段的長度依元素而異：逐時元素為 1 小時，三小時元素為 3 小時。「一個時段長度」因此必須取該元素自己的區間長度，不是固定常數。

## Goals / Non-Goals

**Goals:**

- 讓「目前」在 CWA 實際供給下可解析，且不偽造區間、不把更遠的未來當成現在。
- 保留 `dataState.mjs` 原本的價值：資料真的缺漏、無法解析或整份過期時仍然判定失敗。
- 判定集中在共用層，兩個變體與各取用處不各自放寬。

**Non-Goals:**

- 不改 CWA 端點、請求參數、刷新週期與 `staleThresholdMs`。
- 不引入觀測站實測資料補足「現在」。
- 不改提示區呈現，也不恢復過期提示。
- 不處理 CWA 為何不供給已開始時段；那是資料源的產品設計，不是本專案可修的缺陷。

## Decisions

### D1：放寬「涵蓋」而非改各取用處

在 `forecastSlots.mjs` 新增「最近時段」的解析，讓 `entryCovering()` 的呼叫端得到一致結果。`deriveCurrent()`、`coverageActive`、`composeSlots()` 起始格與 `hasUsableData()` 全部沿用，避免出現「某處放寬、某處沒放寬」的不一致。

不採用在 `useWeatherStation.js` 各處各加 fallback：那會讓「目前」的定義散落多份，正是 `defaultConfig` 註解所警告的幽靈預設同型問題。

### D2：上限取該元素自己的時段長度，不是固定常數

可接受的前瞻距離為「一個時段長度」，且取該筆資料自己的 `end - start`：逐時元素容忍 1 小時，三小時元素容忍 3 小時。

不採用固定 3 小時：那會讓逐時元素在資料斷掉 2 小時時仍被當成「現在」。也不採用無上限取第一筆：資料涵蓋範圍真的耗盡時（例如失聯數日後只剩遠期資料），那會把幾天後的預報標成現在，正是本次要避免的默默錯誤。

### D3：成功更新的判準跟著同一個定義

`isSuccessfulUpdate()` 繼續委派 `hasUsableData()`，不另立第二套規則。這讓「畫面取得到值」與「算成功更新」永遠一致——兩者若各有判準，會出現畫面有值卻持續 stale，或反之。

`stale` 的三個成因維持不變：`no-cover`（最新回應連最近時段都不符）、`coverage-exhausted`（既有資料連最近時段都沒有）、`threshold`（超過門檻未成功）。它們的語意在新定義下自動成立，不需個別改寫。

### D4：不改 `start`/`end`，只改挑選規則

不把首格的區間向前延伸成 `[start - duration, end)`。那會讓 `slots` 的起訖值與資料源不符，進而污染 `composeSlots()` 的標籤與每日代表值計算；畫面上顯示的時段文字也會變成不存在的區間。挑選規則與區間值分開，資料仍然誠實。

### D5：文件必須一併改正

`docs/theme/v2/README.md` 現行寫「畫面上的『目前』數值取自涵蓋當下的**預報時段**」，`docs/current-implementation.md` 有相同敘述。該敘述在此資料源下本來就不成立。改為「最近的預報時段」，並載明 CWA 不供給已開始的時段，否則下一個人會再次把「涵蓋當下」當成可達成的條件。

### D6：排在 `hide-stale-weather-notice` 之後

兩者都修改 `Data Validity And Anomaly States`。本變更的 delta 已包含 `hide-stale-weather-notice` 對該 requirement 的改動（內部保留 stale 的那句）。archive 順序須為 `hide-stale-weather-notice` → 本變更；順序顛倒會覆蓋前者的內容。與 `two-line-advisory` 無共用 requirement，順序不受限。

## Risks / Trade-offs

- 放寬後，「目前溫度」實際上是最多一個時段之後的預報值 → 規格既有的 `Current Temperature Is Not Claimed As Measured` 已禁止標示為實測；文件同步改為「最近的預報時段」，不宣稱是當下實況。
- 放寬可能遮蔽真正的資料中斷 → 上限為一個時段長度，超過即仍判失敗；`coverage-exhausted` 與 `threshold` 兩個 stale 成因保留。
- 既有測試大量以「涵蓋當下」為前提，調整時可能順手弱化斷言 → 每一處調整都必須保留「資料真的缺漏時不算成功」與零值有效的斷言，不得以刪除換取通過。
- 無法在單元測試中驗證 CWA 的真實供給行為 → 以 2026-11-01 的實測結果作為 fixture 依據並於測試註明來源；實際供給若日後改變，本放寬仍然安全（有涵蓋當下時優先採用）。

## Migration Plan

不涉及資料或設定遷移。通過測試與 Electron 檢視後，依既有 AppImage 流程部署。回退範圍為 `forecastSlots.mjs` 的挑選規則與對應測試、文件。

## Open Questions

- CWA 是否在某些時段確實供給已開始的時段（例如整點剛發布時），尚未長時間觀測。這不影響本設計：有涵蓋當下的時段時一律優先採用。
