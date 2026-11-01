# Spec Delta

## Purpose

定義應用程式內建預設值的唯一來源、缺值時的解析行為，以及設定載入相對於時鐘與天氣排程的
時序契約。本能力同時明示本產品不提供執行期設定檔：預設值在建置時決定。

## ADDED Requirements

### Requirement: No Runtime Configuration File

系統 MUST NOT 於執行期讀取外部設定檔來覆寫內建預設值。所有預設值 SHALL 在建置時決定，
修改預設值 SHALL 需要重新建置與部署。此限制在開發模式與正式建置下一致。

#### Scenario: Production build ignores any external config file

- **WHEN** 正式建置的應用程式啟動
- **AND** 檔案系統上存在任何名為 `config.json` 的檔案
- **THEN** 系統不讀取該檔
- **AND** 生效的設定值完全來自內建預設來源

#### Scenario: Development mode behaves the same as production

- **WHEN** 應用程式以開發模式啟動
- **AND** 專案目錄中存在任何外部設定檔
- **THEN** 系統不讀取該檔
- **AND** 生效的設定值與正式建置相同

### Requirement: Single Source of Built-in Defaults

每一個內建預設值 SHALL 只有一個定義點。當設定物件缺少某個值時，取用該值的程式路徑
SHALL 解析到該單一定義點，而非各自宣告的字面值或獨立常數。

#### Scenario: Missing value resolves to the single source

- **WHEN** 傳入的設定物件缺少某個預設值
- **THEN** 該值由唯一的內建預設來源決定
- **AND** 改變該來源的值會改變此路徑的結果

#### Scenario: Partial configuration object

- **WHEN** 傳入的設定物件只提供同一群組中的部分值
- **AND** 該群組的欄位彼此獨立
- **THEN** 已提供的值生效
- **AND** 未提供的值由唯一的內建預設來源決定，而非由取用處的區域常數決定

#### Scenario: Zero is a provided value, not a missing one

- **WHEN** 傳入的設定值為數值 `0`
- **AND** `0` 在該設定的值域內為合法輸入
- **THEN** 系統採用 `0`
- **AND** 不以內建預設值取代它

### Requirement: Dependent Settings Resolve As A Unit

當同一群組中某個欄位的意義取決於另一個欄位時，缺值的欄位 MUST NOT 無條件繼承內建預設來源的值。
系統 SHALL 只在其所依賴的欄位與內建預設來源一致時才繼承，否則 SHALL 回退為該欄位的空值。
顯式提供的值 SHALL 不受此限制。

此要求限縮上一個 requirement 的「Partial configuration object」情境：欄位獨立時逐欄繼承，
欄位相依時依本要求處理。

#### Scenario: Dependent field is not inherited across a changed parent

- **WHEN** 設定提供地區的城市，但未提供行政區
- **AND** 該城市與內建預設來源的城市不同
- **THEN** 行政區為空字串
- **AND** 不採用內建預設來源的行政區，即使該行政區名稱在新城市中同樣存在

#### Scenario: Dependent field is inherited when the parent matches

- **WHEN** 設定提供地區的城市，但未提供行政區
- **AND** 該城市與內建預設來源的城市相同
- **THEN** 行政區採用內建預設來源的值

#### Scenario: Equivalent parent spellings count as a match

- **WHEN** 設定提供的城市與內建預設來源的城市在正規化後相同
- **THEN** 視為同一城市
- **AND** 行政區仍採用內建預設來源的值

#### Scenario: Alternative parent names already supported by name resolution count as a match

- **WHEN** 設定提供的城市是系統名稱解析已支援的別名，並指向與內建預設來源相同的城市
- **THEN** 視為同一城市
- **AND** 行政區仍採用內建預設來源的值
- **AND** 相依欄位的判定不得比系統既有的名稱解析能力更嚴格

#### Scenario: Explicitly provided dependent field is kept

- **WHEN** 設定同時提供城市與行政區
- **AND** 該城市與內建預設來源的城市不同
- **THEN** 採用設定提供的行政區
- **AND** 不因城市不同而清除它

#### Scenario: Source precedence is unaffected

- **WHEN** 行政區依本要求回退為空字串
- **THEN** 定位來源的取用順序不變
- **AND** 即時定位與快取定位的結果不受本要求影響

### Requirement: Configuration Load Timing Contract

設定載入 SHALL 為可等待的非同步操作，且 SHALL NOT 阻擋時鐘顯示。依賴設定值的週期性
排程 SHALL 僅在設定載入完成後建立。元件卸載後 SHALL NOT 再建立任何排程。

#### Scenario: Clock runs before configuration resolves

- **WHEN** 設定載入尚未完成
- **THEN** 時間顯示已可運作且持續前進
- **AND** 尚未建立依賴設定的天氣刷新排程

#### Scenario: Dependent schedule starts after configuration resolves

- **WHEN** 設定載入完成
- **THEN** 天氣刷新排程依生效的更新週期建立

#### Scenario: No schedule is created after unmount

- **WHEN** 元件已卸載
- **AND** 設定載入在卸載之後才完成
- **THEN** 系統不建立任何新排程

### Requirement: Built-in Defaults Expose Only Wired Values

內建預設來源 SHALL 只包含實際有功能消費者的值。沒有消費者的設定欄位 MUST NOT 保留，
因為它們會被誤認為可調整的設定。

#### Scenario: A setting with no consumer is absent

- **WHEN** 檢視內建預設來源
- **THEN** 其中每個值都有至少一個功能消費者
- **AND** 不存在改變後不影響任何行為的設定欄位
