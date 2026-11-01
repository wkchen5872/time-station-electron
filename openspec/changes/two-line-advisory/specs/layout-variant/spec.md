# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Behaviour Across Variants

下列行為 SHALL 在所有版面變體中一致，不得因變體而異：預報資料的時距對齊、提示區的正常／可見異常狀態切換、提示區的兩行版位與截斷規則，以及控制項的位置、順序與尺寸。天氣過期狀態的提示 SHALL 暫時在所有變體中隱藏；資料無法取得與定位未知的提示 SHALL 保留。

#### Scenario: 共用行為清單

- **WHEN** 使用者在任一變體下檢視畫面
- **THEN** 預報時距依資料來源的實際區間呈現
- **AND** 提示區在資料無法取得或定位未知時改顯示該異常訊息，沒有可見異常時恢復一般提示
- **AND** 提示區最多呈現兩行，版位高度不隨行數變動
- **AND** 控制項的位置、選項順序與觸控尺寸與另一變體相同

#### Scenario: 變體取捨不得破壞共用契約

- **WHEN** 任一變體套用自身的取捨規則
- **THEN** 共用行為清單中的四項仍須成立
- **AND** 變體的取捨只影響是否顯示，不影響底層資料值

#### Scenario: 顯隱不得重組時間格

- **WHEN** 某一變體因門檻而不顯示某個值
- **THEN** 該變體的時間格起訖、格數與代表值與另一變體完全相同
- **AND** 僅該值的可見性不同

#### Scenario: 切換變體不重算時間格

- **WHEN** 使用者切換版面變體
- **THEN** 時間格的起訖、格數與代表值不變
- **AND** 不重新計算任何來源區間

#### Scenario: 過期提示在兩個變體中一致隱藏

- **GIVEN** 同一份資料的唯一異常是天氣過期
- **WHEN** 使用者在 Codex 與 Claude 變體之間切換
- **THEN** 兩者均顯示外出提示或既有預設訊息，不顯示過期警告或其異常樣式
- **AND** 切換不清除內部過期狀態、不改變既有更新時間或觸發額外天氣請求

#### Scenario: 兩行版位與截斷在兩個變體中一致

- **GIVEN** 同一則需要兩行或超過兩行的提示文案
- **WHEN** 使用者在 Codex 與 Claude 變體之間切換
- **THEN** 兩者的提示區版位高度、上下左右置中方式與截斷位置相同
- **AND** 兩者僅字重等既有變體差異不同，換行與截斷結果不因變體而異

### Requirement: Variant Design Conformance

每個版面變體 SHALL 對應一份納入版控的設計稿，實作的資訊排列需與該設計稿一致。設計稿的來源關係與任何數值覆蓋 SHALL 於文件中載明。提示區的版位改動 SHALL 另有一份納入版控的設計依據，並載明其覆蓋兩份變體設計稿的範圍。

#### Scenario: Each variant has a versioned design reference

- **WHEN** 檢視變體的設計依據
- **THEN** `codex` 變體對應 `docs/theme/v2/desgin-codex-v4.svg`
- **AND** `claude` 變體對應 `docs/theme/v2/design-claude-v4.svg`

#### Scenario: Claude 整合稿的來源關係須載明

- **WHEN** 檢視 `design-claude-v4.svg` 的說明
- **THEN** 文件載明其版面內容源自 `design-claude-64.svg`，控制項樣式源自 `desgin-codex-v4.svg`
- **AND** 凡其控制項數值與 `desgin-codex-v4.svg` 不同之處，文件載明該覆蓋的依據
- **AND** 不宣稱兩者的控制項完全相同而未經核對

#### Scenario: 提示區兩行版位另有設計依據

- **WHEN** 檢視提示區的設計依據
- **THEN** 存在一份納入版控的提示區設計稿，標示兩行版位的量測值與各狀態呈現
- **AND** 文件載明該設計稿僅覆蓋兩份變體設計稿的提示區，其餘區域仍以原設計稿為準
- **AND** 兩份變體設計稿中與其不符的提示區數值不得被當成現行依據
