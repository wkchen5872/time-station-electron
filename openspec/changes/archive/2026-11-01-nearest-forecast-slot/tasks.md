# Tasks

把「目前」的定義由「涵蓋當下的時段」放寬為「最近的預報時段（上限一個時段長度）」，修正畫面完全取不到天氣值的根因。依 `docs/agent-protocol.md` §3–§5 採 test-first，Red 的失敗原因必須是「最近時段尚未被接受」這個預期行為，而不是測試設定錯誤。

實作前確認基準已包含 `hide-stale-weather-notice` 的實作（見 design.md D6）。所有項目目前均為待實作。

## 1. 共用挑選規則

- [x] 1.1 在 `tests/forecastSlots.test.mjs` 先加入最近時段的解析測試：僅有未開始時段且首格起點在一個時段長度內時可取得值；逐時元素容忍 1 小時、三小時元素容忍 3 小時；超過該長度則取不到。驗證：`node --test tests/forecastSlots.test.mjs` 在實作前因 `entryCovering` 仍為嚴格包含而失敗，記錄 Red 證據。
- [x] 1.2 先加入「有涵蓋當下的時段時一律優先採用，不改取最近的未開始時段」的測試，避免放寬順手改變既有優先序。驗證：此案例在實作前即通過（既有行為），實作後仍須通過；於報告中標明它是回歸案例而非 Red。
- [x] 1.3 最小修改 `src/services/forecastSlots.mjs` 的挑選規則，讓 `entryCovering`、`hasUsableData` 與 `composeSlots` 的起始格一致採用新定義；上限取該筆資料自身的 `end - start`，不寫死常數。驗證：1.1、1.2 轉綠，且 `start`/`end` 的值未被改寫（design.md D4）。
- [x] 1.4 確認 `isSuccessfulUpdate` 仍只委派 `hasUsableData`，未另立第二套判準。驗證：`tests/dataState.test.mjs` 通過，並以 grep 確認 `dataState.mjs` 未新增自己的時間比較。

## 2. 異常狀態與既有測試對齊

- [x] 2.1 先更新 `tests/dataGuards.test.mjs` 與 `tests/dataState.test.mjs` 中以「涵蓋當下」為前提的案例，改以新定義表達；保留「資料真的缺漏時不算成功」「零值為有效值」兩類斷言不得弱化。驗證：先取得預期 Red，再轉綠；逐一列出調整過的案例與理由。
- [x] 2.2 補 stale 三個成因在新定義下的案例：`no-cover`（最新回應連最近時段都不符）、`coverage-exhausted`（既有資料連最近時段都沒有）、`threshold` 不受本次放寬影響。驗證：`node --test tests/dataGuards.test.mjs tests/stationIntegration.test.mjs` 通過，三個成因仍可分辨。
- [x] 2.3 在 `tests/stationIntegration.test.mjs` 補一個以實際 CWA 供給形狀為本的案例：所有元素皆由下一個整點開始、無任何涵蓋當下者，斷言成功更新成立、`current` 取到值、無異常。fixture 註明取自 2026-11-01 的實測回應。驗證：實作前因判定失敗而 Red，實作後轉綠。

## 3. 文件改正

- [x] 3.1 更新 `docs/theme/v2/README.md` 的「資料來源的語意」：「目前」數值取自**最近的預報時段**，並載明 CWA 不供給已開始的時段。驗證：敘述與 delta 一致，依 `docs/okf-conventions.md` 檢查格式，且未宣稱為實測值。
- [x] 3.2 更新 `docs/current-implementation.md` 的對應敘述與資料狀態說明。驗證：與 delta 及 `README.md` 三者一致，未宣稱 CWA 的供給行為已改變。

## 4. 整合與實際驗收

- [x] 4.1 執行 `npm test` 與 `openspec validate nearest-forecast-slot --strict`。驗證：記錄命令與結果；既有測試不得因本次改動被刪除或弱化。
- [x] 4.2 以 `npm run electron:dev` 在 800×480 檢查兩個變體實際顯示天氣值，且 console 不再出現 `no usable data for the present moment`。驗證：保存實際觀察結果與當下時間；須在非整點界線的時刻檢查，否則無法證明放寬生效。
- [x] 4.3 在使用者安排的新 AppImage 部署到 Pi 後，確認實機可持續取得天氣值。驗證：記錄部署版本與使用者現場確認。

## Workflow follow-up

- Archive 順序須為 `hide-stale-weather-notice` 先、本變更後（見 design.md D6）。
- 本次規劃不自動實作、打包、部署、封存或 commit；依後續授權執行相應階段。

## Pi 驗收來源

2026-11-01，使用者於本次收尾對話確認：「pi 測試完成，task 我都打勾了」。
本 change 的 Pi 任務依使用者現場確認完成，不將本機自動測試當作實機證據。
本輪未另收到 AppImage SHA-256、逐項照片或日誌，故不補造這些驗收細節。
