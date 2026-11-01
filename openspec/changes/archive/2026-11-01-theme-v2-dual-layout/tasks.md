# Tasks

## 1. 前置修正

- [x] 1.1 更新 `openspec/config.yaml` 的 `context`：技術堆疊改為 Electron 44 / Vite 8 / Tailwind CSS 4 / Vue 3，套件管理改為 npm 搭配 `package-lock.json`，驗證指令改為 `npm run build`；驗證方式為重新執行 `openspec instructions proposal --change theme-v2-dual-layout --json` 並確認回傳的 `context` 已更新
- [x] 1.2 修正 `openspec/specs/time-station/spec.md` 結構：將 `## System Requirements`、`## User Interface`、`## Weather Information`、`## Display Modes`、`## AI Integration` 下的 requirement 歸入單一 `## Requirements` 區段，requirement 文字不變；驗證方式為 `openspec validate theme-v2-dual-layout --strict` 不再出現 time-station 的 `Archive would refuse this delta` 訊息
- [x] 1.3 修正 `openspec/specs/ai-weather-advisor/spec.md` 結構，作法同 1.2；驗證方式為 `openspec validate theme-v2-dual-layout --strict` 不再出現 ai-weather-advisor 的對應訊息

## 2. 拆分（行為不變）

- [x] 2.1 將天氣擷取、IP 定位、AI 建議、時間與農曆邏輯自 `src/components/TimeStation.vue` 抽出為 `useWeatherStation()` composable；驗證方式為 `npm test` 通過，且 `npm run electron:dev` 下畫面與拆分前一致
- [x] 2.2 將睡眠判定與模式狀態抽出為 `useDisplayMode()` composable，繼續自 `sleepMode.enabled`／`startHour`／`endHour` 設定讀取（23／6 維持為預設值而非常數），`sleepModeOverride` 型別維持 `null | true | false` 並保留 `false` 的強制清醒邏輯；此步仍保留現行三態，尚未移除 Light；驗證方式為 `npm test` 通過且開發模式下主題與睡眠按鈕行為不變
- [x] 2.3 為 `useDisplayMode()` 補上單元測試，涵蓋：`enabled: false` 時不自動睡眠、自訂跨夜時段（例如 22–5）、`sleepModeOverride === false` 時於睡眠時段內仍保持清醒、按鈕循環僅在 Auto 與 On 之間；驗證方式為 `node --test tests/*.test.mjs` 新增測試通過
- [x] 2.4 為 `useWeatherStation()` 補上單元測試，涵蓋本地日期格式化與定位 fallback 取用順序；驗證方式為新增測試通過

## 3. 版面骨架與共用控制項

- [x] 3.1 移除 Light Theme：刪除 `getAutoThemeMode()`、`parseSunTime()`、`displayModeOverride` 與 `getModeClass()` 的 light 分支；驗證方式為全專案搜尋 `displayModeOverride` 與 light 主題分支無殘留，且開發模式下無任何操作可達淺色底
- [x] 3.2 移除日出日落：刪除 `CWAWeatherAPI.getSunriseSunset()`、`_parseSunriseSunset()`、`_getTodayString()`、`_getAfterDaysString()` 與 `TimeStation.vue` 的 `weather.sunrise`／`sunset`，**保留 `_formatDate()`**；驗證方式為開發模式下 DevTools Network 面板確認一次刷新只發出一次 CWA 請求
- [x] 3.3 移除 `src/defaultConfig.js` 與 `config.json` 的 `display.darkModeStart`／`darkModeEnd`，確認 `sleepMode` 三個設定項未受影響；驗證方式為 2.3 的測試仍通過
- [x] 3.4 更新 `src/services/CWAWeatherAPI.example.js`，移除已刪除 API 的示範；驗證方式為該檔不再引用 `getSunriseSunset`
- [x] 3.5 實作 6:4 版面骨架（左 480px／右 320px）取代 `grid-cols-10` 的 7:3；驗證方式為開發模式下量測兩欄寬度符合 480／320
- [x] 3.6 實作共用控制項：版面分段切換與睡眠膠囊，規格依 `docs/theme/v2/desgin-codex-v4.svg`，觸控高度 44px，睡眠按鈕維持僅循環 Auto 與 On；驗證方式為開發模式下兩段同時可見、當前段填色，且切換變體時控制項位置不變
- [x] 3.7 實作變體狀態 `layoutVariant`（`codex`／`claude`，預設 `codex`）與其 `localStorage` 持久化，舊鍵 `displayModeOverride` 不讀取；驗證方式為新增測試涵蓋無值回退 `codex`、未知值回退 `codex`、舊鍵存在時不影響結果
- [x] 3.8 確認睡眠中切換版面變體不改變睡眠狀態與其 override；驗證方式為新增測試並於開發模式下實際操作確認

## 4. 預報資料結構與時距對齊（test-first）

- [x] 4.1 先寫失敗測試：以「溫度逐時、降雨機率三小時」的回應樣本，驗證每格顯示區間為三小時且降雨機率歸屬該三小時區間；驗證方式為測試因現行 `_extractForecastData()` 把三小時機率複製進逐時列而失敗
- [x] 4.2 改造 `_extractForecastData()` 輸出，使每個元素各自攜帶 `value`／`intervalStart`／`intervalEnd`；驗證方式為 4.1 的測試轉為通過
- [x] 4.3 於**共用層**實作格組成規則，元素集合取自來源可取得的全部元素而非任何變體的顯示子集：格區間取該集合中最粗者、採半開區間 `[start, end)`；粒度不細於格的元素其區間須涵蓋整個格，僅部分重疊者不放入該格；粒度細於格的元素（如三小時格中的逐時溫度與天氣代碼）取格起點值；全部元素皆逐時時格即為逐時；1 小時標該小時、長於 1 小時標起訖；驗證方式為新增測試涵蓋全逐時、全三小時、混合粒度、粗粒度僅部分重疊遭排除、區間交界（instant 等於 end 時歸下一格）五種情境
- [x] 4.4 實作短期預報固定四格、起點為涵蓋當下的格，且**不渲染任何總跨度標題或說明文字**；驗證方式為測試確認四格與起點正確，並於開發模式下確認區塊內無跨度文案
- [x] 4.5 同步更新 AI prompt 的資料組裝，使其取用新結構且不誤用區間值；驗證方式為新增測試確認傳入 prompt 的降雨機率附帶其區間
- [x] 4.6 更新 `src/services/CWAWeatherAPI.example.js` 中直接讀取 scalar 欄位的三處取用點（`:26-32` 的逐欄位輸出、`:53-54` 的摘要輸出、`:126-132` 的 `weather.value` 組裝），改為新的 `{ value, intervalStart, intervalEnd }` 結構；驗證方式為全檔搜尋無 `slot.temperature`、`slot.rainProbability` 等 scalar 取用，且範例可依新結構讀出值與區間
- [x] 4.7 建立兩版共用 fixture：逐時溫度與天氣代碼搭配三小時降雨機率，分別令該機率為 0%、10%、70%，以同一份資料分別組成兩個變體的畫面；驗證方式為測試斷言三種機率下兩版的格起訖、格數與代表溫度完全相同，僅降雨機率的可見性不同（Codex 三種皆顯示；Claude 僅 70% 顯示，0% 與 10% 留空且仍為三小時格）

## 5. 預報正確性（test-first）

- [x] 5.1 先寫失敗測試：以 UTC+8 的 00:00–08:00 時間點驗證今日高低溫、明天、後天的分組結果；驗證方式為測試因現行 `toISOString()` 行為而失敗
- [x] 5.2 以 `_formatDate()` 取代 `TimeStation.vue` 三處 UTC 日期比對；驗證方式為 5.1 的測試轉為通過
- [x] 5.3 先寫失敗測試：驗證每日預報的天氣代碼取自 06:00–18:00 中降雨機率最高的時段、降雨機率取該區間最大值、高低溫取全日；驗證方式為測試因現行取 `weather_codes[0]` 而失敗
- [x] 5.4 實作每日代表時段規則，含「所有時段機率相同時取區間第一個時段」的平手規則；驗證方式為 5.3 的測試轉為通過

## 6. 資料有效性與異常提示

- [x] 6.1 將 `weather` 的初始硬編碼值改為缺值語意，並以非空值而非 falsy 判定，使 0°C 與 0% 保留為有效底層值（是否顯示交由變體規則決定）；驗證方式為新增測試涵蓋 0 值與缺值的區分，並斷言 0% 在 Codex 顯示、在 Claude 因門檻留空且兩者皆不視為缺值
- [x] 6.2 實作資料狀態判定：`never`（含缺 key、key 遭拒、空或無效回應）、`stale`（超過門檻或最新回應不涵蓋當下時段），並將「成功更新」定義為回應可解析且含涵蓋當下時段的預報列；驗證方式為新增測試涵蓋缺 key、HTTP 200 但空陣列、回應僅含過去時段、連續失敗超過門檻四種情境
- [x] 6.3 實作定位狀態：定位失敗但有設定或快取位置時不視為異常，兩者皆無時為 `unlocated`；驗證方式為新增測試涵蓋兩種情境
- [x] 6.4 將異常門檻（預設 90 分鐘）置入設定而非寫死；驗證方式為測試以自訂門檻值驅動 `stale` 判定
- [x] 6.5 實作提示區狀態切換與優先順序（`never` > `stale` > `unlocated`），各異常獨立解除，AI 未配置不構成天氣異常；驗證方式為新增測試涵蓋優先順序、單一異常解除不影響其他異常、AI 未配置時仍顯示預設訊息
- [x] 6.6 `never` 狀態下天氣值以缺值呈現且不顯示初始值；驗證方式為開發模式下移除 CWA 金鑰啟動，確認畫面不出現 28°／晴時多雲，且提示區顯示異常而非雞湯文案；**完成證據**：使用者於 2026-11-01 於開發模式實際驗證並回報完成
- [x] 6.7 異常提示於睡眠模式沿用睡眠樣式，不提高亮度或對比；驗證方式為開發模式下同時觸發睡眠與異常並目視確認

## 7. 兩個版面變體

- [x] 7.1 實作 Codex 變體元件，依 `docs/theme/v2/desgin-codex-v4.svg`：顯示地區名、更新時間、「目前預報」標示、現況溫度與天氣描述、四格短期預報（降雨機率無隱藏門檻）、明後天；不顯示今日高低溫與體感；農曆單獨成行置於時鐘上方；驗證方式為開發模式下與設計稿逐區對照；**完成證據**：使用者於 2026-11-01 的視覺對稿確認（「畫面上我已經檢查，視覺上目前都符合設計稿；畫面功能上貌似都無誤」，經 reviewer 轉述自其對話），適用該回報當時的版本，併同本輪 `tests/variantRender.test.mjs` 的兩版 SSR 渲染斷言，以及其後未再變更排版的程式證據
- [x] 7.2 實作 Claude 變體元件，依 `docs/theme/v2/design-claude-v4.svg`：顯示今日高低溫、降雨機率低於 20% 隱藏、體感僅在與同時段現況預報溫度差距達 3 度或舒適度為悶熱／寒冷時顯示且版位固定、農曆併入日期行；不顯示更新時間；驗證方式為開發模式下與設計稿逐區對照；**完成證據**：使用者於 2026-11-01 的視覺對稿確認（「畫面上我已經檢查，視覺上目前都符合設計稿；畫面功能上貌似都無誤」，經 reviewer 轉述自其對話），適用該回報當時的版本，併同本輪 `tests/variantRender.test.mjs` 的兩版 SSR 渲染斷言，以及其後未再變更排版的程式證據
- [x] 7.3 以同一組資料驗證兩版刻意的顯示差異：降雨機率 10% 時 Codex 顯示而 Claude 留空、今日高低溫 Claude 顯示而 Codex 不顯示；驗證方式為新增測試以相同 fixture 分別渲染兩個變體並斷言差異
- [x] 7.4 確認切換變體不觸發天氣重新擷取且兩版取用的底層資料值相同；驗證方式為開發模式下切換時 Network 面板無新請求，並比對兩版顯示的溫度一致

## 8. 圖示與字型

- [x] 8.1 以 inline SVG `<symbol>` 取代 `WeatherCodeMapper` 的 emoji 圖示，短期預報 40px、明後天 34px、現況 52px，顏色以 `currentColor` 繼承；驗證方式為開發模式下確認無 emoji 字元渲染且相鄰不同天氣可辨識
- [x] 8.2 修正共用圖示資產的 viewBox 內距，使含 stroke 寬度的筆畫完整落在可視範圍內（Claude 現有圖示組為 `0 0 24 24`，雲弧頂點約 y≈0，stroke-width 2 外擴後達 y≈-1 而被裁切；`ic-thunder`、`ic-shower` 因雲體上移更嚴重。Codex V4 已以 `-2 -2 28 28` 修正）；驗證方式為對**全部**圖示於 40px、34px、52px 三種尺寸量測筆畫實際範圍並與可視範圍比對，斷言無裁切——不得僅以 symbol 框寬高相符作為通過依據
- [x] 8.3 將完整 Noto Sans TC variable font 納入打包（不做字元子集化），一併納入 SIL Open Font License 授權檔；驗證方式為建置後量測並記錄字型檔與 AppImage 體積
  - 完成證據（2026-11-01）：本機 `TimeStation-1.4.0-arm64.AppImage` 為 153,021,498 bytes；`NotoSansTC-Variable.ttf` 為 11,917,560 bytes（wght 100–900）。以 `7z` 讀出 AppImage 的 `resources/app.asar`，其 SHA-256 與 `release/linux-arm64-unpacked/resources/app.asar` 相同；以 `@electron/asar` 確認內含字型與 `OFL.txt`，字型 SHA-256 與專案及原本安裝的字型檔一致，未在打包時子集化。產物內授權檔與目前來源僅差一個行尾空白，不影響授權文字。
- [x] 8.4 移除 `index.html` 的 Google Fonts `preconnect` 與 stylesheet 連結，改以 `@font-face` 指向本地檔案；驗證方式為開發模式下離線啟動，Network 面板無對外部字型主機的請求
- [x] 8.5 驗證動態文字以隨附字型渲染：以 AI 建議輸出、CWA 天氣描述與定位解析地名抽樣檢查；驗證方式為開發模式下比對字形，確認未回退系統字型且無缺字方框
  - 驗收來源（2026-11-01）：使用者明確回覆「這三個功能我已經驗收完畢了，所以可以繼續往下做」，確認包含 8.5。未提供逐筆字型渲染與 fallback 檢查紀錄。
- [x] 8.6 移除 `src/index.css` 與元件 scoped style 中無作用的 `-webkit-font-smoothing`／`-moz-osx-font-smoothing`；驗證方式為全專案搜尋無殘留

## 9. 文字溢出

- [x] 9.1 以 CSS 單行截斷處理超長文字，不引入捲動、跑馬燈或展開；驗證方式為以最長 CWA 天氣描述、最長地區名、含節氣的農曆字串、最長外出提示與最長異常訊息分別測試兩個變體，確認截斷且版面不位移
  - 驗收來源（2026-11-01）：使用者明確回覆「這三個功能我已經驗收完畢了，所以可以繼續往下做」，確認包含 9.1。未提供各文字與兩個變體的逐項檢查紀錄。

## 10. 文件

- [x] 10.1 建立 `docs/theme/v2/` 並移入 `desgin-codex-v4.svg`、`design-claude-v4.svg`、`design-claude-64.svg`；驗證方式為三檔存在於該目錄且已納入 Git
- [x] 10.2 撰寫 theme v2 文件，記錄 v1 為 7:3、v2 為 6:4，說明兩版的顯示差異與共用行為，並明確載明 `design-claude-v4.svg` 的來源關係（版面內容源自 `design-claude-64.svg`、控制項樣式源自 `desgin-codex-v4.svg`）及任何與 Codex 稿不同的控制項數值與其覆蓋依據；驗證方式為逐項比對兩份 SVG 的控制項數值並於文件中列出差異，連結可正確解析
- [x] 10.3 更新 `README.md` 與 `docs/current-implementation.md` 中與 Light Theme、7:3 版面、日出日落相關的敘述；驗證方式為搜尋該三項關鍵字無過時描述

## 11. 整合驗證

- [x] 11.1 執行 `npm test`（`node --test tests/*.test.mjs && npm run build`）與 `npm run test:icons` 確認全部通過
- [x] 11.2 於 `npm run electron:dev` 逐項確認：兩個變體切換與其刻意差異、睡眠自動與手動、異常提示四種情境、文字截斷、圖示可辨識；**完成證據**：使用者於 2026-11-01 於開發模式實際驗證並回報完成
- [x] 11.3 執行 `npm run electron:build:appimage` 並於 Raspberry Pi 實機確認版面、字型渲染與圖示可辨識度；驗證方式為實機截圖與現場閱讀，記錄時鐘字重的實機選擇（design.md Open Questions）
  - 驗收來源（2026-11-01）：使用者明確回覆「這三個功能我已經驗收完畢了，所以可以繼續往下做」，確認包含 11.3，並同意繼續封存。
  - 實機驗收補充（2026-11-01，1.4.0 於 Pi 4 / Debian 13 trixie）：使用者回報「目前畫面看起來是正常的， icon 跟字型是 OK」，後續回報「11.3 測試無誤」。未留存實機截圖，證據為使用者現場閱讀後的回報。
  - 時鐘字重的實作紀錄：兩個變體的時鐘皆為 `font-medium`（**500**；`src/components/variants/CodexVariant.vue:10`、`ClaudeVariant.vue:5`），與設計稿一致；design.md Open Questions 所述「現行實作為 700」在實作期間即已改為 500，該敘述已過期。使用者已驗收實機字型呈現，但未提供 500 與 700 的實機比較或明確選擇紀錄。

## 12. R04 實作 review 的必要修正

- [x] 12.1 時鐘初始化與 1000ms interval 不得等待任何遠端工作：`useWeatherStation` 的 `onMounted` 先啟動時間 timer，再進行 config／定位／天氣／AI；並確保 unmount 後不再建立未清理的 timer；驗證方式為新增整合測試，注入永不 resolve 的天氣與 AI Promise，斷言 `now` 仍持續前進且 timers 不為空
- [x] 12.2 設定改為 reactive 後接入睡眠判定：`useDisplayMode` 不再於 computed 內讀取非 reactive 的 `ConfigManager.get()`；驗證方式為測試在 hour 固定為 23 時，async 載入 `enabled: false` 或自訂時窗後無須變動 hour 或 override，`isSleepMode` 即更新
- [x] 12.3 排程刷新沿用當前睡眠狀態：`updateWeather()` 不得寫死 `updateAdvice(false)`，初始化、刷新與手動切換共用同一睡眠狀態，且較早的 awake 回應不得覆蓋較新的 sleep advice；驗證方式為測試「以 sleep 啟動」與「sleep → weather refresh」的 prompt 模式序列不含非預期的 false，並確認每夜一次的 gating 未被繞過
- [x] 12.4 補齊 stale 的兩個行為：記錄最新一次 no-cover 的 stale 原因並於成功更新時獨立解除；另保留最後一組有效快照供 stale 狀態顯示，不得以舊值冒充新時段資料；驗證方式為新增「成功 → no-cover 未達門檻」與「成功 → coverage 耗盡」兩組測試，斷言前者 `anomaly.kind === 'stale'`、後者仍有最後已知值可顯示
- [x] 12.5 成功判定與數值轉換排除缺值：`isSuccessfulUpdate` 要求存在可用的預報值而非僅有時間框；數值轉換前排除 null／undefined／空字串／非數值，真正的 0 仍保留為有效值；驗證方式為新增 all-null、空 ElementValue、混合有效與缺值、真 0 四組測試，斷言 all-null 不算成功且不產生 0°／0%
- [x] 12.6 呈現層補足四個固定位置：資料層仍只回傳可取得的真實格子，兩個變體各自把不足的位置渲染為缺值，不虛構時間或天氣；驗證方式為以 0／1／2／4 格 fixture 渲染兩版，斷言短期預報恆為四個位置且缺值符號數正確，並確認區塊高度不隨格數變動
- [x] 12.7 統一 AI forecast 的欄位契約：caller、`_calculateTempTrend` 與快取比較器使用同一組欄位名，缺值不得當成 0 參與趨勢計算；驗證方式為以新格式測試「25→29」與「25→18」兩種趨勢，斷言趨勢翻轉會使快取失效
- [x] 12.8 AI system prompt 依每格實際 interval 解讀，不再宣稱固定四小時或 2-4 小時，並以 `weather`／`rainProbability` 取代已移除的 emoji 圖示描述；驗證方式為以四個三小時格組出 payload，斷言 prompt 不含固定小時數的預設語句
- [x] 12.9 `WeatherIcon` 改為 design D7 所述的 `<symbol>` + `<use>`，或更新 D7 改採目前的 direct-path 並說明理由；驗證方式為兩者擇一落實後，`scripts/check-icon-clipping.mjs` 仍全數通過

## 13. R05 實作 review 的必要修正

- [x] 13.1 天氣刷新週期在設定載入後才求值，時鐘仍立即啟動：`stationLifecycle` 的 `weatherIntervalMs` 接受以已載入設定求值的函式；驗證方式為實際掛載測試，`updateInterval: 60` 時 timers 為 `[1000, 60000]`、未設定時為 `[1000, 1800000]`
- [x] 13.2 還原持久化的睡眠狀態不得被誤判為手動切換，且未取得可用天氣前不送氣象分析：還原改在 setup 階段同步完成，`updateAdvice` 在 `everSucceeded` 為 false 時延後，強制更新同樣記錄當夜問候；驗證方式為實際掛載測試，還原 `sleepModeOverride=true` 後 AI 請求數為 1、模式為 `[true]`、payload 溫度為 `[28]`，且後續刷新不再送出、真正的手動切換仍會送出
- [x] 13.3 可用值依元素型別判定：數值元素必須可轉為有限數且型別限 number／string，文字元素保留文字語意；驗證方式為 `'abc'`／`'NaN'`／`''`／`true`／`[]`／`{}` 皆不算成功，真 0、字串 `'0'` 與文字元素仍有效，並以實際掛載確認無效數值回應為 `never` 異常
- [x] 13.4 過期狀態維持資料的時間歸屬：`today` 與 `daily` 一律依現在的本地日期從保留的 series 取值，無對應資料即缺值；`current` 與時間格仍保留最後已知值；驗證方式為實際掛載測試，11/1 取得資料後時間前進至 11/5，daily 日期為 `11/06`／`11/07` 且為缺值，`current.temperature` 仍為 28、異常為 `stale`
- [x] 13.5 產品內統一時間來源：`updateWeather` 與定位快取不再使用 `Date.now()`，一律取用與畫面相同的時鐘；驗證方式為整合測試以注入時鐘驅動，成功判定與 `lastSuccessAt` 均依該時鐘
- [x] 13.6 接線抽為 `src/composables/useStation.js` 使其可被整合測試載入；`taiwan-regions.json` 改用 import attributes、`import.meta.env` 收斂為單一來源，使產品模組可在 node 下匯入；驗證方式為 `tests/stationIntegration.test.mjs` 直接掛載實際接線，且 `npm run build` 仍通過

## 14. R06 補查：實際引用流程的圖示裁切

- [x] 14.1 移除 `WeatherIcon` 外層 svg 的重複 `viewBox`：`<use>` 的預設 viewport 為 `0,0,100%,100%`，在帶 viewBox 的外層中會落在 user space 的 0..28，symbol 自身的 -2..26 映射進去等於整體位移 +2，使底端超出可視範圍；驗證方式為實際 SFC 的 SSR 輸出於 34／40／52px 皆無裁切
- [x] 14.2 新增 `scripts/check-icon-render.mjs`，以實際的 `WeatherIconSprite` 與 `WeatherIcon` SSR 輸出比對「預設 viewport」與「允許溢出」兩種渲染的非透明像素數，覆蓋全部 9 個圖示 × 3 種尺寸；驗證方式為刻意還原 viewBox 後檢查確實轉紅（thunder 三尺寸與 partly 皆被標出），修正後 27 個實例無差異
- [x] 14.3 圖示檢查獨立為 `npm run test:icons`（幾何 + 實際渲染兩個層次），並於兩個腳本加入外部工具前置檢查：缺少 `rsvg-convert` 或 `python3`+`Pillow` 時列出缺項與安裝方式並以非零結束，不得靜默跳過。`npm test` 維持 unit + build，不相依於未宣告的外部工具；驗證方式為移除 PATH 中的工具後執行確認報錯且 exit 1，工具齊備時兩項檢查皆通過

## Workflow follow-up

- 於專案的審查要求滿足後封存本變更。
- 確認封存結果。
