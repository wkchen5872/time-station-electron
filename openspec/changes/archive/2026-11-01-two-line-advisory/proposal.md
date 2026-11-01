# Proposal

## Why

提示區目前是單行：左欄 480px 扣掉兩側 16px 邊距後為 448px，以 19px 全形字計算約容納 23 字，超出即以 `truncate` 截斷。使用者檢視 800×480 實際版面後確認時鐘與日期下方仍有未使用的垂直空間，要求提示區改為最多兩行，並且文案在版位內上下左右置中。

單純放寬版面不會產生任何可見效果：AI 外出提示的提示詞把輸出限制在 22 字以內（`advisorPrompts.mjs`），正是以「單行約 23 字」為依據訂的。本變更同時把該上限放寬到 44 字，第二行才實際可用。

## What Changes

- 提示區由單行改為固定兩行高的版位：文案在版位內上下左右置中，一行時也維持置中，版位高度不因內容行數變動。
- 超過兩行的文案在第二行末尾以省略號截斷，沿用既有的 CSS 截斷方式，不加入捲動、跑馬燈或展開互動。
- **BREAKING**（對提示詞契約而言）：AI 外出提示（清醒模式）字數上限由 22 字放寬為 44 字。睡眠模式維持 20 字上限，其依據是「溫暖、簡短」的語氣要求而非版面寬度，不隨本次放寬。
- 修正規格與實作的既有落差：`ai-weather-advisor` 規格記載清醒模式上限為 25 字，實作與測試實際為 22 字。本變更以 44 字為唯一數值，消除該落差。
- Codex 與 Claude 兩個變體套用相同的提示區版位與截斷規則；兩者提示區的 CSS 目前逐字相同，不得只改其中一個。
- 開發用最長外出提示範例（`devFixtures.mjs` 的 `LONG_TEXT.advice`）改為 44 字，否則兩行與截斷無法被驗證。
- 新增一份納入版控的提示區設計依據，載明兩行版位的量測值與其相對於既有變體設計稿的覆蓋範圍。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `time-station`：`AI Message Area` 增加兩行容量與版位固定的行為；`Text Overflow Handling` 的截斷判準由「超過可用寬度」改為「超過可用區域」，提示區為兩行，其餘欄位仍為單行。
- `layout-variant`：`Shared Behaviour Across Variants` 加入兩行版位與截斷在兩個變體一致；`Variant Design Conformance` 補上提示區設計依據的來源與覆蓋說明。
- `ai-weather-advisor`：`Contextual Prompts` 的 General Mode Prompt 字數上限改為 44 字，並明確睡眠模式不變。

## Impact

- Renderer：`src/components/variants/ClaudeVariant.vue` 與 `src/components/variants/CodexVariant.vue` 的提示區區塊、`src/services/advisorPrompts.mjs` 的字數限制、`src/services/devFixtures.mjs` 的 `LONG_TEXT.advice`。不動 `useWeatherStation.js` 的提示選擇邏輯、不動右欄、不新增元件或設定開關。
- 測試：`tests/advisorPrompts.test.mjs` 的容量計算目前寫死單行（`floor((480-32)/19) = 23`），其 `limit <= capacity` 與睡眠模式 `<= 23` 兩項斷言會因 44 字而失敗，這是本變更 test-first 的 Red 來源之一；`tests/devFixtures.test.mjs`、`tests/stationIntegration.test.mjs` 的「最長外出提示 ≥ 22 字」須隨上限調整；`tests/variantRender.test.mjs` 需補兩個變體的版位與截斷回歸。
- 文件：`docs/theme/v2/README.md` 的共用提示說明，以及新增的提示區設計依據。
- Electron main process、CWA 請求、天氣資料判定、刷新排程、API key、打包與部署腳本均不在範圍。
- Raspberry Pi／kiosk：畫面仍為 800×480 全螢幕，版位往下擴張 28px 後底部留白由 48px 縮為 20px，不產生捲動或版面溢出；無新增網路請求、動畫或字體，對效能無影響。AI 回應字數加倍會略增 token 量，但請求次數與既有快取策略不變。
- **相依 `hide-stale-weather-notice`**：該變更已修改本變更同樣要改的 `AI Message Area` 與 `Shared Behaviour Across Variants` 兩個 requirement。本變更的 delta 以該變更的 delta 為基礎撰寫並包含其情境，因此兩者的 archive 順序必須是 `hide-stale-weather-notice` 先、本變更後；順序顛倒會使過期提示隱藏的規格內容在 archive 時被覆蓋。兩者亦同時改動 `devFixtures.mjs` 與 `tests/stationIntegration.test.mjs`，實作順序同此。
