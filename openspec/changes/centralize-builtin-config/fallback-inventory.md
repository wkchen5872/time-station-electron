# Fallback 盤點（task 1.1 產出）

盤點日期：2026-11-01。基準：`e17f867`。

搜尋命令（全部命中都已列入下表或在「排除項」說明）：

```bash
# 初版（R01 前）——只搜 fallback 運算子與設定讀取點
grep -rn "|| DEFAULT\|?? DEFAULT\|!== false\|!== true\|?? [0-9]\|?? '" src/
grep -rn "|| [0-9]\|||$" src/
grep -rn "??" src/
grep -rn "config\.value\.\|loadedConfig\.\|loaded && loaded\." src/

# R01 補充——預設參數與硬編碼地區名
grep -rnE "^\s+[a-zA-Z_]+ = [0-9]|^\s+[a-zA-Z_]+ = [0-9]+ \*|= true,$|= false,$|= '[^']*',$" src/
grep -rn "臺北市\|台北市" src/
```

## 初版盤點的方法缺陷（R01 揭露）

初版只搜「fallback 運算子」（`||`、`??`、`!== false`）與「以 `config.` 開頭的讀取點」，
因此漏掉兩類：

1. **預設參數帶字面算式**，例如 `weatherIntervalMs = 30 * 60 * 1000`。該行不含任何
   fallback 運算子，也不提及 `config`，兩組 grep 都不命中。
   （`locationSource.mjs` 的 `cacheDuration = 24 * 60 * 60 * 1000` 之所以被抓到，
   是因為同檔另有 `config` 讀取點而被一併檢視——屬運氣，不是方法奏效。）
2. **硬編碼的地區名**，例如 `|| '臺北市'`，字串字面值不在數值 grep 的範圍內。

修正後的方法加上上方兩條 grep。對應補正見下表 #15–#18。

## 設定缺值 fallback

| # | 設定路徑 | 位置 | 現行運算式 | 缺值時解析到 | 0 是否合法 | 決定 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `sleepMode`（整個物件） | `useWeatherStation.js:109` | `(config.value && config.value.sleepMode) \|\| null` | `null`，再由 #2 接手 | 不適用 | 改為解析自集中來源 |
| 2 | `sleepMode`（整個物件） | `sleepState.mjs:24` | `unref(sleepConfig) \|\| DEFAULT_SLEEP_CONFIG` | `sleepState.mjs:14` 的常數 | 不適用 | 常數改為取自集中來源 |
| 3 | `sleepMode.enabled` | `sleepState.mjs:27` | `config.enabled !== false` | **不解析到任何常數（幽靈預設）** | 不適用（布林） | 改 `??`，見 design D2 |
| 4 | `sleepMode.startHour` | `sleepState.mjs:28` | `config.startHour ?? DEFAULT_SLEEP_CONFIG.startHour` | `sleepState.mjs:14` 的常數 | **是**（午夜） | 維持 `??`，常數改為取自集中來源 |
| 5 | `sleepMode.endHour` | `sleepState.mjs:29` | `config.endHour ?? DEFAULT_SLEEP_CONFIG.endHour` | 同上 | **是**（午夜） | 同上 |
| 6 | `weather.staleThresholdMs` | `useWeatherStation.js:112-114` | `configured \|\| DEFAULT_STALE_THRESHOLD_MS` | `dataState.mjs:21` 的常數 | 是（立即過期） | 改 `??`，常數改為取自集中來源 |
| 7 | `weather.staleThresholdMs` | `dataState.mjs:53` | 預設參數 `= DEFAULT_STALE_THRESHOLD_MS` | `dataState.mjs:21` 的常數 | 是 | 常數改為取自集中來源 |
| 8 | `weather.updateInterval` | `useWeatherStation.js:447` | `(...) \|\| 1800` | 取用處的字面值 | **否**（0 秒會造成忙碌迴圈） | 維持 `\|\|`，字面值改為取自集中來源 |
| 9 | `cache.location.duration` | `useWeatherStation.js:287-288` | `(...) \|\| 24 * 60 * 60 * 1000` | 取用處的字面值 | 是（快取一律不算新鮮；失敗時仍用過期快取，非停用快取） | 改 `??`，字面值改為取自集中來源 |
| 10 | `cache.location.duration` | `locationSource.mjs:32` | 預設參數 `= 24 * 60 * 60 * 1000` | 該處的字面值 | 是 | 改為取自集中來源 |
| 11 | `geolocation.enabled` | `useWeatherStation.js:289-290` | `Boolean(loadedConfig.geolocation && loadedConfig.geolocation.enabled)` | **不解析到任何常數（幽靈預設）** | 不適用（布林） | 改 `??`，見下方「1.1 新發現」 |
| 12 | `geolocation.enabled` | `locationSource.mjs:34` | 預設參數 `= true` | 該處的字面值 | 不適用 | 改為取自集中來源 |
| 13 | `location`（整個物件） | `useWeatherStation.js:308` | 直接傳遞 `loadedConfig.location` | 由 `locationSource.mjs:36` 的 `configured && configured.city` 判定 | 不適用 | 缺值時改為解析自集中來源 |
| 14 | `cache.aiAdvice.duration` | `AIWeatherAdvisor.js:32` | `this.cacheValidDuration = 60 * 60 * 1000` 直接賦值，無 fallback | 該處的字面值（設定欄位無消費者） | 是（不快取） | 新接線，見 design D5 |
| 15 | `weather.updateInterval` | `stationLifecycle.mjs:17` | 預設參數 `= 30 * 60 * 1000` | 該處的字面值 | 否 | **R01-F01**：改為 `defaultConfig.weather.updateInterval * 1000` |
| 16 | `cache.aiAdvice.duration` | `useWeatherStation.js` 的 `ensureAdvisor` | 只傳兩個參數，**完全忽略已載入設定** | 不適用（值到不了服務） | 是 | **R01-F02**：以 `??` 解析後作為第三參數傳入 |
| 17 | `location.city` / `district` | `useWeatherStation.js` 的 `resolveConfiguredLocation` | 原為整物件 `loadedConfig.location ?? defaultConfig.location` | 整物件；部分設定會得到無 city 的物件 | 不適用 | **R01-F06**：改為逐欄 `??` |
| 18 | `location.city`（天氣查詢後備） | `useWeatherStation.js` 的 `queryName` | `locationState.value.city \|\| '臺北市'` | 該處的字串字面值 | 不適用 | 改為 `defaultConfig.location.city` |
| 19 | `location.city`（無法識別時的後備） | `TaiwanLocationResolver.mjs:25` | `location.city \|\| location.state \|\| '臺北市'` | 該處的字串字面值 | 不適用 | 改為 `defaultConfig.location.city`，見下方分類 |

## R01 新增項目的說明

### #15 `stationLifecycle.mjs` 的週期預設——單位不同的第二個定義點

原值 `30 * 60 * 1000`（毫秒）與 `defaultConfig.weather.updateInterval`（1800 秒）
是同一個概念的兩份定義，**單位不同**。兩者數值恰好相等（1800000 === 30×60×1000），
所以不一致在任何測試或執行中都看不出來。

改為 `defaultConfig.weather.updateInterval * 1000`。預設刻意是純數值而非
`(config) => ...`：「設定值優先、缺值退回集中來源」的解析屬呼叫端（`useWeatherStation`）
職責，在此再寫一份會成為第三個定義點。

### #16 `ensureAdvisor` 忽略已載入的設定值

`cache.aiAdvice.duration` 原本只被 `useWeatherStation` 的**預設工廠**讀取（且直接讀
`defaultConfig`），`ensureAdvisor` 以兩個參數呼叫 `createAdvisor`，所以**已載入設定的值
從未到達服務**。這不是幽靈預設，是消費者斷線。

改為在 `ensureAdvisor` 內以 `??` 解析（設定值優先、含 `0`），作為第三參數傳入；
預設工廠改為原樣轉傳該參數，`undefined` 時才由服務的預設參數退回集中來源。
兩參數呼叫維持相容（服務的預設參數處理 `undefined`）。

### #17 `location` 需逐欄而非整物件 fallback

原為 `loadedConfig.location ?? defaultConfig.location`。整物件 fallback 只在 `location`
整個缺失時生效；部分設定（例如只給 `district`）會得到沒有 `city` 的物件，
`locationSource` 的 `hasConfigured`（`Boolean(configured && configured.city)`）便判為
「無設定位置」，結果是 unknown 而非集中來源的城市。

改為逐欄 `??`。顯式的空字串（`district: ''`）是選擇而非缺值，`??` 會保留它。
本函式只影響 `configured` 這個來源，不碰 live IP 與快取定位的結果，
也不改變 `locationSource` 的來源優先序。

**跨城市限制：曾誤判為多餘而移除，R02 確認必要後已恢復。**

city 與 district 是相依欄位，district 只在其所屬 city 之下有意義，所以不能純逐欄繼承。
規則見 design D6。

過程記錄（保留，因為它說明了一個測試資料不足的錯誤）：

1. 初版加了「同城才繼承預設區名」的判斷。
2. mutant V（移除該判斷）**存活**，據此判定該判斷多餘並移除。當時的理由是
   `resolveTaiwanLocation` 會擋下跨城市組合。
3. 該理由只對「區名不存在於新城市」成立。R02 的 reviewer 以**兩市皆有的區名**重現：

```
{city:'臺中市', district:'內湖區'} -> {city:'臺中市', district:''}       // 內湖區僅臺北市有，被擋下
{city:'基隆市', district:'中正區'} -> {city:'基隆市', district:'中正區'} // 兩市皆有，未被擋下
```

   集中來源為 `{臺北市, 中正區}`、設定為 `{city:'基隆市'}` 時，會錯誤產生「基隆市中正區」。
4. mutant V 之所以存活，是因為當時測試只用了臺北獨有的 `內湖區`——**測試資料不足，
   不是該判斷多餘**。補上 `中正區` 案例後取得有效 Red，判斷已恢復，
   mutant V2 與 mutant W（反向：永不繼承）兩個方向皆被殺。
5. 恢復後的第一版同城判斷只做中文正規化，又丟掉了 `TaiwanLocationResolver` 既有的
   英文別名能力：`{city:'Taipei'}` 會被既有 resolver 正規化為臺北市，卻在同城判斷中
   被視為不同城而丟掉缺值區名。改為 `isSameCity(regions, a, b)`，沿用該模組的
   `matchesLocation`（中文與英文別名皆認），mutant X（限縮為中文）被殺。

### #18／#19 兩個 `|| '臺北市'` 的分類

**結論：兩者都是同一個「內建後備地區」概念，都已集中。** 以下為判斷依據。

先修正一項前置問題：`defaultConfig.location.city` 原為 `'台北市'`（台），
而 `CWAWeatherAPI.js` 的 `COUNTY_API_MAP` 與 `taiwan-regions.json` 皆以 `'臺北市'`（臺）
為鍵。`COUNTY_API_MAP[locationName]` 是**精確鍵查找、不做正規化**，所以 `'台北市'`
若直接作為查詢名會查不到縣市專屬端點，退回全台 API 並印出 warning。
顯示路徑因 `TaiwanLocationResolver` 的 `normalizeChinese`（台→臺）而兩者等效，
所以此不一致目前不可見。已將集中來源改為正規形式 `'臺北市'`。

- **#18（`queryName`）**：天氣查詢在 `locationState.city` 為空時的後備縣市。
  與內建後備地區是同一個概念，已改為 `defaultConfig.location.city`。
- **#19（`TaiwanLocationResolver`）**：`regions` 內找不到任何匹配時的輸出。
  實測僅在 `location.city` 與 `location.state` 皆為 falsy 時觸發
  （`{state:'Taipei'}` 會經英文正規化命中 `臺北市`，走的是匹配分支而非後備）。

  曾考慮以「這是資料正規化規則而非內建設定」為理由排除，但不成立：它回傳的就是
  「無法判定時用哪個縣市」，與 `defaultConfig.location.city` 同義。若有人把集中來源改為
  高雄市，此處仍會回臺北市——正是本變更要消除的靜默分歧。故一併集中。

  代價：`TaiwanLocationResolver.mjs` 從無依賴變成 import `defaultConfig.js`。
  與 design D1 一致（該檔為無 import 的葉節點，不成環）。

## 1.1 新發現：`geolocation.enabled` 與 `sleepMode.enabled` 屬同一類缺陷

盤點時發現 #11 與 #3 是同一類問題，而 design.md D3 的判定表只列了 #3。

`useWeatherStation.js:289-290`：

```js
const geolocationEnabled = Boolean(
  loadedConfig.geolocation && loadedConfig.geolocation.enabled
);
```

設定缺少 `geolocation` 時 `Boolean(undefined)` 為 `false`，**與集中來源宣告的
`geolocation.enabled: true` 相反**，且該宣告永遠不會被這條路徑讀取。

比 #3 更值得注意的是方向：#3 的幽靈預設恰好與宣告值（`true`）一致，所以不會被察覺；
#11 的幽靈預設與宣告值**相反**。

`locationSource.mjs:34` 另有第三處定義（預設參數 `geolocationEnabled = true`），與 #11 的
實際效果矛盾。該預設只對直接呼叫者（測試）生效，因 `useWeatherStation.js:314` 總是顯式傳入。

**對現有測試的影響：** 無。`tests/stationIntegration.test.mjs:30-35` 的 `baseConfig` 顯式給
`geolocation: { enabled: false }`，其餘測試以 spread 繼承，沒有測試依賴「缺值→false」。

**處理：** 納入範圍。`specs/builtin-defaults/spec.md` 的
「Single Source of Built-in Defaults / Partial configuration object」情境要求缺值必須解析自
單一來源，#11 不改寫就違反該規格。已新增 task 3.6。

## 排除項（非設定預設 fallback）

| 位置 | 運算式 | 排除理由 |
| --- | --- | --- |
| `AIWeatherAdvisor.js:164,168,178` | `(oldCurrent.temperature \|\| 0)` 等 | 防止 `undefined` 進入 `Math.abs` 的算術保護，不是設定預設值。design.md Non-Goals 已明示不處理 |
| `useWeatherStation.js:30` | `import.meta.env ?? {}` | 建置環境物件，非設定值 |
| `useDisplayMode.js:43,53` | `storage ?? ...`、`storedSleep ?? null` | `localStorage` 存取與持久化值正規化，屬保留約束範圍，不改 |
| `devFixtures.mjs:45` | `env.DEV !== true` | 開發替身的環境判斷，非設定值 |
| `TaiwanLocationResolver.mjs:13` | `a \|\| b` | 字串比對的邏輯或，非 fallback |
| `CWAWeatherAPI.example.js:117` | `?.value ?? null` | 範例檔，且為 API 回應解析而非設定 |
| `stationLifecycle.mjs:13` | `tickMs = 1000` | 時鐘頻率的**唯一**定義點，不是重複。原 `defaultConfig.updateInterval.time: 1000` 無任何消費者，已依 D-001 移除，故 1000 現在只定義在此一處 |
| `dataState.mjs:58` | `latestResponseUsable = true` | 函式的輸入旗標預設，不是設定值 |
| `AIWeatherAdvisor.js:19` | `provider = 'gemini'` | 與 `useWeatherStation` 的 `env.VITE_AI_PROVIDER \|\| 'gemini'` 確實是兩份定義，但屬 `.env` 層。design Non-Goals 明訂「`.env` 與 `localStorage` 兩層的現有行為與優先序完全不變」，故不在本變更範圍。**已知重複，待獨立處理** |
