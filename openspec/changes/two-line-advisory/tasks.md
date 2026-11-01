# Tasks

本變更把提示區由單行改為固定兩行版位，並把清醒模式提示詞的字數上限由 22 放寬到 44。依 `docs/agent-protocol.md` §3–§5 採 test-first，Red 的失敗原因必須是「兩行版位／兩行容量尚未成立」這個預期行為，而不是測試設定或相依錯誤。

先做版位再放寬字數：順序顛倒會出現「上限 44 但版面仍是單行」的中間狀態，畫面會直接吃到省略號。

實作前先確認基準：`hide-stale-weather-notice` 的實作已完成（見 design.md D7），否則本變更對 `devFixtures.mjs` 與 `tests/stationIntegration.test.mjs` 的改動會與其衝突。所有項目目前均為待實作。

## 1. 兩行版位

- [x] 1.1 在 `tests/variantRender.test.mjs` 先加入兩個變體的提示區版位測試：固定高度容器存在、文案在其中上下左右置中、提示區不再使用單行截斷。驗證：`node --test tests/variantRender.test.mjs` 在實作前因兩版仍為 `truncate` 單行而失敗，記錄有效 Red 證據與測試名稱。
- [x] 1.2 先加入「同一則兩行文案在 Codex 與 Claude 產生相同截斷規則」的對照測試，並涵蓋超過兩行時只渲染兩行。驗證：`npm run test:advisory-wrap` 以 Chromium 實測行框，確認兩版版位、兩行上限、第二行末尾截斷與全形中文斷點一致；逐字斷點依 design.md D8 不在保證範圍。驗證：實作前因第二行不存在而失敗；既有 7.3 系列變體差異測試保持通過，不得為了讓新測試過而放寬既有斷言。
- [x] 1.3 依 design.md D1／D2／D3 最小修改 `src/components/variants/ClaudeVariant.vue` 與 `src/components/variants/CodexVariant.vue` 的提示區：絕對定位改 `bottom-5`、加入 56px 固定高度的置中容器、段落改用 `line-clamp-2` 與 `leading-[28px]`，Codex 保留既有 `font-semibold`。驗證：1.1、1.2 轉綠，`node --test tests/variantRender.test.mjs` 全數通過，且兩檔的提示區差異仍只有字重。
- [x] 1.4 確認分隔線與其上方元素位置未因本次改動位移。驗證：以渲染結果或實際量測比對分隔線仍在 378 附近（原 378.0，預期 378.5），時鐘與日期的流排版未改，不以「看起來沒變」作為結論。

## 2. 字數上限與單一來源

- [x] 2.1 先修改 `tests/advisorPrompts.test.mjs` 的容量計算，使其以兩行為界（`floor((480 - 16 × 2) / 19) × 2`），並把清醒模式下限改為 44、睡眠模式上限維持以單行容量為界。驗證：`node --test tests/advisorPrompts.test.mjs` 在改提示詞之前因實際上限仍為 22 而失敗，記錄 Red；不得以刪除或放寬斷言取得通過。
- [x] 2.2 將 `src/services/advisorPrompts.mjs` 清醒模式提示詞的字數限制改為 44 字，並更新其括號內的依據說明為兩行容量；睡眠模式的 20 字與其「溫暖、簡短」依據不動。驗證：2.1 轉綠，且 `getSystemPrompt(true)` 的字數限制未被一併改動。
- [x] 2.3 先更新 `tests/devFixtures.test.mjs` 與 `tests/stationIntegration.test.mjs` 中「最長外出提示 ≥ 22 字」的斷言為 44 字，再把 `src/services/devFixtures.mjs` 的 `LONG_TEXT.advice` 換成 44 字的最長外出提示，並同步其註解所載的字數依據。驗證：先取得 Red，再以 `node --test tests/devFixtures.test.mjs tests/stationIntegration.test.mjs` 轉綠；`LONG_TEXT` 的其他欄位與 `hide-stale-weather-notice` 對 `anomaly` 的改動不受影響。
- [x] 2.4 確認字數上限在程式碼中只有一處定義。驗證：以 `grep -rn "字數限制" src/` 確認僅 `advisorPrompts.mjs` 載明，規格、提示詞與測試三者的數值一致。

## 3. 設計依據與文件

- [x] 3.1 將已核可的驗證稿移入 `docs/theme/v2/design-advisory-two-line.svg`（來源為 `work-items/WI-20261031-ui-hardware-review/advisory-two-line-proposal.svg`，該目錄在 `.gitignore` 內不能充當依據）。驗證：檔案已納入版控，內容標示兩行版位量測值與各狀態，且與 1.3 的實作數值一致。
- [x] 3.2 更新 `docs/theme/v2/README.md`：載明該設計稿只覆蓋兩份變體設計稿的提示區，其餘區域仍以原設計稿為準，並說明兩份原稿的提示區數值已不是現行依據。驗證：敘述與 `layout-variant` delta 的 `提示區兩行版位另有設計依據` 情境一致，依 `docs/okf-conventions.md` 檢查文件格式。
- [x] 3.3 更新 `docs/current-implementation.md` 的提示區說明：最多兩行、上下左右置中、超過兩行截斷，以及清醒模式字數上限 44。驗證：與三份 delta 一致，且未宣稱睡眠模式字數一併放寬。

## 4. 整合與實機驗收

- [x] 4.1 執行 `npm test`（含既有測試與 `vite build`）與 `openspec validate two-line-advisory --strict`。驗證：記錄命令與通過結果，153 項既有測試不得因本次改動轉為失敗或被刪除。
- [x] 4.2 以 `npm run electron:dev` 搭配 `localStorage.setItem('devLongText', 'advice')` 與 `'anomaly'`，在 800×480 下檢查兩個變體的單行置中、兩行、超過兩行截斷與睡眠樣式。驗證：保存實際觀察結果，不以規劃步驟或 macOS 以外的推論代替。
- [ ] 4.3 在使用者安排的新 AppImage 部署到 Pi 後，確認兩行文案未被面板邊緣遮蔽（底部留白由 48px 縮為 20px），且單行文案下移 14px 後的觀感可接受。驗證：記錄部署版本與使用者現場確認；macOS 的結果不構成驗收通過。

## Workflow follow-up

- Archive 順序必須是 `hide-stale-weather-notice` 先、本變更後（見 design.md D7）；順序顛倒會讓過期提示隱藏的規格內容在 archive 時被覆蓋。
- 本次規劃不自動實作、打包、部署、封存或 commit；依後續授權執行相應階段。
