# Tasks

本變更含行為變更（design D2 的 `enabled` fallback、`builtin-defaults` 的單一來源要求），
依 `docs/agent-protocol.md` §3–§5 採 test-first：Red 必須因預期行為尚未成立而失敗。

## 1. 盤點與基準

- [x] 1.1 逐行盤點 `src/` 內所有「設定缺值 fallback」運算式，產出清單記錄：設定路徑、
      現行運算式（`||` / `??` / `!== false`）、解析到的來源、0 是否為合法值。
      對照 design.md D3 的判定表補齊表中未列的項目。
      驗證：清單覆蓋 `grep -rn "|| DEFAULT\|?? DEFAULT\|!== false\||| [0-9]" src/` 的全部命中，
      且每項都標明與 D3 判定表一致或說明差異。
      **產出：** `fallback-inventory.md`，14 個設定 fallback、6 個排除項。
      新發現 `geolocation.enabled`（`useWeatherStation.js:289-290`）與 `sleepMode.enabled`
      屬同一類幽靈預設，且其隱含值 `false` 與宣告值 `true` **相反**；已補 task 3.6
      與 design D3 判定表。
- [x] 1.2 記錄基準行為：執行 `npm test` 與 `npm run test:icons` 並保存通過結果，
      作為「移除死欄位不改變行為」的對照基準。
      驗證：`node --test tests/*.test.mjs` 全數通過且記錄測試總數。
      **基準（2026-11-01, `e17f867`）：** `node --test tests/*.test.mjs` = 121 tests,
      121 pass, 0 fail。`npm run test:icons` = 27 個實例皆無裁切、WeatherIcon 外層 svg
      無重複 viewBox。

## 2. 單一來源的可驗證性（test-first）

- [x] 2.1 新增「改變集中來源即改變行為」的測試：針對 `sleepMode.startHour`，
      在測試中覆寫集中來源的值，斷言睡眠判定隨之改變。
      驗證：此測試在集中化前因 `sleepState.mjs` 仍讀自身常數而 **失敗**（Red），
      集中化後通過。
- [x] 2.2 新增 `enabled` 缺值時解析自集中來源的測試：覆寫集中來源的
      `sleepMode.enabled` 為 `false`，傳入不含 `enabled` 的設定物件，斷言不進入睡眠。
      驗證：此測試在現行 `config.enabled !== false` 下 **失敗**（Red，幽靈預設），
      改為 `??` 後通過。
- [x] 2.3 新增 `weather.staleThresholdMs` 與 `cache.location.duration` 的同類測試
      （覆寫集中來源 → 行為改變）。
      驗證：兩項在改寫前皆 Red，改寫後通過。
- [x] 2.4 新增 0 值保留測試：`sleepMode.startHour: 0` 須被採用而非視為缺值。
      驗證：現行 `??` 已正確，此測試應直接通過，作為防止退回 `||` 的回歸保護；
      以暫時改為 `||` 確認該測試會轉紅，再復原。
      **結果：** 第一版測試以 3 時與 22 時斷言，mutation（`??` 改 `||`）**未**被殺——
      `0 || 23` 得到 23，而時窗 `[23,6)` 仍包含 3 時、仍排除 22 時，兩個斷言都還通過。
      `[0,6)` 與 `[23,6)` 的唯一差異是 **23 時**，已改以 23 時斷言；
      再跑 mutation 得 7 fail（含 2.4），復原後回到 6 fail / 1 pass。

## 3. 建立集中來源並改接線

- [x] 3.1 在 `src/defaultConfig.js` 標註「必須保持為無依賴的葉節點」，並為
      `weather.updateInterval` 註明 0 不是合法值（design D3）。
      驗證：該檔無任何 `import` 陳述。
      **結果：** 檔頭改寫為「唯一來源」並列出兩項約束（葉節點、模組不得自行宣告預設）；
      `weather.updateInterval` 與 `staleThresholdMs` 各註明 0 的合法性與對應運算子。
      `grep -c "^import"` = 0。
- [x] 3.2 改寫 `src/services/sleepState.mjs`：移除 `DEFAULT_SLEEP_CONFIG` 的獨立定義，
      三個值改為解析自集中來源，`enabled` 採 `??`（design D2）。
      驗證：2.1、2.2、2.4 的測試轉綠；`DEFAULT_SLEEP_CONFIG` 若保留為 re-export，
      其值須來自集中來源而非自行宣告。
- [x] 3.3 改寫 `src/services/dataState.mjs` 的 `DEFAULT_STALE_THRESHOLD_MS` 與
      `src/composables/useWeatherStation.js:114` 的 fallback，改為解析自集中來源，
      運算子依 D3 改為 `??`。
      驗證：2.3 的 `staleThresholdMs` 測試轉綠。
- [x] 3.4 改寫 `src/services/locationSource.mjs:32` 的 `cacheDuration` 預設與
      `useWeatherStation.js:288` 的 fallback，改為解析自集中來源，運算子依 D3 改為 `??`。
      驗證：2.3 的 `cache.location.duration` 測試轉綠。
- [x] 3.5 改寫 `useWeatherStation.js:447` 的 `|| 1800`，改為解析自集中來源並維持 `||`
      （design D3：0 非合法值）。
      驗證：既有 `tests/stationIntegration.test.mjs:51-61`（`config: { weather: {} }` 斷言
      1800000）仍通過，且新增一項覆寫集中來源後 timer 隨之改變的斷言。
- [x] 3.6 改寫 `useWeatherStation.js:289-290` 的 `geolocation.enabled` 與
      `locationSource.mjs:34` 的預設參數，改為解析自集中來源（`fallback-inventory.md` #11、#12）。
      先寫測試：傳入不含 `geolocation` 的設定物件，斷言結果為集中來源宣告的 `true`
      而非現行的隱含 `false`。
      驗證：該測試在改寫前 Red；改寫後通過，且既有顯式給 `geolocation: { enabled: false }`
      的測試全數不受影響。
- [x] 3.7 改寫 `useWeatherStation.js:308` 傳遞 `loadedConfig.location` 的路徑
      （`fallback-inventory.md` #13），缺值時解析自集中來源。
      驗證：傳入不含 `location` 的設定物件時，`locationSource` 收到的 `configured`
      為集中來源的值；既有定位來源測試不受影響。

## 4. AI 建議快取時效

- [x] 4.1 新增測試：`AIWeatherAdvisor` 的快取有效期限取自建構子參數，
      且該參數的預設值來自集中來源。
      驗證：測試在現行裸字面值 `60 * 60 * 1000` 下 **失敗**（Red）。
- [x] 4.2 `AIWeatherAdvisor` 建構子增加快取時效參數，預設取自集中來源；
      `useWeatherStation.js:59` 的 `createAdvisor` 傳入該值（design D5）。
      驗證：4.1 轉綠；以兩個參數建構的既有呼叫端與測試替身行為不變，
      快取仍為 1 小時。
- [x] 4.3 確認 `cache.aiAdvice.duration` 由無消費者轉為實際生效，不列入死欄位移除清單。
      驗證：集中來源中該值存在且被 4.2 的路徑讀取。

## 5. 移除外部載入與死欄位

- [x] 5.1 移除 `src/services/ConfigManager.js` 的 `fetch('/config.json')`、合併邏輯、
      `deepMerge`、`get`、`set`、`saveConfig`、`reset`；`loadConfig` 保留為可注入的
      載入介面並維持可等待行為（design D4）。
      驗證：`tests/stationIntegration.test.mjs:63-75`（`config: pending.promise`）與
      卸載後不建立排程的既有測試全數通過。
- [x] 5.2 刪除專案根目錄的 `config.json`。
      驗證：`npm run build` 成功，且 `dist/` 無 `config.json`（本來就沒有）。
- [x] 5.3 移除集中來源中 10 個無消費者欄位（本行原寫「11 個」但只列出 10 項，為計數筆誤：
      第 11 個 `cache.aiAdvice.duration` 依 D-002 改為實際生效而保留，由 task 4.3 處理）：`display.timeFormat`、`display.hideCursor`、
      `weather.provider`、`location.latitude`、`location.longitude`、`ai.enabled`、
      `ai.apiEndpoint`、`ai.updateInterval`、`updateInterval.time`、`updateInterval.weather`。
      驗證：1.2 的原有 121 項測試保持通過，新增測試另計（移除無消費者欄位不改變行為）；
      `grep -rn "<各欄位名>" src/ electron/` 無剩餘讀取點。
- [x] 5.4 新增測試斷言集中來源不含無消費者欄位（對應
      `specs/builtin-defaults/spec.md` 的 Built-in Defaults Expose Only Wired Values）。
      驗證：以暫時加回一個無消費者欄位確認該測試轉紅，再移除。

## 6. 文件同步

- [x] 6.1 逐項核對並更新下列落點中描述外部 JSON 合併機制的段落：`README.md`、
      `docs/current-implementation.md`、`docs/deployment/install-update.md`、
      `docs/deployment/raspberry-pi.md`（含「已知限制」中 `config.json` 行為「仍待確認」一段）。
      **實際落點多於本任務與 R01 F-03 所列：** `grep` 另發現 `docs/SPECIFICATION.md`（6 處）、
      `docs/QUICKSTART.md`（4 處）、`docs/development/DEVELOPMENT.md`（2 段，含一張架構圖）。
      已全部處理。另修正兩份文件既有的錯誤敘述：README 與 QUICKSTART 都寫「API Key 設定在
      `config.json` 的 `weather.apiKey`」，實際金鑰在 `.env` 的 `VITE_CWA_API_KEY`，
      且 provider 是 CWA 而非 OpenWeatherMap。
      說明日後修改內建值需重新建置與部署，且開發模式不再提供外部 JSON 覆寫。
      驗證：`grep -rn "config\.json" README.md docs/` 的每個命中都已更新或確認為正確敘述。
- [x] 6.2 更新 `openspec/specs/time-station/design.md` 的「Configuration Management」段落：
      移除三層架構與 `ConfigManager.get('key')` 資料流敘述（`get` 本來就無消費者）。
      只改設定相關內容，不順帶重寫其他歷史設計（例如仍寫 7:3 的版面比例敘述保留不動）。
      驗證：該段不再描述 `config.json`，且該檔其他段落的 diff 為空。
- [x] 6.3 更新 `openspec/config.yaml` 的 `context`：現行要求「preserve
      ConfigManager/defaultConfig/config.json boundaries」與本變更衝突，改為表述
      「集中內建預設、不提供執行期設定檔」（design.md Open Questions）。
      驗證：`openspec instructions proposal --change <任一 change> --json` 回傳的
      `context` 不再要求保留 `config.json` 邊界。
- [x] 6.4 確認 `ai.enabled` 等欄位的移除在文件與 commit 訊息中未被寫成新啟用或新停用 AI。
      驗證：相關敘述明確說明 AI 啟用判斷維持現行的環境變數與天氣可用性，行為不變。

## 7. 整合驗證

- [x] 7.1 執行專案完整必要檢查：`npm test`（`node --test tests/*.test.mjs && npm run build`）
      與 `npm run test:icons`。
      驗證：全數通過，且測試總數為 1.2 基準加上本變更新增的項數。
      **結果：** `npm test` exit 0，136 tests / 136 pass / 0 fail（1.2 基準 121 + 新增 15：
      `builtinDefaults.test.mjs` 8、`advisorCacheDuration.test.mjs` 5、
      `stationIntegration.test.mjs` 新增 2）。`npm run test:icons` exit 0，27 個實例無裁切。
      另跑 `npm run test:deploy` 32 情境全通過（未受本變更影響）。
      **審查補正後：** Codex 獨立重跑 `npm test` = 153 tests / 153 pass / 0 fail，build exit 0。
      圖示 27 與部署模擬 32 的獨立檢查也已通過；兩者程式與輸入未變更，沿用結果。
- [x] 7.2 `openspec validate centralize-builtin-config --strict` 通過。
      驗證：輸出為 valid。
- [x] 7.3 以 Electron 開發流程確認開發模式行為：即使專案根目錄放回一份內容不同的
      `config.json`，畫面設定仍不受影響（開發與正式使用同一個設定載入實作）。
      驗證：Codex 於 2026-11-01 以 CUA 操作真實 macOS Electron 800×480 視窗。
      使用固定來源快照與獨立 userData，執行 `npm run dev`，以 `NODE_ENV=development`
      啟動產品 `electron/main.js`；測試 harness 僅隔離 profile 並封鎖遠端 HTTP/HTTPS。
      此流程沿用 `npm run electron:dev` 的 Vite 與 Electron 入口，未修改產品主進程。
      快照根目錄的 JSON 刻意設定臺南市安平區、IP 定位停用、睡眠 0–23 時；
      畫面仍為臺北市，中午切回 Auto 為清醒，確認 JSON 未生效。
      兩個版面與睡眠 On／Auto 均已實際操作；最後補正版重新載入後保留 Codex／Auto。
      這是本機開發模式驗收，未檢驗正式 AppImage、Pi 面板或真實天氣／AI API。
- [x] 7.4 確認保留約束未被破壞：版面選擇與睡眠按鈕的 `localStorage` 值在升級後仍沿用，
      定位來源條件次序、天氣刷新週期與異常門檻行為不變。
      驗證：Codex 先在 `e17f867` 的真實 Electron 視窗選 Claude 與睡眠 On，正常退出後，
      用同一 origin／隔離 profile 啟動本次實作，目視確認兩項選擇均沿用。
      最後補正版重新綁定重啟後的 CUA app，切回 Codex／Auto 並由 View > Reload 確認保存；
      AX 與同次截圖一致。未更動使用者原 profile，也未清除或遷移資料。
      位置來源、排程與門檻的既有行為由完整 153/153 測試及來源順序複審覆蓋。
      Pi 更新與重開機後的實際持久化仍由使用者部署後另行確認，不據本項宣稱已部署。

## 8. R01 審查補正（Codex 獨立驗收 2026-11-01）

來源：`/Users/chenwenkai/.codex/worktrees/9801/.../work-items/WI-20261101-agent-acceptance/agents/centralize-r01.md`。
三個缺口均由本 session 獨立重現後才修正。

- [x] 8.1 **F01** `stationLifecycle.mjs:17` 的 `weatherIntervalMs = 30 * 60 * 1000` 未接集中來源，
      且與 `weather.updateInterval` 單位不同（毫秒 vs 秒），兩者數值恰好相等故不可見。
      改為 `defaultConfig.weather.updateInterval * 1000`。
      驗證：新增 `R01-F01`（集中來源改 120 秒 → 排程須為 120000ms）與 `R01-F01b`（單位一致性）。
      F01 在修改前 Red；mutant S（還原字面值）殺掉 `R01-F01`。
- [x] 8.2 **F02** `ensureAdvisor` 以兩參數呼叫 `createAdvisor`，已載入設定的
      `cache.aiAdvice.duration` 從未到達服務（消費者斷線，非幽靈預設）。
      改為在 `ensureAdvisor` 內以 `??` 解析後作為第三參數傳入，預設工廠原樣轉傳；
      `undefined` 時才由服務預設參數退回集中來源，兩參數呼叫維持相容。
      驗證：新增 3 個 composable 接線測試（5000／0／缺值）及服務層測試。
      最後以真實 Vue 掛載及產品預設工廠，驗證 5000／0／缺值抵達實際服務實例，
      取代原先只測試複製工廠的案例；省略第三參數的 causal check 使前兩者失敗，復原後轉綠。
      三者在修改前 Red；mutant T（還原兩參數）殺掉全部三個。
- [x] 8.3 **F06** `configured` 位置原為整物件 fallback，部分設定（只給 `district`）會得到
      無 `city` 的物件而被判為「無設定位置」。改為逐欄 `??`，保留顯式空字串。
      驗證：新增 4 個測試（只給 district／只給 city／跨城市／顯式空字串）。
      前兩者在修改前 Red；mutant U（還原整物件）殺掉這兩個。
      **mutant V 揭露我多加了一層多餘防護：** 原本加了「同城才退回區名」判斷，
      移除後行為不變且無任何測試能偵測——跨城市的區名組合由 `resolveTaiwanLocation`
      擋下（只在該城市 areaList 內比對，實測 `{臺中市, 內湖區}` 得 `district: ''`）。
      已移除該判斷與為它新增的 `isSameCityName` 匯出。
- [x] 8.4 盤點方法缺陷修正：初版只搜 fallback 運算子與 `config.` 讀取點，漏掉
      「預設參數帶字面算式」與「硬編碼地區名」兩類。補兩條 grep 並補入 #15–#19。
      驗證：`fallback-inventory.md` 新增「初版盤點的方法缺陷」一節與 5 個項目。
- [x] 8.5 兩個 `|| '臺北市'` 的分類：**兩者都是同一個內建後備地區概念，都已集中**
      （`queryName` 與 `TaiwanLocationResolver` 的無匹配分支）。
      前置修正：`defaultConfig.location.city` 由 `'台北市'`（台）改為 `'臺北市'`（臺）——
      `COUNTY_API_MAP` 與 `taiwan-regions.json` 皆以「臺」為精確鍵且不正規化。
      另明列三個排除項的具體理由（`tickMs`、`latestResponseUsable`、`provider='gemini'`）。
      驗證：`fallback-inventory.md` 的 #18／#19 說明與排除項表格。
- [x] 8.6 文件補正：`cache.location.duration` 的 0 語意改為「快取一律不算新鮮，
      失敗時仍用過期快取作為後備，不是停用快取」（註解與 design 判定表）；
      `staleThresholdMs` 改為「依距上次成功更新的經過時間判定，不是失敗次數」；
      `cache.aiAdvice.duration` 的 0 改為「立即過期」；
      proposal／design／tasks 的「11 個」校正為實際移除 10 個（原始盤點 11 個保留敘述）；
      測試註解的「現行」改為「修改前」。
      驗證：`grep -n "11 個" openspec/changes/centralize-builtin-config/` 僅剩說明性敘述；
      `grep -n "現行" tests/` 無過期命中。

## 9. R02 審查補正（Codex 複驗 2026-11-01）

來源：`.../work-items/WI-20261101-agent-acceptance/agents/centralize-r02.md` 與其後續補充。
兩項都是我在 R01 自行判斷錯誤所致，均先重現取得有效 Red 才修。

- [x] 9.1 **撤回 R01 的「同城防護多餘」結論。** 該結論的依據是
      `resolveTaiwanLocation` 會擋下跨城市區名，但它只檢查區名是否存在於該城市的
      `areaList`。`中正區` 同時存在於臺北市與基隆市，實測
      `{city:'基隆市', district:'中正區'}` 會原樣保留。
      集中來源 `{臺北市, 中正區}` + 設定 `{city:'基隆市'}` 會錯誤產生「基隆市中正區」。
      **mutant V 當初存活是測試資料只用了臺北獨有的 `內湖區`，不是該判斷多餘。**
      已恢復跨城市限制（`inheritsDistrict`）。
      驗證：新增「R02 不同城市不得繼承預設區名，即使該區名在新城市也存在」在修正前 Red；
      mutant V2（移除限制）與 mutant W（永不繼承，反向過度）兩個方向皆被殺。
- [x] 9.2 **同城判斷沿用既有名稱解析能力。** 恢復後的第一版 `isSameCityName` 只做中文
      正規化，丟掉了 `TaiwanLocationResolver` 既有的 `cityEngName` 英文別名支援：
      `{city:'Taipei'}` 會被既有 resolver 正規化為臺北市，卻在同城判斷中被判為不同城
      而丟掉缺值區名。改為 `isSameCity(regions, a, b)`，沿用該模組的 `matchesLocation`。
      驗證：新增「R02 同城判斷須沿用既有的英文別名解析能力」在修正前 Red；
      mutant X（限縮為中文比對）被殺。未新增資料來源、設定或擴大 API。
- [x] 9.3 補 design D6 與 spec 的 city-district 相依規則，消除「Partial configuration
      object」與跨城市限制的文字矛盾。
      spec 新增 requirement `Dependent Settings Resolve As A Unit`（6 個情境，含別名同城
      與來源優先序不受影響），並在原 partial 情境加上「該群組的欄位彼此獨立」前提。
      design 新增 D6（五種組合的對照表、為何不能靠 resolver 代替、別名不可限縮）。
      驗證：`openspec validate centralize-builtin-config --strict`。
- [x] 9.4 兩個漏修的註解：`useWeatherStation.resolveLocation` 的 TTL 0 改為
      「快取一律不算新鮮；定位失敗時仍採用過期快取作為後備，不是停用快取」；
      `defaultConfig.cache.aiAdvice.duration` 改為只描述快取時效
      （「超過此時間的快取不再採用」「0 表示一律視為已過期」「不影響請求時機與排程」），
      移除原先關於「每次刷新都重新請求」的敘述。
      驗證：`grep -n "不使用快取" src/` 無命中。

## Workflow follow-up

- 封存前依專案 review 要求完成審查。
- 封存後確認 `openspec/specs/builtin-defaults/spec.md` 的 Purpose 已由 delta 帶入，
  非 `TBD` 佔位。
- 更新 `work-items/WI-20261101-config-json-prod-ineffective/README.md` 的
  `openspec_change` 欄位與狀態。
