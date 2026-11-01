# Proposal

## Why

實機使用回饋指出三個問題：時鐘位置偏上、預報圖示在 Raspberry Pi 7 吋面板上辨識不足（彩色 emoji 在 20–24px 下無法分辨多雲系列），以及 Light Theme 在該面板只呈現一片白、實際從未使用。使用者希望同時保留兩種候選版面並在實機比較，而非先行二選一。

此外，現行預報資料有兩項會產生錯誤顯示的缺陷。若不先修正，兩個版面的比較將建立在不可信的資料上，比較結果無法歸因於版面設計。

## What Changes

**版面與主題**

- **BREAKING** 移除 Light Theme，連同自動日夜主題切換（`getAutoThemeMode()`）與 `displayModeOverride` 狀態及其 `localStorage` 值。
- **BREAKING** 版面比例由 7:3（`grid-cols-10`）改為 6:4（左 480px／右 320px）。右欄內容區由 208px 增至 288px，預報圖示由 32px 放大至 40px、明後天圖示由 28px 放大至 34px。
- 新增兩個可切換的深色版面：`codex` 與 `claude`，兩者共用同一份資料與睡眠邏輯，差異在資訊排列與取捨。預設為 `codex`，選擇以新參數持久化。
- 控制項改為分段切換（兩個版面同時可見、當前段填色）加獨立睡眠膠囊，取代原本的循環按鈕。觸控高度 44px。
- 天氣圖示由彩色 emoji 改為單色線條圖示。
- 睡眠模式功能、按鈕與現行行為保留不變：仍自 `sleepMode.enabled`／`startHour`／`endHour` 設定判定（23／6 為預設值而非常數），仍保留 `sleepModeOverride === false` 的強制清醒邏輯且不在按鈕上開放，按鈕仍僅循環 Auto 與 On。

**資訊呈現規則（兩版共用）**

- 預報時距依資料來源的實際區間呈現。簡化後的預報列改為每個元素各自保留其來源區間；每格的區間由**共用層**依該格在共用資料契約下可取得的全部元素決定，取其中最粗者，採半開區間，**與任何變體的顯隱規則無關**。變體僅在格組成之後決定每個值是否可見，不得因此重組時間格。現行實作以逐時溫度列為主軸，再把涵蓋該時間點的三小時降雨機率複製進去，使逐時格子掛著三小時機率；此為同一回應內元素粒度不同所致，必須消除。短期預報固定四格，**畫面上不顯示總跨度標題或說明文字**——使用者已兩度指出此類文字干擾閱讀，每格標籤已足以識別其實際區間。
- 長文字一律截斷並以省略符號標示，不引入捲動、跑馬燈或展開操作。適用範圍含天氣描述、地區名、農曆與節氣、外出提示與異常訊息。
- 外出提示區同時承接異常提示：無異常時顯示外出提示，有異常時改顯示異常訊息並優先於外出提示，異常解除後恢復。不另設固定訊息區。

**兩版差異的保留範圍**

- 兩個版面各自依其設計稿決定資訊取捨；一方的規則不自動套用到另一方，以便比較實際差異。共用層只規範「資料是否可取得」，不規範「是否顯示」。
- 兩版的顯示差異明文寫入規格，可直接判定而不需回頭讀設計稿推測：Codex 不顯示今日高低溫與體感、降雨機率無隱藏門檻；Claude 顯示今日高低溫、降雨機率低於 20% 隱藏、體感僅在差距達 3 度或舒適度異常時顯示且版位固定。
- 共用且不得因變體而異者僅三項：預報時距對齊、提示區的正常／異常切換、控制項的位置與尺寸。

**資料正確性**

- 修正跨日邊界錯誤：今日高低溫與明後天預報改以本地日期比對，取代現行的 UTC 日期比對。現行實作在台灣時間 00:00–08:00 會使今日高低溫落空、明天與後天各錯一天。
- 修正每日預報圖示：改以當日 06:00–18:00 中降雨機率最高的時段產生，取代現行取當日第一個預報時段（約 00:00）的作法。
- 引入可判定的資料有效性狀態。現行實作在缺少 API 金鑰時直接返回，使畫面續用硬編碼的初始值（28°、晴時多雲）並被當成真實天氣；更新失敗亦僅留下一行 log。改為：未曾取得有效資料時以缺值呈現，不顯示初始值；「成功更新」須同時滿足回應可解析且涵蓋當下時段；數值 0 視為有效值而非缺值；定位失敗但有可用設定或快取位置時不視為異常；AI 建議未配置不視為天氣服務故障。

**資源與相依**

- 移除日出日落資料擷取（CWA `A-B0062-001`）。該資料在移除自動日夜切換後已無消費者。每次天氣刷新的 CWA 請求由 2 次降為 1 次。
- Noto Sans TC 完整隨應用打包，移除對 Google Fonts 的執行期網路相依。現行實作在開機無網路時會退回系統字體。不採字元子集化：AI 建議、CWA 天氣描述與定位解析出的地名皆為無法事先窮舉的動態文字，子集加系統 fallback 會使這些內容退回 Pi 系統字體，與指定字型的要求衝突。
- 架構調整：資料擷取與睡眠邏輯抽離為 composable，兩個版面各自成為獨立元件，取代現行單一 888 行元件。

**文件**

- 設計稿納入版控，置於 `docs/theme/v2/`。記錄 v1 為 7:3、v2 為 6:4。
- 更新 `openspec/config.yaml` 的 `context`：現載明的技術堆疊與套件管理工具與實際不符，會導致產出錯誤的驗證指令。

## Capabilities

### New Capabilities

- `layout-variant`: 應用以具名版面變體呈現同一份資料的能力。涵蓋目前的 `codex` 與 `claude` 兩個變體、其共通的 6:4 版面骨架、各自的資訊取捨規則，以及新增變體時的約束（共用資料來源、共用控制項位置）。

### Modified Capabilities

- `control-panel`: 兩條 requirement 皆明文綁定 `displayModeOverride` 的 `light`／`dark` 取值與其持久化。改為版面變體狀態（預設 `codex`）與睡眠狀態的分離與持久化，並定義舊 `displayModeOverride` 值的處理。
- `time-station`: 「Split Layout」明訂 7:3 與 10 欄 Grid；「Theme Modes」明訂 Light／Dark／Sleep 三模式；「Smart Mode Switching」明訂依時段自動切換並循環 Auto → Light → Dark → Sleep；「Weather Data Integration」仍記載 OpenWeatherMap（實作已改用中央氣象署）；「iOS Style Weather Display」的小時預報未含降雨機率、當前區塊固定顯示體感溫度；「Date and Calendar」要求顯示干支年。上述皆需改寫，並新增跨日邊界與每日預報代表時段的正確性要求。
- `ai-weather-advisor`: 「Contextual Prompts」以「Light or Dark mode」作為一般模式提示的判定條件。Light Theme 移除後該條件需改寫為以非睡眠狀態判定。

## Impact

**Renderer（`src/`）**

- `src/components/TimeStation.vue`（888 行）：拆分為 composable 與兩個版面元件。移除 `getAutoThemeMode()`、`parseSunTime()`、`weather.sunrise`／`weather.sunset`、`displayModeOverride` 相關狀態與樣式分支。修正 `toISOString()` 日期比對與每日預報圖示取值。
- `src/services/CWAWeatherAPI.js`：移除 `getSunriseSunset()`、`_parseSunriseSunset()`、`_getTodayString()`、`_getAfterDaysString()`。**保留 `_formatDate()`** — 跨日邊界修正需使用它。
- `src/services/WeatherCodeMapper.js`：emoji 圖示改為單色線條圖示資產。
- `src/services/CWAWeatherAPI.example.js`：示範已移除的日出日落 API，需同步更新。
- `src/index.css`：`-webkit-font-smoothing` 在 Linux/Chromium 無作用，隨字型調整一併處理。

**Configuration**

- `src/defaultConfig.js` 與 `config.json`：移除 `display.darkModeStart`／`darkModeEnd`（原為自動主題切換的 fallback）。`sleepMode.startHour`／`endHour` 不受影響。
- `localStorage`：新增版面變體鍵；既有 `displayModeOverride` 鍵作廢。

**Electron main process（`electron/`）**

- 無行為變更。視窗仍為 800×480 kiosk。

**Build / assets**

- `index.html`：移除 Google Fonts 的 `preconnect` 與 stylesheet 連結。CSP 的 `font-src 'self'` 已允許自行打包的字體，無需調整 CSP。
- 新增字體資產至打包流程；需評估中文字體體積對 AppImage 的影響。

**Hardware / kiosk 影響**

- 面板為 800×480，色階與彩度有限。單色線條圖示與移除 Light Theme 皆為針對此限制。
- 移除一次 CWA 請求可降低網路與 API 配額用量。
- 字體改為本機載入可消除開機無網路時的字體退回。
- 以上皆尚未在實機驗證，驗收需在 Raspberry Pi 上確認。

**Documentation**

- 新增 `docs/theme/v2/`，納入 `desgin-codex-v4.svg`、`design-claude-v4.svg`、`design-claude-64.svg`。
- `openspec/config.yaml` 的 `context` 更新為實際堆疊。
