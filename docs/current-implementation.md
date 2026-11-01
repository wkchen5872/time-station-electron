---
type: Reference
title: Time Station 目前實作與使用說明
description: 依目前程式碼整理功能、設定、開發方式與已知限制。
tags: [architecture, configuration, development]
timestamp: 2026-11-01T01:30:00+08:00
---

# Time Station 目前實作與使用說明

本頁依工作區程式碼與 `package-lock.json` 整理；它描述已寫入的程式，不代表外部服務、打包或 Raspberry Pi 實機已驗收。早期 README、快速開始及規格對照中的舊範例與本頁衝突時，請先以本頁和原始碼確認。

## 功能與架構

- Electron 主進程 `electron/main.js` 建立 800×480 視窗；開發模式連接 Vite，正式模式載入 `dist/index.html` 並啟用全螢幕 Kiosk。
- `src/components/TimeStation.vue` 已改為外殼：掛載共用控制項與當前版面變體。資料與模式邏輯分別位於 `src/composables/useWeatherStation.js` 與 `useDisplayMode.js`，兩者的接線（建立、把睡眠狀態回傳給資料層、睡眠切換時更新提示語氣）集中於 `src/composables/useStation.js`，使該層能被整合測試載入；版面位於 `src/components/variants/`。畫面、成功判定與最後成功時間共用同一個時鐘來源。版面為 5 欄 Grid（v2，6:4）：左 3 欄時間與日期、右 2 欄天氣；v1 為 10 欄 Grid 的 7:3。時間每秒更新。
- `src/services/CWAWeatherAPI.js` 查詢中央氣象署預報。日出日落已移除——其唯一消費者是已移除的自動日夜切換，每次刷新因此由 2 次 CWA 請求降為 1 次。回傳結構為每個元素各自攜帶來源區間（`{ value, start, end }`），時間格由 `forecastSlots.mjs` 於共用層組成。畫面的目前溫度取自涵蓋當下的預報時段，並非觀測站實測值。資料狀態分為「從未成功取得」與「曾成功後過期」兩種，呈現方式不同：

  - **從未成功**（缺 CWA Key、請求失敗、回應為空或不含涵蓋當下時段的可用值）：所有天氣值以缺值呈現，不顯示任何內建預設值，提示區顯示無法取得資料。數值欄位中的非數值字串（如 `'abc'`）不算可用值。
  - **曾成功後過期**（最新回應不涵蓋當下時段、資料涵蓋範圍耗盡，或超過 `weather.staleThresholdMs`）：`current` 與短期預報時間格保留最後一組有效值，提示區顯示資料已過期。但「今日高低溫」與「明天／後天」一律依現在的本地日期從保留的資料重新取值，無對應資料即為缺值——這兩列帶有日期語意，若連同快照凍結，跨日後舊日期的資料會被重新叫成明天／後天。
- 啟用 IP 定位時，程式呼叫 ipgeolocation.io，以 `TaiwanLocationResolver.mjs` 搭配 `src/data/taiwan-regions.json` 解析地名。位置快取 24 小時；請求失敗時可使用過期快取。
- `AIWeatherAdvisor.js` 透過 LangChain 呼叫 Gemini 或 OpenAI，依一般／睡眠模式產生建議，並分別快取結果；呼叫失敗時使用備援文字。正常天氣更新與顯示模式變化都可能觸發 AI 更新。

控制項為分段切換（Codex / Claude 兩段同時可見，當前段填色）加獨立的睡眠膠囊；睡眠按鈕仍只循環 Auto → On。Light Theme 已移除，也不再依時段或日出日落自動切換呈現——版面只因使用者明確選擇而變。自動睡眠依 `sleepMode.enabled`／`startHour`／`endHour` 設定判定（預設 23:00–06:00），`sleepModeOverride === false` 的強制清醒邏輯保留但不在按鈕上開放。版面變體存於 `localStorage` 的 `layoutVariant`（預設 `codex`），已退役的 `displayModeOverride` 不再讀取。

## 畫面操作與資料

- 點擊頂部的 **Codex** 或 **Claude** 選擇版面；選擇會保存在本機。兩版取用相同天氣資料，但雨率門檻、今日高低溫等顯示規則不同，詳見 [theme v2](/docs/theme/v2/README.md)。
- 睡眠按鈕在「自動」與「開啟」之間循環。「自動」依設定時段判定，「開啟」強制進入睡眠；在自動睡眠時段選回「自動」不會強制喚醒。睡眠狀態與版面選擇分開保存。
- 短期預報固定四個位置，共用層依來源資料的時間區間組格，再由各版面決定是否顯示。資料不足時以缺值補齊；明後天的天氣代表值取各日白天時段。
- 無異常時提示區顯示外出建議；從未成功取得資料、資料過期或位置不可用時改顯示異常，優先順序為 `never`、`stale`、`unlocated`。異常解除後恢復提示。未設定 AI 金鑰本身不構成天氣異常，正常狀態會顯示預設問候。

## AI 提示資料

`useStation` 與 `useWeatherStation` 負責接線與資料組裝，`AIWeatherAdvisor.js` 負責呼叫服務與快取。送入的 `current` 是目前預報，`forecast` 每格包含自己的時間區間、`temperature`、`weather`、`rainProbability` 等欄位。格長依資料而定，四格不一定代表四小時。

提示詞位於 `src/services/advisorPrompts.mjs`：一般模式要求 22 字以內，睡眠模式要求 20 字以內。這是對模型的要求，不保證輸出長度；畫面以單行截斷處理。尚無可用天氣時不發送氣象分析，一般與睡眠建議使用不同快取。

## 相依套件與開發

`package.json` 指定 Vue 3、Electron 44、Vite 8、Tailwind CSS 4、solarlunar 3 與 LangChain；實際鎖定版本見 `package-lock.json`。鎖定的 Electron 套件要求 Node.js 22.12.0 以上，Vite 也接受此版本範圍。使用 npm 與 repo 內的 lockfile：

```bash
npm ci
npm run electron:dev
```

開發模式使用視窗並開啟 DevTools；ESC 的處理是退出全螢幕，不是關閉視窗。`npm test` 執行 `tests/*.test.mjs` 後建置前端；`npm run build` 僅建置前端。

`npm run test:icons` 另外驗證天氣圖示：`scripts/check-icon-clipping.mjs` 檢查圖示幾何含筆畫寬度落在 viewBox 內，`scripts/check-icon-render.mjs` 以實際 SFC 的 SSR 輸出比對預設 viewport 與允許溢出的渲染，涵蓋 9 個圖示 × 34／40／52px。兩者驗證不同層次：前者驗資產本身，後者驗 symbol／use 的實際引用流程。

此入口需要 **npm 以外的工具**：`rsvg-convert`（macOS `brew install librsvg`；Debian/Ubuntu `apt install librsvg2-bin`）與 `python3` 搭配 `Pillow`（`pip3 install Pillow`）。缺少時腳本會列出缺項與安裝方式並以非零結束，不會靜默跳過。因此 `npm test` 不包含這項檢查，以免預設流程相依於未宣告的外部工具；圖示相關變更的驗證須另行執行 `npm run test:icons`。

Linux ARM64 AppImage 的打包指令是 `npm run electron:build:appimage`。Pi 本機打包及 Mac 打包後上傳的步驟，見 [Raspberry Pi 安裝與更新](/docs/deployment/install-update.md)。`npm run test:deploy` 在隔離目錄測試安裝腳本，不代表真實 SSH、systemd 或 Pi 畫面已驗證。

### 開發模式長文字測試

這個開關用固定資料檢查文字溢出，並非即時天氣。啟動 `npm run electron:dev` 後，在 DevTools Console 執行以下指令；重新載入後，分別切換 Codex 和 Claude，觀察是否截斷、版面是否位移。

```js
// 外出提示：同時顯示長地區、天氣、農曆與外出提示
localStorage.setItem('devLongText', 'advice');
location.reload();
```

再於重新載入後的 Console 測試異常訊息：

```js
// 異常提示：同時顯示長地區、天氣、農曆與異常訊息
localStorage.setItem('devLongText', 'anomaly');
location.reload();
```

完成後移除開關並重新載入，以恢復一般顯示：

```js
localStorage.removeItem('devLongText');
location.reload();
```

測試字串定義於 `src/services/devFixtures.mjs`。開關僅在開發模式生效；正式建置下不會套用測試顯示，但目前建置的前端 JS 仍包含這些固定字串與開關名稱。自動測試通過不代表兩版的實際截斷與面板可讀性已目視驗收。

## API Key 與設定

複製 `.env.example` 為 `.env`，依需要填入：

| 環境變數 | 用途 |
| --- | --- |
| `VITE_CWA_API_KEY` | 中央氣象署預報；缺少時天氣值以缺值呈現並顯示異常提示。 |
| `VITE_IPGEOLOCATION_API_KEY` | 啟用 IP 定位時使用。 |
| `VITE_AI_PROVIDER` | `gemini` 或 `openai`，未設定時預設 `gemini`。 |
| `VITE_GEMINI_API_KEY`、`VITE_OPENAI_API_KEY` | 使用所選 AI 服務時提供對應 Key；未設定時不顯示 AI 建議。 |

`VITE_OPENWEATHER_API_KEY` 雖出現在範例檔，目前天氣更新程式不使用它。這些 `VITE_` 值供 renderer 使用，可能被包含在前端建置產物中；不要把產物視為能保密 API Key。`.env` 已列入 `.gitignore`。本專案沒有受版本控制的設定檔可存放密鑰——金鑰只走 `.env`。

內建預設值集中於 `src/defaultConfig.js`，為唯一來源。本專案**不提供執行期設定檔**：這些值在建置時決定，修改後需重新建置與部署。`ConfigManager.loadConfig()` 只回傳該來源的複本；它保留為可等待、可注入的載入點，供「時鐘不依賴設定完成、天氣排程於設定完成後建立、卸載後不新增排程」這組時序契約的驗證使用。

現存的 10 個設定值全部有功能消費者：`location.city`／`district`（IP 定位停用或失敗且無快取時的後備）、`geolocation.enabled`、`weather.updateInterval`、`weather.staleThresholdMs`、`sleepMode.enabled`／`startHour`／`endHour`、`cache.location.duration`、`cache.aiAdvice.duration`。

各模組不自行宣告預設值，缺值 fallback 解析到集中來源；合法的 `0` 值以 `??` 保留。`sleepMode.startHour`／`endHour` 的 0 代表午夜，`staleThresholdMs` 與快取時效也接受 0；`weather.updateInterval` 則維持正數週期的 `||` 後備，避免 0 秒排程。

位置快取時效為 0 時，快取不算新鮮，但定位失敗仍可採用過期快取；它不是停用位置後備。AI 快取時效只影響快取採用，不改變天氣刷新或睡眠問候的請求時機。

城市與行政區作為一組解析。缺少城市時取內建城市；缺少行政區時，僅在城市與內建城市相同時繼承內建行政區。不同城市不繼承區名，即使兩城有同名區。城市比較沿用既有中文與英文名稱解析；明確提供的區名或空字串仍保留。

移除外部設定檔不影響執行中的 Codex／Claude 切換與睡眠按鈕；既有 `localStorage` 選擇和快取不清除、不遷移。

打包設定只列入 `dist/**/*`、`electron/**/*` 和 `package.json`。外部設定檔機制已於 2026-11-01 移除：它在正式建置下從未生效（`file://` origin 下絕對路徑 `/config.json` 指向檔案系統根目錄，且該檔不在打包清單內），而開發模式的 Vite dev server 會送出它，兩者行為不一致使問題長期未被發現。現在開發與正式行為一致，皆不讀取外部設定。

## 驗證範圍與規格

現有自動測試涵蓋台灣地名解析、預報區間與日期、資料有效性、睡眠設定、AI 提示與趨勢、Vue 接線、兩版 SFC 渲染及開發測試資料。這些測試使用模擬資料，不能單憑通過結果判定真實 CWA／AI 服務、Electron 實際呈現、AppImage 打包或 Raspberry Pi 裝置已驗收；應分別記錄各項測試結果。

`openspec/specs/` 包含既有需求與歷史設計；其中部分內容仍描述 OpenWeatherMap、舊版 Electron 或舊主題切換。這些需求尚未在本次文件更新中重新審定，不能直接當作目前實作或驗收結果。
