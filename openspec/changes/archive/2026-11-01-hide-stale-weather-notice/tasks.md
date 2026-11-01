# Tasks

本變更僅暫停顯示天氣資料過期提示；外出提示與其他錯誤提示照常運作。依 `docs/agent-protocol.md` 採 test-first，Red 證據必須是新呈現規則尚未成立，而非測試設定或相依錯誤。所有項目目前均為待實作。

## 1. 共用提示政策與說明

- [x] 1.1 在 `tests/stationIntegration.test.mjs` 先加入三種 stale 成因的呈現測試（門檻超時、新回應不涵蓋現在、既有涵蓋耗盡），涵蓋有建議及無建議的情況；斷言顯示一般建議／既有預設訊息，同時內部 stale 與最後成功時間保持原狀。驗證：`node --test tests/stationIntegration.test.mjs` 在實作前因 advisory 仍是 anomaly 而失敗，記錄有效 Red 證據。
- [x] 1.2 先加入 stale + unlocated 的組合測試，斷言仍顯示定位未知；保留 never、單獨 unlocated 及獨立恢復的回歸案例。驗證：組合案例在實作前因 stale 遮住定位提示而失敗，既有其他錯誤案例保持有效，保存測試名稱與結果。
- [x] 1.3 最小修改 `useWeatherStation.js` 的共用提示選擇，從全部異常中選出仍可見的錯誤；stale-only 使用一般提示的文字與 kind，不留下空白警告或異常樣式。驗證：1.1、1.2 的測試轉綠，且 `dataState.mjs` 的三種 stale 判定、更新時間與刷新排程沒有因隱藏提示被改寫。
- [x] 1.4 更新 `docs/current-implementation.md` 的異常區行為，說明只有過期提示暫停、其他錯誤與外出提示繼續運作，根因及恢復提示的政策留待後續。驗證：文字與本 change 的兩份 delta 一致，依 `docs/okf-conventions.md` 檢查文件格式，且未宣稱資料更新問題已修復。

## 2. 開發範例與兩個版面

- [x] 2.1 先更新開發異常長文字案例的斷言，要求預覽仍可見的錯誤訊息且不再出現過期文案，再最小更新 `devFixtures.mjs` 的 fixture；保留 DEV 閘門與截斷驗證。驗證：先取得預期文案的 Red，再以 `node --test tests/stationIntegration.test.mjs` 確認通過，正式環境不受開發開關影響。
- [x] 2.2 補足 Codex／Claude 共用提示規則與睡眠樣式的回歸檢查，並更新 `docs/theme/v2/README.md` 的共用異常說明。驗證：相同 stale-only 資料在兩版均顯示一般提示，stale + 其他可見錯誤在兩版均顯示該錯誤；切換不觸發天氣重抓、不重設成功時間，版面與睡眠樣式契約保留。

## 3. 整合與實際驗收

- [x] 3.1 執行 `npm test`（含既有測試與建置）及 `openspec validate hide-stale-weather-notice --strict`；若已整合 `centralize-builtin-config`，確認沒有恢復其已移除的舊常數或外部設定讀取。驗證：記錄命令、通過結果及實際基準版本，保留資料有效性斷言，不以刪除測試換取通過。
- [x] 3.2 使用 `npm run electron:dev` 與既有 `devLongText` 的 advice／anomaly 模式，檢查 800×480 下兩個版面的一般提示、保留錯誤提示、截斷及睡眠樣式；過期狀態的路由由 1.1、1.2 的整合測試驗證。驗證：保存實際觀察結果，不能將規劃步驟當作已通過。
- [x] 3.3 在使用者安排的新 AppImage 部署到 Pi 後，確認原過期提示已不再佔據提示區，外出提示或其他有效錯誤可正常呈現。驗證：記錄部署版本及使用者現場確認；只確認呈現調整，不宣稱天氣更新根因已解決。

## Workflow follow-up

- 本次規劃不自動實作、打包、部署、封存或 commit；依後續授權執行相應階段。
- 日後另行釐清官方批次時間、擷取時間與資料涵蓋的關係，再決定是否及如何恢復過期提示。

## Pi 驗收來源

2026-11-01，使用者於本次收尾對話確認：「pi 測試完成，task 我都打勾了」。
本 change 的 Pi 任務依使用者現場確認完成，不將本機自動測試當作實機證據。
本輪未另收到 AppImage SHA-256、逐項照片或日誌，故不補造這些驗收細節。
