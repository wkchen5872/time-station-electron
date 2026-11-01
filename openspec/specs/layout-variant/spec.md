# layout-variant Specification

## Purpose

定義應用以具名版面變體呈現同一份時間與天氣資料的能力：目前的 `codex` 與 `claude` 兩個變體、其共通的版面骨架與控制項位置、各自的資訊取捨規則，以及新增變體時必須遵守的約束。

## Requirements

### Requirement: Named Layout Variants

系統 SHALL 提供具名的版面變體，使用者可於執行期切換。目前提供 `codex` 與 `claude` 兩個變體，兩者皆為深色呈現，不提供淺色呈現。

#### Scenario: Available variants are both visible

- **WHEN** 使用者檢視版面切換控制項
- **THEN** `Codex` 與 `Claude` 兩個選項同時可見
- **AND** 當前使用中的選項以填色標示

#### Scenario: Switching takes effect immediately

- **WHEN** 使用者選擇另一個版面變體
- **THEN** 畫面立即改以該變體呈現
- **AND** 不需重新啟動應用

### Requirement: Shared Data Across Variants

所有版面變體 SHALL 取用同一份時間、日期、農曆與天氣資料。切換變體 MUST NOT 觸發天氣資料重新擷取。

#### Scenario: Switching does not refetch weather

- **WHEN** 使用者切換版面變體
- **THEN** 不對天氣服務發出新的請求
- **AND** 兩個變體取用的底層資料值相同

#### Scenario: Data updates reach the active variant

- **WHEN** 天氣資料於排程刷新後更新
- **THEN** 當前使用中的變體顯示更新後的值

### Requirement: Common Layout Frame

所有版面變體 SHALL 採用相同的版面骨架：800×480 畫面分為左右兩欄，左欄 480px 呈現時間與日期，右欄 320px 呈現天氣。

#### Scenario: Split ratio is 6:4

- **WHEN** 任一變體顯示於 800×480 畫面
- **THEN** 左欄寬度為 480px
- **AND** 右欄寬度為 320px

### Requirement: Consistent Control Placement

版面切換與睡眠控制項 SHALL 在所有變體中位於相同位置、採相同的選項順序與尺寸，使切換變體時控制項本身不改變。

#### Scenario: Controls do not move between variants

- **WHEN** 使用者在兩個變體之間切換
- **THEN** 版面切換控制項與睡眠控制項的位置、尺寸與選項順序維持不變
- **AND** 僅被標示為當前選項的段落改變

#### Scenario: Touch targets are large enough

- **WHEN** 使用者在觸控螢幕上操作控制項
- **THEN** 每個控制項的可觸控高度至少為 44px

### Requirement: Codex Variant Display Rules

`codex` 變體 SHALL 依下列規則取捨資訊，且 MUST NOT 被要求顯示其設計稿未包含的項目。

#### Scenario: Codex 顯示的項目

- **WHEN** `codex` 變體呈現天氣區
- **THEN** 顯示地區名、資料更新時間、現況溫度與其「目前預報」標示、天氣描述
- **AND** 短期預報四格皆顯示時距標籤、圖示、溫度與降雨機率
- **AND** 明天與後天各顯示圖示、降雨機率與溫度範圍

#### Scenario: Codex 不顯示的項目

- **WHEN** `codex` 變體呈現天氣區
- **THEN** 不顯示今日高低溫列
- **AND** 不顯示體感溫度列

#### Scenario: Codex 的降雨機率無隱藏門檻

- **WHEN** 某一時段的降雨機率為任何有效值，包含 0%
- **THEN** `codex` 變體仍顯示該數值

#### Scenario: Codex 的農曆位置

- **WHEN** `codex` 變體呈現左欄
- **THEN** 農曆單獨成行置於時鐘上方

### Requirement: Claude Variant Display Rules

`claude` 變體 SHALL 依下列規則取捨資訊，其門檻與條件為該變體專屬，MUST NOT 自動套用於其他變體。

#### Scenario: Claude 顯示的項目

- **WHEN** `claude` 變體呈現天氣區
- **THEN** 顯示地區名、現況圖示與溫度、天氣描述、今日高低溫
- **AND** 短期預報四格皆顯示時距標籤、圖示與溫度
- **AND** 明天與後天各顯示圖示與溫度範圍

#### Scenario: Claude 的降雨機率隱藏門檻

- **WHEN** 某一時段或某一日的降雨機率低於 20%
- **THEN** `claude` 變體不顯示該數值，該位置留空
- **WHEN** 該數值達到或高於 20%
- **THEN** `claude` 變體顯示該數值

#### Scenario: Claude 的體感條件顯示

- **WHEN** 體感溫度與同時段的現況預報溫度相差 3 度以上，或舒適度指數為悶熱或寒冷
- **THEN** `claude` 變體顯示體感列
- **WHEN** 兩項條件皆不成立
- **THEN** 不顯示體感列，但其版位保留，使其他區塊不位移

#### Scenario: Claude 不顯示的項目

- **WHEN** `claude` 變體呈現天氣區
- **THEN** 不顯示資料更新時間

#### Scenario: Claude 的農曆位置

- **WHEN** `claude` 變體呈現左欄
- **THEN** 農曆併入國曆日期同一行，並以較小字級與次要色呈現

### Requirement: Variant Differences Are Observable Under Identical Data

兩個變體在相同資料下 SHALL 產生各自規則所定義的不同呈現。驗證 MUST 以同一組資料同時檢查兩個變體。

#### Scenario: 同一組資料下的差異

- **WHEN** 以同一份天氣資料分別呈現兩個變體
- **AND** 該資料中某時段的降雨機率為 10%
- **THEN** `codex` 變體顯示 10%
- **AND** `claude` 變體該位置留空

#### Scenario: 今日高低溫的差異

- **WHEN** 以同一份天氣資料分別呈現兩個變體
- **THEN** `claude` 變體顯示今日高低溫
- **AND** `codex` 變體不顯示該列

### Requirement: Shared Behaviour Across Variants

下列行為 SHALL 在所有版面變體中一致，不得因變體而異：預報資料的時距對齊、提示區的正常／異常狀態切換，以及控制項的位置、順序與尺寸。

#### Scenario: 共用行為清單

- **WHEN** 使用者在任一變體下檢視畫面
- **THEN** 預報時距依資料來源的實際區間呈現
- **AND** 提示區在異常時改顯示異常訊息、解除後恢復
- **AND** 控制項的位置、選項順序與觸控尺寸與另一變體相同

#### Scenario: 變體取捨不得破壞共用契約

- **WHEN** 任一變體套用自身的取捨規則
- **THEN** 共用行為清單中的三項仍須成立
- **AND** 變體的取捨只影響是否顯示，不影響底層資料值

#### Scenario: 顯隱不得重組時間格

- **WHEN** 某一變體因門檻而不顯示某個值
- **THEN** 該變體的時間格起訖、格數與代表值與另一變體完全相同
- **AND** 僅該值的可見性不同

#### Scenario: 切換變體不重算時間格

- **WHEN** 使用者切換版面變體
- **THEN** 時間格的起訖、格數與代表值不變
- **AND** 不重新計算任何來源區間

### Requirement: Variant Design Conformance

每個版面變體 SHALL 對應一份納入版控的設計稿，實作的資訊排列需與該設計稿一致。設計稿的來源關係與任何數值覆蓋 SHALL 於文件中載明。

#### Scenario: Each variant has a versioned design reference

- **WHEN** 檢視變體的設計依據
- **THEN** `codex` 變體對應 `docs/theme/v2/desgin-codex-v4.svg`
- **AND** `claude` 變體對應 `docs/theme/v2/design-claude-v4.svg`

#### Scenario: Claude 整合稿的來源關係須載明

- **WHEN** 檢視 `design-claude-v4.svg` 的說明
- **THEN** 文件載明其版面內容源自 `design-claude-64.svg`，控制項樣式源自 `desgin-codex-v4.svg`
- **AND** 凡其控制項數值與 `desgin-codex-v4.svg` 不同之處，文件載明該覆蓋的依據
- **AND** 不宣稱兩者的控制項完全相同而未經核對
