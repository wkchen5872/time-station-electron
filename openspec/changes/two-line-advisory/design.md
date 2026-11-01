# Design

## Context

動機見 [proposal.md](proposal.md)。本變更以 `1d84461`（`hide-stale-weather-notice` 併入 `centralize-builtin-config` 後的 `main`）為基準，工作區 clean，`npm test` 153 pass / 0 fail。

兩個變體的提示區目前逐字相同，只差 Codex 多一個 `font-semibold`：

```
<div class="absolute bottom-[48px] left-4 right-4">
  <div class="mb-6 h-[1.5px]" :style="{ backgroundColor: p.divider }"></div>
  <p class="truncate text-center text-[19px]" :style="{ color: advisoryColor }">
```

由此推算現況幾何（左欄 480×480，`left-4 right-4` 不受欄位 padding 影響，提示區寬 448px）：時鐘與日期為 flex 置中的流排版，佔 132–348；提示區絕對定位，下緣 432；單行高 28.5px（19px × 預設 line-height 1.5），佔 403.5–432；分隔線在 378.0；日期行下緣到分隔線之間有 30px 空隙，畫面底部有 48px 未使用。

使用者已檢視 `work-items/WI-20261031-ui-hardware-review/advisory-two-line-proposal.svg`（800×480 1:1，七個狀態）並選定方案 A。

## Goals / Non-Goals

**Goals:**

- 提示區成為高度固定的兩行版位，行數變動不影響版位本身或其上方任何元素的位置。
- 兩個變體共用同一組版位與截斷規則，不各自實作。
- 字數上限成為單一事實來源，規格、提示詞與測試三者一致。

**Non-Goals:**

- 不改提示選擇邏輯（`useWeatherStation.js` 的 `advisory`），本變更只改呈現與字數上限。
- 不改右欄、不改時鐘與日期的流排版、不改控制項。
- 不把提示區做成可捲動、可展開或自動縮放字級。
- 不調整睡眠模式提示詞的字數與語氣。

## Decisions

### D1：往下擴張版位，錨定分隔線（方案 A）

提示區絕對定位點由 `bottom-[48px]` 改為 `bottom-5`（20px），內部文字版位固定 56px。結果：分隔線由 378.0 移到 378.5，與日期行的空隙由 30px 變 30.5px，等於維持原位；新增的第二行佔用的是畫面底部原本閒置的 432–460。

考慮過的替代方案 B 是維持單行文案的視覺位置不變，讓版位對稱向上擴張：分隔線會上移到 364.25，與日期行只剩 16.25px。兩者都不產生碰撞，但 B 讓分隔線逼近日期行，壓縮了左欄原本的呼吸空間，且改變的是使用者每天都看得到的分隔線位置。A 的代價是單行文案下移 14px、底部留白由 48px 縮為 20px，使用者在設計稿上比對後選 A。

### D2：固定高度的置中容器，而非讓段落自行撐高

在分隔線與段落之間加一層固定 56px 的 flex 置中容器，段落本身不設高度：

```
<div class="flex h-14 items-center justify-center">
  <p class="line-clamp-2 text-center text-[19px] leading-[28px]" ...>
```

不採用「在 `<p>` 上設 `min-height`」的作法，因為那只能讓單行文字停在版位頂端，無法滿足上下置中；也不採用依行數切換樣式的作法，那會讓版位高度隨內容變動，違反本變更要求的「版位固定」，而且需要在呈現層量測文字。

`h-14` 為 56px，等於兩倍 `leading-[28px]`。行高寫成顯式值而非沿用繼承的 1.5（28.5px），是因為容器高度必須正好等於兩行；靠繼承值會得到 57px 這種需要跟著浮動的數字，日後任何人改動全域 line-height 都會讓版位多出或少掉一截。`leading-[28px]` 與既有 `leading-none` 的寫法一致，不引入 `text-[19px]/[28px]` 這種本專案未使用的語法。

### D3：以 `line-clamp-2` 取代 `truncate`

`line-clamp-*` 自 Tailwind v3.3 起為核心工具，本專案的 v4.3.3 直接可用，不需外掛。它產生 `display:-webkit-box`、`-webkit-box-orient:vertical`、`-webkit-line-clamp:2`、`overflow:hidden`，由瀏覽器在第二行末尾加省略號；渲染環境是 Electron 的 Chromium，此前綴屬性可用。`text-center` 在 `-webkit-box` 下仍作用於各行。

不採用在 JS 端量測寬度再手動切字：那需要在呈現層重做瀏覽器的斷行，全形與半形混排會算錯，而且每次文案或字級變動都要重算。

### D4：字數上限 44，睡眠模式維持 20

兩行的理論容量是 `floor((480 - 16 × 2) / 19) × 2 = 46` 全形字。取 44 而非 46，是留給標點與斷行不理想時的餘裕——提示詞的字數是對模型的軟性約束，貼著上限訂會讓偶爾超出的回應直接吃到省略號。

睡眠模式維持 20 字。其依據是「溫暖、簡短」的語氣要求，不是版面寬度，兩者不該因為版面變寬就一起放寬。此判斷需寫進 `ai-weather-advisor` 的規格，否則下一個人會把兩個數字當成同一個約束。

規格目前記載清醒模式為 25 字，實作與測試為 22 字，兩者本來就不一致。本變更一併消除該落差，統一為 44。

### D5：測試的容量計算改為兩行，不是放寬斷言

`tests/advisorPrompts.test.mjs` 目前以 `capacity = floor((480 - 16 × 2) / 19)` 斷言 `limit <= capacity`，另有 `limit >= 22` 與睡眠模式 `<= 23`。44 字會讓前兩項失敗，這是本變更合格的 Red：失敗原因是「容量仍以單行計算」這個尚未成立的新行為，不是測試設定錯誤。

修法是把容量公式乘上行數常數 2，並讓下限跟著上限走；不得用放寬或刪除斷言換取通過。睡眠模式的 `<= 23` 要改成以單行容量為界——它本來就只需要一行，這個界限對它仍然正確。

### D6：提示區另立一份納入版控的設計依據

`layout-variant` 的 `Variant Design Conformance` 要求每個變體對應一份版控設計稿。本變更改動的提示區幾何會與 `desgin-codex-v4.svg`、`design-claude-v4.svg` 不符，而 `work-items/` 在 `.gitignore` 內，不能充當依據。

作法是把已核可的驗證稿移入 `docs/theme/v2/design-advisory-two-line.svg`，並在 `docs/theme/v2/README.md` 載明它只覆蓋兩份變體設計稿的提示區。不改寫兩份原設計稿：它們是 v4 的歷史依據，逐一回頭修改會讓「設計稿對應實作」的追溯斷掉，而既有 requirement 本來就允許以文件載明覆蓋。

### D7：排在 `hide-stale-weather-notice` 之後

兩個變更都改 `AI Message Area` 與 `Shared Behaviour Across Variants`。OpenSpec 的 MODIFIED delta 在 archive 時整段取代主規格，所以本變更的 delta 已包含 `hide-stale-weather-notice` 的情境（`Stale Alone Uses The Routine Advisory`、`Staleness Does Not Mask A Location Notice`、`過期提示在兩個變體中一致隱藏`）。

這使 archive 順序成為硬性條件：必須 `hide-stale-weather-notice` 先、本變更後。順序顛倒的話，前者的 delta 會把本變更的兩行行為洗掉。實作順序同此，因為兩者都改 `devFixtures.mjs` 的 `LONG_TEXT` 與 `tests/stationIntegration.test.mjs`。

## Risks / Trade-offs

- 底部留白由 48px 縮為 20px → Pi 官方 7 吋面板若有邊框遮蔽或 overscan，第二行可能貼邊。須在實機上以兩行文案確認，不以 macOS 結果代替。
- 單行文案下移 14px，是使用者每天看到的位置變化 → 已在設計稿上確認並選定，實作後仍須在實機複核觀感。
- 上限放寬到 44 字後，模型可能習慣性寫滿兩行，讓原本一句話就夠的提示變冗長 → 提示詞保留「溫暖、簡短」的語氣要求；數值集中在一處，調整成本是改一個數字。
- `-webkit-line-clamp` 依賴 Chromium 前綴屬性 → Electron 渲染層即 Chromium，風險僅在未來換渲染環境時才成立；以變體渲染測試固定行為。
- 兩個變體各改一次，容易只改其中一個 → 以同時涵蓋兩個變體的渲染測試防止單邊漏改。
- 與 `hide-stale-weather-notice` 的檔案重疊 → 依 D7 固定順序，整合時對照實際版本而非本文件的引述。

## Migration Plan

不涉及資料、設定或 localStorage 遷移。實作通過測試與 `npm run electron:dev` 檢視後，依既有 AppImage 建置與安裝流程部署到 Pi；本變更的規劃完成不等於已部署。

回退範圍是兩個變體的提示區區塊、提示詞的字數、`devFixtures` 的最長提示值與對應測試；不需回退 `hide-stale-weather-notice` 或設定集中化。

## Open Questions

- 44 字是依容量推算的上限，實機觀察真實 AI 回應後可能偏長或偏短，屆時再調整數值即可，不影響本變更的規格、作法與任務拆解。
