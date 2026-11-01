# Design

## Context

動機見 `proposal.md` — Why。需求契約見 `specs/`。

現況約束：

- `src/components/TimeStation.vue` 為單一 888 行元件，同時承擔時間、農曆、天氣擷取、IP 定位、AI 建議與主題樣式。再加入第二套版面會使其不可維護。
- 樣式分支集中於 `getModeClass(sleepClass, darkClass, lightClass)`，三態寫死在函式簽章中。
- `CWAWeatherAPI._extractForecastData()`（`:229-265`）以 `溫度` 元素為基準建立簡化列，再用 `_findValueByTime()` 把涵蓋該時間點的其他元素值複製進同一列。簡化列只保留 `startTime`／`endTime`（取自溫度元素），**不保留各元素自身的來源區間**。因此逐時溫度列會夾帶三小時降雨機率，且下游無從得知該機率的實際區間。
- `溫度` 近期為逐時、遠期轉為逐三小時（同檔 `:242` 註解載明）；`3小時降雨機率` 以 `StartTime`／`EndTime` 區間提供。兩者粒度在同一回應內即不相同。
- 自動睡眠讀取 `ConfigManager.get('sleepMode.enabled')` 與 `{startHour, endHour}`，23／6 為 `defaultConfig.js` 的預設值而非常數。`isSleepMode` 另處理 `sleepModeOverride === false` 的強制清醒，`sleep-control` 主規格明文要求保留該邏輯並僅於按鈕隱藏 Off。
- Electron 主進程僅負責建立 800×480 kiosk 視窗，不參與資料或呈現。
- CWA API key 來自 `import.meta.env.VITE_CWA_API_KEY`，由 renderer 使用；本變更不新增任何金鑰，亦不改變金鑰邊界。

## Goals / Non-Goals

**Goals:**

- 讓兩個版面變體並存且可在執行期切換，彼此的顯示規則互不污染。
- 將資料擷取與模式判定抽離呈現層，使新增變體不需複製資料邏輯。
- 消除「以較細粒度呈現較粗來源資料」的時間語意錯誤。
- 把規格中仍需具體方法的項目定下來：時距對齊與代表值、每日代表時段、異常狀態判定與解除。

**Non-Goals:**

- 不調整睡眠模式的判定來源、設定項或按鈕循環行為。
- 不改變 CWA 以外的資料來源，不新增 API 金鑰。
- 不實作實機 A/B 比較的量測或記錄機制。
- 不統一兩個變體的顯示規則。
- 不處理 `openspec/specs/time-station` 與 `ai-weather-advisor` 主規格的既有結構缺陷（見 Risks 與 tasks 1.2／1.3）。

## Decisions

### D1：資料與模式邏輯抽為 composable，變體為純呈現元件

採用 `useWeatherStation()`（天氣擷取、定位、AI 建議、時間與農曆）與 `useDisplayMode()`（睡眠判定、變體選擇與持久化）兩個 composable。兩個變體元件只接收資料並負責排版與自身的取捨規則。

替代方案：單一元件以 `v-if` 切換兩套模板。不採用的理由是元件已達 888 行，兩套模板將使其超過 1300 行，且兩版的樣式常數會混在同一個作用域，違反「一方規則不自動套用另一方」的要求。

**接線落點**：兩個 composable 的組合（建立、把睡眠狀態回傳給資料層、睡眠切換時更新提示語氣）集中於 `src/composables/useStation.js`，而非 `TimeStation.vue` 的 setup。理由是接線本身需要被測試：SFC 無法在 node 下載入，接線若留在 setup 內，該層的缺陷只能靠閱讀程式發現。`TimeStation.vue` 僅保留呈現與變體選擇。

為使產品模組可被整合測試載入，另作兩項調整：`taiwan-regions.json` 的匯入改用 import attributes；`import.meta.env` 的讀取收斂為單一常數（Node 下為空物件而非丟錯）。兩個 composable 並提供可選的 deps（env、configManager、createWeatherApi、createAdvisor、storage、timers、clock），預設為真實實作。

**時間來源**：畫面、成功判定與 `lastSuccessAt` 一律取用同一個時鐘；資料層不得另行呼叫 `Date.now()`。

主進程職責不變；全部變更位於 renderer。

### D2：變體以具名字串選擇，預設 `codex`

狀態值為 `'codex' | 'claude'`，`localStorage` 鍵為 `layoutVariant`。未知值或缺值一律回退 `codex`。

舊鍵 `displayModeOverride` 不讀取、不遷移、不刪除。不遷移的理由：舊值的語意（light／dark／auto）在新模型中沒有對應項，任何映射都是臆測；不刪除的理由是避免對使用者的 `localStorage` 做非必要的破壞性操作，孤立鍵無副作用。

既有 `control-panel` 的 Persistence 契約要求兩個狀態皆持久化，沿用該契約並改用新鍵。

### D3：簡化預報列保留各元素的來源區間，顯示時距取最粗者

`_extractForecastData()` 的輸出改為每個元素各自攜帶其來源區間，而非只有一個取自溫度的時間：

```
{
  temperature:       { value, intervalStart, intervalEnd },
  weatherCode:       { value, intervalStart, intervalEnd },
  rainProbability:   { value, intervalStart, intervalEnd },
  ...
}
```

顯示層依下列規則組成一格：

1. 共用層取該格**可取得的全部元素集合**，即共用資料契約所列的元素，**與任何變體的顯示規則無關**。變體是否顯示某個值，不參與這一步。
2. 格的區間 = 該集合中**最粗**的元素區間，採半開區間 `[start, end)`。若全部元素皆為逐時，格即為逐時。
3. **區間涵蓋**（適用於粒度不細於格的元素，例如三小時格中的三小時降雨機率）：該元素自身的區間必須涵蓋整個格；僅部分重疊者不得放入該格。
4. **代表值取樣**（適用於粒度細於格的元素，例如三小時格中的逐時溫度）：取格起點的來源值。天氣代碼同。此為明定的取樣規則，不是宣稱該值代表整個區間。

   第 3 與第 4 點適用於互斥的兩類元素，不互相否定：粗粒度元素談涵蓋，細粒度元素談取樣。
5. 標籤：區間為 1 小時顯示該小時；長於 1 小時顯示起訖。
6. **最後**才由變體決定每個值是否可見。顯隱、門檻與切換版型 MUST NOT 重新計算格的起訖、數量或代表值。

因此當溫度為逐時、降雨機率為三小時時，格的區間一律為三小時——**即使某個變體因門檻而不顯示該格的降雨機率**。反例說明：同份來源溫度與天氣逐時、降雨為 `[15:00,18:00)` 的 10%，若先依變體顯示規則選元素，Claude 會因 20% 門檻排除雨率而退回逐時格，與 Codex 的三小時格不一致，兩版的格起訖與代表溫度就會不同，使用者的比較不再只反映資訊取捨。第 1 步與第 6 步的順序即為避免此情形。

格數固定為 4，起點為涵蓋當下的格。依據是版面可讀性預算而非沿用舊稿：右欄內容區 288px，四欄時每欄 72px，可容納 40px 圖示加 22px 氣溫與 16px 降雨機率；五欄以上每欄降至 57px 以下，與本變更放大圖示的目的相衝突。

**不在畫面顯示總跨度**。使用者已兩度指出區塊標題與區間說明文字干擾閱讀，D-001 據此移除；每格標籤已足以識別其實際區間。總跨度僅寫入文件與資料描述。

替代方案一，以降雨區間為唯一基準切格：來源若全為逐時則浪費可用粒度。替代方案二，格內溫度取區間最大值：對「會不會熱」較有利，但與 CWA 三小時產品的語意不符，且在混合粒度下會與來源的三小時值不一致。兩者皆不採用；區間起點取值與來源語意一致且可判定。

### D4：每日預報的代表時段為當日 06:00–18:00

天氣代碼取該區間內降雨機率最高之時段的代碼；若所有時段降雨機率相同，取該區間第一個時段。降雨機率取該區間最大值。高低溫仍取全日所有時段。

以降雨機率最高者為代表，是因為使用者回報的實際需求是判斷是否需要帶傘；取當日第一個時段（現行作法，約 00:00）既非白天也不具代表性。

替代方案：取出現次數最多的天氣代碼。不採用，因為短暫但關鍵的降雨會被多數的晴朗時段掩蓋。

### D5：跨日分組改用本地日期

沿用 `CWAWeatherAPI._formatDate()` 產生本地 `YYYY-MM-DD`，取代 `TimeStation.vue` 三處的 `toISOString().split('T')[0]`。`_formatDate()` 在移除日出日落相關函式後仍須保留。

此為行為變更，依 `docs/agent-protocol.md` 採 test-first。

### D6：資料有效性與異常狀態

引入可判定的資料狀態，取代現行「有無 key」與「try/catch」的二分：

| 狀態 | 判定 | 解除 |
| --- | --- | --- |
| `never` | 自啟動以來未曾處理過成功回應（含缺 key、key 遭拒、空或無效回應） | 任一次成功更新 |
| `stale` | 曾成功，但距最後一次成功更新超過門檻，或最新回應不涵蓋當下時段 | 取得涵蓋當下時段的成功更新 |
| `located` / `unlocated` | 定位失敗且無設定位置亦無快取時為 `unlocated` | 取得可用位置 |

「成功更新」定義為：請求完成、回應可解析、且解析後存在涵蓋當下時段的預報列。僅 HTTP 200 不足以構成成功。

`never` 狀態下天氣值一律以缺值呈現，**不使用 `weather` 物件的初始硬編碼值**；該初始值改為缺值語意。數值 0（0°C、0%）為有效值，以非空值判定而非 falsy 判定；「有效」只決定它不是缺值，**是否顯示仍由變體的顯示規則決定**——Codex 會顯示 0%，Claude 因 20% 門檻而留空，兩者都不把它當缺值。

異常提示優先順序：`never` > `stale` > `unlocated`。各異常各自解除，互不連動。

**過期狀態下的保留範圍**：`current` 與短期預報的時間格保留最後一組有效值，使畫面仍有內容可看；`today` 與 `daily` 則一律依**現在的本地日期**從保留的 series 重新取值，無對應資料即為缺值。兩者不同的理由是每日列帶有日期語意——若連同快照凍結，跨日之後舊日期的資料會被重新叫成「明天／後天」。

`never`（從未成功）與「曾成功後過期」必須區分：前者一律缺值且不顯示任何內建預設值；後者保留最後已知值並以提示區說明資料已過期。

AI 建議服務未配置或呼叫失敗**不構成天氣資料異常**，僅使提示區回到預設訊息。

門檻值 90 分鐘：刷新週期為 30 分鐘，單次失敗屬常態網路抖動，連續三次才代表持續性問題。該值置於設定，不寫死。

### D7：圖示以 inline SVG symbol 提供

單色線條圖示定義為 `<symbol>` 並以 `<use>` 引用，顏色由 `currentColor` 繼承。不引入圖示套件。

`symbol` 的 `viewBox` 必須保留足夠內距，使**含筆畫寬度**的圖形完整落在可視範圍內。現有的 Claude 圖示組使用 `0 0 24 24`，雲弧頂點約在 y≈0，加上 stroke-width 2 的外擴 1 單位後達 y≈-1，會被裁切；`ic-thunder`、`ic-shower` 因雲體再上移而更嚴重。Codex V4 已以 `-2 -2 28 28` 修正同一問題，共用資產沿用該作法或等效修正。

驗收以**筆畫實際範圍**為準，不能只檢查 symbol 的框寬高——框正確但筆畫仍可能溢出。

替代方案：圖示字型。不採用，因為會重新引入字型載入相依，與本變更移除外部字型相依的方向相反。

### D8：打包完整 Noto Sans TC

隨應用打包完整的 Noto Sans TC variable font，不做字元子集化。移除 `index.html` 的 Google Fonts `preconnect` 與 stylesheet 連結，以 `@font-face` 指向打包後的本地檔案。CSP 的 `font-src 'self'` 已允許，不需調整 CSP。

不採用子集化的理由：畫面上的動態文字（AI 建議、CWA 天氣描述、IP 定位解析出的地名）無法事先窮舉。靜態子集加系統 fallback 會使這些內容退回 Pi 的系統字體，與「指定使用 Noto Sans TC」及「離線時全部文字使用隨附字型」兩項要求直接衝突。完整打包是唯一能同時滿足兩者且可驗證的方案。

代價為 AppImage 體積增加；該字型為 SIL Open Font License，允許隨應用散布，授權檔一併納入。

### D9：文字溢出以 CSS 截斷

單行以 `text-overflow: ellipsis` 搭配 `overflow: hidden`、`white-space: nowrap`。不使用 JavaScript 量測或動態縮放字級。適用範圍包含天氣描述、地區名、農曆與節氣、外出提示與異常訊息。

外出提示區在兩個變體中同寬（左欄 480px 扣除左右各 16px，可用 448px，19px 全形字約 23 字），AI 字數限制為一般 22 字、睡眠 20 字且不因變體而異。兩份設計稿原本的 360px／280px 未沿用——該差異是稿件的裝飾性幾何而非資訊取捨，會使同一段文字在同一塊面板上有兩種可用寬度。理由與使用者依據詳見 `docs/theme/v2/README.md`。

### D10：變體的顯示規則屬各變體所有

共用層只負責「資料是否可取得」，不規定「是否顯示」。各變體的顯示規則（Codex 不顯示今日高低溫與體感、降雨機率無門檻；Claude 顯示今日高低溫、降雨機率 20% 門檻、體感條件顯示且版位固定）寫入 `specs/layout-variant/spec.md`，可直接由 artifact 判定，不需回頭讀 SVG 推測。

驗證以同一組資料同時檢查兩個變體，確認刻意的差異確實出現。

### D11：睡眠行為完全沿用現行契約

`useDisplayMode()` 繼續自設定讀取 `sleepMode.enabled`、`startHour`、`endHour`，23／6 維持為預設值而非常數。`sleepModeOverride` 的型別維持 `null | true | false`，保留 `false` 的強制清醒邏輯；按鈕仍僅循環 Auto 與 On，不新增喚醒 UI。

此為既有 `sleep-control` 主規格的明文要求，拆分不得改變它。

## Risks / Trade-offs

- **主規格結構缺陷會阻擋 archive** → `openspec/specs/time-station/spec.md` 與 `ai-weather-advisor/spec.md` 的 requirement 位於自訂 H2 之下而非單一 `## Requirements` 區段。`openspec validate` 回報 archive 會拒絕本變更的 delta。已列入 tasks 1.2／1.3；在該任務完成前不可 archive。
- **完整字型使 AppImage 變大** → 刻意接受。替代方案會犧牲動態文字的一致性，與明示要求衝突。體積於 task 8.3 量測並記錄。
- **三小時粒度使四格跨度達 12 小時** → 每格標籤已標示其區間，不再暗示逐時精度。若實機使用後仍嫌跨度過長，可改為減少格數，屬後續調整。
- **兩個變體的樣式重複** → 刻意接受。D-008 要求兩版可獨立演化，過早抽出共用樣式會使一方的調整波及另一方。
- **拆分元件的迴歸風險** → 拆分本身不改變行為，以現有 `tests/` 與開發模式人工驗證為界；行為變更（D3、D4、D5、D6）另有測試。
- **改動 `_extractForecastData()` 輸出結構會影響既有取用端** → 取用端為三處：`TimeStation.vue` 的天氣更新流程、AI prompt 組裝，以及 `CWAWeatherAPI.example.js`（`:26-32`、`:53-54`、`:126-132` 直接讀取 scalar 的 `temperature`／`feelsLike`／`weather`／`rainProbability`／`humidity`）。三處皆須隨結構變更同步，否則範例與 AI 示例會繼續讀舊結構。

## Migration Plan

1. 先行拆分 composable 與變體元件，行為維持與現行一致（仍為 7:3、仍有 Light Theme），確認無迴歸。
2. 套用 6:4 版面骨架與共用控制項，移除 Light Theme 與日出日落。
3. 改造 `_extractForecastData()` 的輸出結構並修正資料正確性（D3、D4、D5）。
4. 實作資料狀態與異常提示（D6）。
5. 套用兩個變體各自的設計稿與顯示規則（D10）。
6. 字型打包（D8）。

回退策略：本變更不改變外部介面，`localStorage` 舊鍵未刪除，回退至前一版本即可恢復原行為。

## Open Questions

- 時鐘字重在實機上以 500 或 700 較易讀。設計稿採 500，現行實作為 700。此為單一 CSS 值，可在實機確認後調整，不影響規格、方法或任務拆解。
