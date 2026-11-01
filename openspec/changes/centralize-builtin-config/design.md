# Design

## Context

動機見 `proposal.md` - Why；行為契約見 `specs/builtin-defaults/spec.md` 與
`specs/time-station/spec.md`。本節只記錄影響做法的現況。

**現有的 fallback 寫法不一致**，而這是「集中化」真正要解決的問題：

| 位置 | 寫法 | 缺值時解析到 |
| --- | --- | --- |
| `useWeatherStation.js:114` | `configured \|\| DEFAULT_STALE_THRESHOLD_MS` | `dataState.mjs:21` 的常數 |
| `useWeatherStation.js:288` | `(...) \|\| 24 * 60 * 60 * 1000` | 取用處的字面值 |
| `useWeatherStation.js:447` | `(...) \|\| 1800` | 取用處的字面值 |
| `sleepState.mjs:24` | `unref(sleepConfig) \|\| DEFAULT_SLEEP_CONFIG` | 整個物件的常數 |
| `sleepState.mjs:27` | `config.enabled !== false` | **不解析到任何常數** |
| `sleepState.mjs:28-29` | `config.startHour ?? DEFAULT_SLEEP_CONFIG.startHour` | 常數（寫法正確） |

`sleepState.mjs:27` 是關鍵：`enabled` 缺值時得到 `true`，但這個 `true` 來自 `!== false` 這個
運算式本身，而非 `DEFAULT_SLEEP_CONFIG.enabled`。把 `DEFAULT_SLEEP_CONFIG.enabled` 改成
`false` 對該路徑毫無影響——它是幽靈預設。因此**只搬移常數宣告不會達成單一來源**，必須
逐一改寫 fallback 運算式。

`sleepState.mjs:28-29` 已正確使用 `??`，顯示 `startHour: 0`（午夜）為合法值這點在原實作中
已被考慮過；改寫時不得退回 `||`。

**載入契約已被測試保護但無規格依據。** `ConfigManager` 的 `loadConfig` 是唯一有外部呼叫者
的方法，且 `useWeatherStation.js:57` 的 `configManager` 參數是全部 station 測試的掛載點。
`deepMerge` 目前仍由 `loadConfig` 呼叫，只在移除外部合併後才成為可刪邏輯。

**主進程不參與設定載入**，`electron/` 無須變更。`.env` 的 `VITE_*` 憑證在建置時由 Vite 注入
bundle，與本變更無關，不碰。

## Goals / Non-Goals

**Goals:**

- 每個保留的預設值只有一個定義點，且所有缺值路徑實際解析到它（可用「改來源即改行為」驗證）。
- 保留載入契約的可觀察行為，而非保留特定的函式簽章形式。
- `.env` 與 `localStorage` 兩層的現有行為與優先序完全不變。

**Non-Goals:**

- 不引入任何執行期設定機制（檔案、IPC、protocol handler、localStorage 設定）。
- 不改變 `ConfigManager` 之外的模組介面，除了其預設值來源。
- 不處理 `AIWeatherAdvisor` 的 `|| 0` 算術保護（`:164`、`:168`、`:178`）——那些是防止
  undefined 進入 `Math.abs` 的保護，不是設定預設值。
- 不統一 `localStorage` 的存取方式。`AIWeatherAdvisor.js:116` 直接使用全域 `localStorage`
  而未經注入縫，屬既有問題，不在本次範圍。

## Decisions

### D1：集中來源為 `src/defaultConfig.js`，由各模組 import（而非反向組裝）

**理由不是偏好，而是 import graph：** 反向做法（`defaultConfig.js` 從各模組 import 常數）會讓
`defaultConfig.js` 透過 `AIWeatherAdvisor.js` 傳遞性地 import `@langchain/openai` 與
`@langchain/google-genai`。設定值的定義檔不應把 LLM SDK 拉進自己的 import graph——任何
import `defaultConfig.js` 的地方都會付這個代價。

`defaultConfig.js` 目前無任何 import，是葉節點。模組 import 它不會成環。

**替代方案：** 新增第三個檔案（例如 `src/constants.mjs`）讓兩邊都 import。不採用：
`defaultConfig.js` 已經是為此目的存在的檔案，再加一層只是把同一件事換個名字。

**代價：** `sleepState.mjs`、`dataState.mjs`、`locationSource.mjs` 目前除 `vue` 外無依賴，
改後會依賴 `defaultConfig.js`。因該檔為無依賴的葉節點，純函式的可獨立測試性不受實質影響。

### D2：`enabled` 的 fallback 改為 `??`，與同群組的另兩個值對稱

```
現行：enabled: config.enabled !== false
改為：enabled: config.enabled ?? <集中來源>.sleepMode.enabled
```

**行為保持檢查：** 以 `enabled` 預設為 `true` 計算，兩種寫法對所有實際可能的輸入結果相同：

| 輸入 | `!== false` | `?? true` | 一致 |
| --- | --- | --- | --- |
| `undefined`（缺值） | `true` | `true` | 是 |
| `null` | `true` | `true` | 是 |
| `true` | `true` | `true` | 是 |
| `false` | `false` | `false` | 是 |

差異只出現在 `0`、`''`、`NaN` 這類非布林輸入。移除外部設定後，此值的唯一來源是集中預設
與測試替身，不存在這類輸入。既有 spec 的「Sleep Disabled By Configuration」情境
（`enabled` 為 `false` 時不自動進入睡眠）在 `??` 下仍成立。

### D3：`||` 改 `??` 的判準是「0 是否為該設定的合法值」，逐項決定而非全面替換

不全面替換，因為 `||` 在某些位置是刻意的保護：

| 設定 | 0 的語意 | 決定 |
| --- | --- | --- |
| `sleepMode.startHour` / `endHour` | 午夜，合法 | 維持 `??`（現已正確） |
| `sleepMode.enabled` | 不適用（布林） | 改 `??`，見 D2 |
| `geolocation.enabled` | 不適用（布林） | 改 `??`，見 D2 補充 |
| `weather.updateInterval` | 0 秒刷新週期，會造成忙碌迴圈 | 維持 `||`，並在集中來源註明 0 不是合法值 |
| `weather.staleThresholdMs` | 0 表示資料立即過期 | 改 `??`。該值目前由 `dataState.mjs` 的異常判定使用，0 是可表達的意圖 |
| `cache.location.duration` | 0 表示快取一律不算新鮮，每次重新定位；定位失敗時仍採用過期快取作為後備，**不是停用快取** | 改 `??`。0 是可表達的意圖 |
| `cache.aiAdvice.duration` | 0 表示快取立即過期，每次刷新都重新請求 | 新接線，直接用 `??` |

本表為 design 層的判定依據；實際逐行盤點與改寫列入 tasks。
完整盤點結果見 `fallback-inventory.md`（task 1.1 產出，14 個設定 fallback、6 個排除項）。

### D6：`location` 的 city 與 district 是相依欄位，不能純逐欄繼承

`location` 群組不適用「每個欄位各自退回集中來源」的規則，因為 `district` 只在它所屬的
`city` 之下有意義。規則分三層：

| 設定提供的內容 | city | district |
| --- | --- | --- |
| 兩者皆無 | 集中來源 | 集中來源 |
| 只有 `district` | 集中來源 | 設定值（顯式） |
| 只有 `city`，與集中來源**同城** | 設定值 | 集中來源 |
| 只有 `city`，與集中來源**不同城** | 設定值 | **空字串** |
| 兩者皆有 | 設定值 | 設定值（顯式，不受同城限制） |
| `district: ''` 顯式空字串 | 依上列 | 空字串（`??` 保留顯式空字串） |

同城判斷使用 `TaiwanLocationResolver` 匯出的 `isSameCity(regions, a, b)`。它**沿用該模組
既有的 `matchesLocation`**，把兩個名稱各自對應到 `regions` 內的縣市後比較，因此中文
（台／臺，經 `normalizeChinese`）與英文別名（`Taipei`／`Taipei City`，經 `normalizeEnglish`
去除 city／county 等詞綴）都認得。兩者都對應不到任何縣市時，退回中文正規化後的字面比較。

**不可限縮為中文比對。** `cityEngName` 的英文別名支援是 `TaiwanLocationResolver` 既有能力：
`{city:'Taipei'}` 本來就會被解析為臺北市，若同城判斷只認中文，該設定就會與集中來源的
臺北市被判為不同城而丟掉缺值區名。此限縮由 mutant X 驗證會被測試擋下。

正規化規則只在該模組定義一次，呼叫端不重寫，也不新增資料來源。

**不能靠 `resolveTaiwanLocation` 代替這個限制。** 它只檢查區名是否存在於該城市的
`areaList`：

```
{city:'臺中市', district:'內湖區'} -> {city:'臺中市', district:''}      // 內湖區僅臺北市有
{city:'基隆市', district:'中正區'} -> {city:'基隆市', district:'中正區'} // 兩市皆有中正區
```

第二例會把臺北市的預設區名接到基隆市上。本限制曾因第一例而被誤判為多餘並移除
（mutation 存活），實際是測試資料只用了臺北獨有的區名；R02 以「中正區」補上有效案例後
確認必要，已恢復。

本規則只作用於 `configured` 這個來源，不改變 `locationSource` 的取用順序，
也不影響即時定位與快取定位的結果。對應規格見
`specs/builtin-defaults/spec.md` 的 Dependent Settings Resolve As A Unit。

### D2 補充：`geolocation.enabled` 是同類缺陷，但隱含值與宣告值相反

task 1.1 盤點時發現 `useWeatherStation.js:289-290`：

```js
const geolocationEnabled = Boolean(
  loadedConfig.geolocation && loadedConfig.geolocation.enabled
);
```

缺值時 `Boolean(undefined)` 為 `false`，而集中來源宣告的是 `true`。這與 D2 的
`sleepMode.enabled` 同屬幽靈預設，但方向相反：`sleepMode.enabled` 的隱含值恰好與宣告值
一致（都是 `true`）所以不易察覺，`geolocation.enabled` 的隱含值則與宣告值矛盾。

`locationSource.mjs:34` 另有第三處定義（預設參數 `geolocationEnabled = true`），其值與
上述隱含效果矛盾；該預設只對直接呼叫者生效，因 `useWeatherStation.js:314` 總是顯式傳入。

改為 `loadedConfig.geolocation?.enabled ?? <集中來源>.geolocation.enabled`。
既有測試全部顯式給 `geolocation: { enabled: false }`，不受影響。

### D4：`ConfigManager` 保留為載入介面，不刪除

移除 `fetch` 與合併後，`loadConfig` 的職責縮減為「回傳集中來源」，但**保留該方法與其
可注入性**。理由是規格化的載入契約（`specs/builtin-defaults/spec.md` 的
Configuration Load Timing Contract）需要一個可被替換的載入點才能驗證「設定未解析時
時鐘仍前進」與「卸載後不建立排程」。

契約是實際的 Promise／等待行為，不是 `async` 關鍵字。實作可自由選擇如何回傳 thenable，
只要上述兩個情境成立。

**可刪除：** `deepMerge`（移除合併後才失去呼叫者）、`get`、`set`、`saveConfig`、`reset`。

**替代方案：** 完全刪除 `ConfigManager`，讓 `useWeatherStation` 直接 import 集中來源並改為
同步。不採用：會同時失去設定注入縫、缺值 fallback 的驗證點與非同步時序的驗證點，
而這三者都是已規格化的行為。

### D5：`AIWeatherAdvisor` 以建構子參數接收快取時效

`AIWeatherAdvisor` 目前以 `new AIWeatherAdvisor(provider, apiKey)` 建構
（`useWeatherStation.js:59` 的 `createAdvisor`），不接收設定。兩種接線方式：

| 方式 | 評估 |
| --- | --- |
| 建構子增加參數，由 `createAdvisor` 傳入 | 已載入的有效值由呼叫端傳入；服務仍 import 集中來源，供省略參數時的後備使用。測試替身須同步支援第三參數 |
| 服務直接 import 集中來源 | 不動簽章；但使服務依賴設定檔形狀，且與 D1 的 import 方向一致性較差 |

採**建構子參數**，並為該參數提供取自集中來源的預設，使既有以兩個參數建構的呼叫端
（含測試替身）行為不變。這讓「1 小時」仍只定義在集中來源一處。

## Risks / Trade-offs

- **改寫 fallback 運算式可能意外改變行為** → D2 的輸入對照表與 D3 的逐項判準是為此而寫。
  每個改寫的 fallback 都需有一個「改來源即改行為」的檢查，而非僅斷言當前數值。
- **測試可能以當前數值而非來源斷言** → 既有測試如
  `tests/stationIntegration.test.mjs:51-61` 斷言 timer 為 `1800000`。這類斷言在集中化後
  仍會通過，卻不證明值來自集中來源。需新增至少一個「改變集中來源後結果隨之改變」的檢查。
- **移除 10 個欄位可能被誤解為功能變更** → 這些欄位無功能消費者，移除不改變行為。
  （原始盤點為 11 個無消費者欄位，其中 `cache.aiAdvice.duration` 依 D-002 改為實際生效而保留，
  故實際移除 10 個。）
  文件與 commit 訊息須明確說明，特別是 `ai.enabled`：移除它**不是**停用或啟用 AI。
- **開發模式行為改變** → 現在開發模式下 `config.json` 是有效的（Vite dev server 會送出該檔）。
  移除後開發與正式一致。因兩份內容目前相同，實際觀察不到差異，但這是有意的行為調整，
  須在文件說明。
- **`defaultConfig.js` 成為更多模組的依賴** → 若日後該檔需要 import 任何東西，影響面會比
  現在大。緩解：在該檔註明它必須保持為無依賴的葉節點。

## Migration Plan

無資料遷移。`localStorage` 的既有值（版面選擇、睡眠覆寫、位置快取、AI 建議快取）
**不清除、不遷移**，繼續沿用。

部署即一般的重新建置與部署流程。回退方式為部署前一版 AppImage；由於無持久化狀態變更，
回退不需額外處理。

使用者端的唯一實質變化：專案根目錄不再有 `config.json`，修改內建值需重新建置。
此點須寫入 `proposal.md` - Impact 所列的文件落點。

## Open Questions

- `openspec/config.yaml` 的 `context` 目前要求「preserve ConfigManager/defaultConfig/config.json
  boundaries」，與本變更直接衝突。該檔須更新，但新的措辭要如何表述「集中內建預設、
  無執行期設定」才不會在未來誤導，可在 tasks 執行時決定，不影響本設計的做法。
