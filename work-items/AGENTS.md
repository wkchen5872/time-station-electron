---
type: Reference
title: Work Item 協作紀錄規範
description: 本專案臨時協作紀錄的建立、責任分工、證據與正式交付規則。
tags: [agents, work-items, collaboration]
timestamp: 2026-10-29T14:32:08.958Z
---

<!-- Managed by wk-agent-ops · do not edit here — re-running install.sh overwrites this file. -->

# Work Item Guidelines

## 1. 定位與適用範圍

Work Item 是**目前專案工作目錄內、可丟棄、不納入專案 Git 的臨時協作紀錄**，用來保存需求探索、多 Agent 分析、討論共識與 Review 過程。

本規範的「目前工作目錄」是指 **Agent 實際操作的專案根目錄或 linked worktree 根目錄**，不是任意子資料夾，也不是所有 worktree 的共同儲存位置。

核心原則：

- **Work Item 管臨時討論；OpenSpec 與正式產物承接交付所需資訊。**
- 同一目錄、同一議題，優先沿用同一個 Work Item；不同目錄可以有各自的本地紀錄。
- Work Item 不跨 worktree 自動搬移、複製、搜尋補回或同步。
- 建立 OpenSpec Change 不代表 Work Item 必須結束；仍可繼續討論、Review 與驗證。
- Work Item 可隨所在 worktree 的授權清理一併消失，不要求保存歷史版本。
- 必要成果不得只存在於 Work Item；正式規格不得依賴它才能被理解或執行。

各 Agent 實際使用的專案指示入口，應明確要求處理 Work Item 前先讀本文件；不要只依賴子目錄規範被自動發現。

本文件不取代專案的開發、TDD、安全、工具權限及 Git 操作規範。允許記錄 Work Item，**不等於**允許修改產品程式碼、變更規格、切換分支、建立／刪除 worktree、Commit、Push 或 Merge。

## 2. 目錄與 Git 規則

```text
<current-project-root>/
├── AGENTS.md                    # 根目錄規範，合併啟用指示
├── CLAUDE.md                    # 若專案使用，整合對應入口
├── .gitignore
│
├── work-items/                  # 臨時協作區
│   ├── AGENTS.md                # 管理規範，納入 Git
│   └── WI-YYYYMMDD-topic/       # 臨時紀錄，不納入 Git
│       ├── README.md
│       ├── context.md
│       ├── decisions.md
│       ├── agents/
│       └── reviews/
│
├── docs/                        # 正式文件，沿用原有用途
└── openspec/                    # 正式規格與任務
```

專案根目錄的 `.gitignore` 應包含：

```gitignore
# Local, disposable Work Item records
/work-items/WI-*/
```

規則：

- 規範文件與忽略規則納入專案 Git；`WI-*` 內的紀錄不得被加入專案 Git，也不得使用強制加入繞過忽略規則。
- 初始化或首次寫入前，確認忽略規則已生效。缺少設定時，依既有檔案修改授權補上；沒有授權則回報。
- 「已生效」必須雙向成立：`WI-*` 的紀錄實際被忽略，且 `work-items/AGENTS.md` 本身仍**可追蹤**。父層忽略整個 `work-items/` 會讓規範檔一起被忽略，那屬於未達成，不是已保護。
- 判斷依據是專案版控的 `.gitignore`。效果只來自 `.git/info/exclude` 或個人 `core.excludesFile` 時，專案本身沒有帶規則，別人 clone 後不會有保護，視為未達成；規則仍須寫進專案版控的 `.gitignore`，且不因此修改個人或 repo-local 的 Git 設定。
- 若紀錄已被追蹤，回報並依專案授權處理，不把新增忽略規則當成已完成取消追蹤，也不自行修改 Git index。
- 不建立 repo 外共享儲存、獨立紀錄版本庫、全域索引或跨 worktree 同步機制。
- 不建立空的 `agents/`、`reviews/`，不為每個對話回合建立新檔。

## 3. 尋找、建立與綁定議題

### 開始處理前

1. 確認工具實際使用的專案／worktree 根目錄，不只依賴聊天中的路徑描述。
2. 讀取適用的專案規範與本文件。
3. 使用明確路徑列出 `<current-project-root>/work-items/WI-*/`，讀取相關 `README.md`；不要只依賴一般程式碼搜尋或 Git 檔案清單。
4. 若使用者指定 Work Item，核對其議題與目前任務；否則優先重用當前目錄內同議題的紀錄。
5. 若有多個合理候選且無法判定，不任意合併、選取或新建副本；先回報歧義。
6. 閱讀所選項目的 `context.md` 與 `decisions.md`；獨立分析模式只先讀共同背景、限制及已批准決策，其他未確認結論依第 7 節延後閱讀。

### 何時建立

使用者明確要求記錄，或具體任務需要跨 Session／多 Agent 持續協作時，可以建立 Work Item。單次概念問答、無持續追蹤需求的聊天，以及單純開啟新 Session，不應自動建立。

### 命名與範圍

- 目錄名稱：`WI-YYYYMMDD-short-slug`，日期使用實際建立日期。
- Slug 使用小寫英文、數字與 `-`；同名但確為不同議題時，加上短後綴。
- ID 只需在當前工作目錄內唯一；建立後不因標題修改而改名。
- 不要求同一 OpenSpec Change 在所有 worktree 只對應一個 Work Item。
- 多個 Agent 正在共同討論同一份臨時紀錄時，應確認它們指向同一個實際目錄。
- 切換工作目錄或分支後，重新確認議題、規格與程式碼；不要假定留在目錄裡的筆記仍適用。

新建時建立 `README.md`、`context.md`、`decisions.md`，只填入已知資訊與必要標題。不得把模板範例當成實際內容。

## 4. README 與狀態

`README.md` 使用以下最小結構；尖括號內容為待填值，未知值使用 `null`。

```markdown
---
id: WI-YYYYMMDD-short-slug
title: <議題名稱>
status: active
openspec_change: null
coordinator: <本地 Session 識別或 user；尚未指定時為 null>
created_at: <YYYY-MM-DD>
updated_at: <YYYY-MM-DD>
---

# <議題名稱>

## Goal and Scope
要解決的問題、範圍與不處理的事項。

## Sessions
參與者的 Agent／工具名稱、本地 Session 識別與目前職責。

## Current Summary
目前共識、主要歧異，以及必要成果的交接情況。

## Next Actions
下一個協作、驗證或交接動作；正式實作待辦連結至既有任務清單。
```

- 不維護 `branch`、`worktree` 欄位；執行時確認實際環境，Review 另記版本依據。
- `openspec_change` 在尚未建立時維持 `null`；建立本地 Work Item 不代表要建立新 Change。
- Session 識別可以是 `agent-a-s01` 等本地別名，不得冒充工具提供的真實 Session ID。
- 不在 README 複製一份 OpenSpec Tasks 或維護第二套實作進度。

狀態只使用：

| 狀態 | 意義 |
| --- | --- |
| `active` | 仍需討論、協作、Review 或驗證；可以已經有 Change |
| `parked` | 暫停處理 |
| `closed` | 本地協作已結束，必要成果已交接；不代表產品已合併或上線 |
| `cancelled` | 已決定不再處理 |

狀態由 Coordinator 依實際情況更新。標記 `closed` 或 `cancelled` 需使用者確認，或符合事先明確授權的條件；不能僅因建立 Change、測試結束或 Agent 停止回應而自動結束。

## 5. 文件責任與多 Agent 寫入

| 檔案 | 內容 | 預設寫入者 |
| --- | --- | --- |
| `README.md` | 狀態、目標、參與者、摘要與關聯 | Coordinator |
| `context.md` | 共享背景、事實、限制、假設與未決問題 | Coordinator |
| `decisions.md` | 已確認決策、理由、重要替代方案與正式落點 | Coordinator |
| `agents/<agent>-<session>.md` | 該 Session 的分析、建議、反證與回覆 | 該 Session |
| `reviews/<agent>-<session>-rNN.md` | 該 Reviewer 的審查結果與後續驗證 | 該 Reviewer |

Coordinator 是現有參與者的整合責任，不要求另外開一個 Agent。新 Work Item 的建立者預設為初始 Coordinator；加入既有 Work Item 時不得自行接管。交接由使用者指定，或依既有明確授權進行。

寫入規則：

- 非 Coordinator 將新資訊寫入自己的紀錄，供 Coordinator 整合；不要直接覆寫共享摘要。
- 不修改或刪除其他 Agent 的紀錄。需要反駁時，在自己的文件引用並提供證據。
- Developer 對 Review 的回覆寫入自己的紀錄或正式任務，由 Reviewer 更新其報告；其他人代改需明確授權。
- 每次修改前重新讀取目標檔案，使用局部更新，保留其他人的新內容。
- 發現同時變更或所有權不明時，先協調，不以整份覆寫解決。
- 本規範不提供檔案鎖或權限強制；重新讀檔不能取代單一寫入者的協調。

邊界：檔案所有權只決定「誰寫哪一個紀錄檔」。它不解除專案既有「同一 worktree 同一時間只有一個 active writer」的限制，也不授予修改產品程式碼、規格或 Git 狀態的權限。多個參與者要嘛在同一 worktree 依序交接寫入權，要嘛各自在自己的 worktree 持有本地紀錄。

## 6. 自動記錄與證據

處理已綁定的 Work Item 時，遇到重要新資訊，應在本次回覆結束前更新自己有權寫入的文件；沒有實質進展時不必寫入。

應保存：新需求與限制、查證的事實、影響方案的風險、重要選項、待決問題、已批准決策，以及實質 Review 結果。

不保存：完整聊天逐字稿、內部推理逐字紀錄、重複敘述、無關資訊、沒有用途的完整日誌，以及密碼、Token、API Key 或不必要的個資。忽略規則不是敏感資料的存放授權。

紀錄必須區分「事實」「假設」「建議」「待驗證事項」，並標示來源：

- `[已知]`：使用者明確提供或確認的資訊。
- `[查詢資料]`：實際讀取程式碼、文件、工具或執行測試所取得的資訊；附可核對的路徑、文件來源、命令或結果摘要。
- `[訓練資料]`：未針對本專案實際驗證的既有知識，不作為已確認的專案事實。
- `[需外部查詢]`：仍需查詢或工具驗證的事項；說明尚缺什麼證據。

對不確定結論說明依據與限制；使用信心標記時，信心不能取代證據。無法驗證就寫「無法確定」或「待驗證」，不捏造來源、行號、Commit、測試執行或通過結果。

其他 Agent 的報告是待檢驗的輸入，不是問題成立的獨立證據。轉述時註明是誰的觀點，以及自己是否已驗證。

`context.md` 建議分成：背景、已確認事實、限制、待驗證假設、未決問題、目前方向。共享方向不等於已批准決策。

## 7. 獨立分析與決策

### 獨立分析

使用者要求獨立分析／Review 時：

1. 先讀共同輸入：使用者需求、已批准決策、正式規格及對齊的程式碼版本。
2. 在產出自己的初版結論前，不讀其他 Agent 的未確認分析、Review 或由其彙整的建議。
3. 先將結果寫入自己的文件，再進行交叉比較。
4. 分開記錄原始發現與交叉驗證後的修正，不把別人的發現冒充自己的獨立發現。

### 決策

`decisions.md` 只記錄已由使用者或明確授權者確認的決策。建議格式：

```markdown
## D-001：<決策標題>
- 狀態：Approved / Superseded
- 決策：
- 理由：
- 重要替代方案與不採用理由：
- 確認者與日期：
- 證據或相關分析：
- 正式落點：<對應文件／任務；尚未交接則明記待交接>
```

Agent 的建議、多個 Agent 的一致意見、或 Coordinator 的整理，不等於批准。未確認的選項留在 `context.md` 或個別分析中。決策被取代時保留簡短的前後關係；這不要求對 Work Item 建立版本庫。

## 8. OpenSpec 交接與責任分界

### 建立 Change 之前

- Work Item 可以先於新分支、worktree 或 OpenSpec Change 存在。
- 探索可以持續，不為了建立 Work Item 而強制產生正式規格。
- 依專案既有 OpenSpec 流程與授權建立 Change，不從臨時筆記推定使用者已批准實作。

### 建立 Change 之後

- 更新 `openspec_change`；正式需求、設計與任務依對應 OpenSpec 文件管理。
- Work Item 可以繼續使用，但不維護第二套正式規格。
- 發現新結論與正式規格衝突時，明確列出差異並確認，不用臨時筆記悄悄覆蓋既有規格。
- 正式文件必須能在 Work Item 不存在時獨立被理解；不得只寫「依 Work Item 的討論實作」。

### 所有階段都適用的交接規則

交接不只發生在首次建立 Change 時。後續討論與 Review 產生影響交付的已確認結論，也必須落實：

| 內容 | 正式落點 |
| --- | --- |
| 需求、限制、行為與驗收條件 | 對應 OpenSpec 文件 |
| 重要設計決策、理由、替代方案與取捨 | `design.md` 或專案對應設計文件 |
| 已確認但尚未處理的必要修正、風險或驗證 | `tasks.md` 或專案正式任務／風險機制 |
| 已完成的修正 | 程式碼、對應測試及必要的正式任務更新 |
| 無保留價值的草案、重複建議與未成立的推測 | 可只留在 Work Item |

正式產物的更新仍須符合任務授權；未獲授權時，將必要更新列為待交接並回報，不自行更改規格，也不宣稱交接已完成。

使用專案實際採用的 OpenSpec 結構，不因本表範例強制新增不需要的文件。對未解決但會影響交付的風險，必須留下正式待確認事項，不得為了清理而當成無用推測。

**交接判準：新的 Agent 不閱讀原始對話與 Work Item，仍能依專案規範、OpenSpec、正式任務及程式碼接續實作與驗證。**

這不要求每項待辦都已完成，但要求必要資訊已有正式落點。跨目錄交接時，還要確認目的目錄實際具有相應版本；不得只因檔案寫在來源目錄就宣稱對方已取得，也不得擅自 Commit、Push 或複製。

## 9. Review 紀錄

Review 先寫在**當前目錄的 Work Item** 內，不另建永久 Review 系統。

- 原 Work Item 還在且議題相同：繼續沿用。
- 換到其他 worktree，或原 Work Item 已刪除：先讀正式規格；需要紀錄時建立本地 Work Item，指向同一個 Change。
- 不為了 Review 搬移、還原或同步原本的討論歷史。
- 檔名採 `<agent>-<session>-rNN.md`，由各 Session 維護自己的序號，不依賴全域流水號。

每份 Review 至少包含：

```markdown
# Review：<審查主題>

## Scope and Baseline
- Reviewer：
- 審查時間：
- OpenSpec Change：
- 審查範圍：<規格／程式碼／測試，以及涉及檔案>
- 版本依據：<base → head Commit，或實際審查的文件快照>
- 未提交內容：<排除／包含；說明 staged、unstaged、untracked 的範圍>
- 實際執行的檢查與結果：<未執行則明寫未執行>

## Findings
### F-01：<問題標題>
- 嚴重程度與影響：
- 位置：<檔案、行號或需求；以本次審查版本為準>
- 證據／重現方式：
- 建議處理：
- 狀態：Open / Accepted / Rejected / Resolved
- 正式追蹤／修正／驗證依據：

## Summary and Limitations
結論、未覆蓋範圍、剩餘疑慮與交接情況。
```

補充規則：

- 沒有可用 Commit 時明記 `null`／尚未版本化，不捏造 SHA，也不自行初始化或提交只為留下基準。
- 含未提交內容的 Review，不能只用 HEAD 宣稱內容已固定。若審查途中目標改變，標記版本變動並重新確認範圍。
- 跨 Agent 比較結論前，先核對審查版本與範圍是否相同。
- `Open` 表示待確認；`Accepted` 表示問題成立、尚未完成處理；`Rejected` 需有理由；`Resolved` 需有修正與驗證依據。
- Reviewer 預設不修改產品程式碼；測試、重現或環境變更仍遵守既有授權。
- 修正由指定 Developer 處理。需要切換責任時明確交接，避免同時寫入。
- 沒有發現問題也要記錄範圍與限制；不得為了湊數產生無證據的 Finding。
- 不以多個模型投票代替證據；歧異優先用需求、程式碼與可重現檢查裁決。
- 重要成果依第 8 節落實；不要求將整份 Review 報告轉入 OpenSpec。

## 10. Worktree 切換與當前上下文

- 新 Session 不強制建立新 worktree；是否隔離由專案既有流程決定。
- 留在同一目錄的 Agent 可以共享當地紀錄；不因它們使用不同工具而建立副本。
- 轉到新目錄後，重新確認工具工作路徑、正式規格與程式碼，不能以舊 Session 記憶取代當前檔案。
- 新目錄沒有舊 Work Item 是正常情況，不需要補回。
- 找不到必要 OpenSpec 內容或版本不符時，回報交接缺口，不自行從記憶重建正式需求。
- 不同目錄各自產生的臨時 Review，不要求合併筆記；已確認成果透過正式產物及既有 Git 流程協作。

## 11. 清理與刪除

- 不因建立 Change、標記 `closed`、Agent 結束或資料過期而自動刪除 Work Item。
- 主專案目錄內的 Work Item 由使用者按需清理；不建立自動保留期限。
- 刪除 Work Item 需要明確授權，或符合事先明確授權的清理規則。
- 經授權刪除所在 worktree 時，允許 Work Item 一併消失，不要求另做備份或搬移。
- 允許臨時紀錄消失，不授權 Agent 自行刪除 worktree。
- 刪除 Work Item 的授權，不包含刪除 OpenSpec、分支、worktree、其他 Work Item 或正式成果。
- 執行清理前，若已知有必要決策、待辦或風險尚未交接，先指出缺口；使用者仍可明確決定放棄。
- 不把 Git 或工具的刪除警告、恢復能力當成臨時資料的保護機制。

## 12. 每次工作的最小檢核

開始時：確認實際目錄、適用規範、正確議題、正式規格及自己的寫入責任；獨立分析時先避開其他 Agent 的未確認結論。

結束前：只記錄有價值的新資訊；更新自己有權修改的檔案；將必要成果落實到正式產物，或清楚標記待交接；檢查未覆寫他人內容、未把臨時紀錄加入專案 Git。

回覆使用者時，簡要說明更新了哪些文件、尚有哪些必要資訊待確認或交接。若受權限或環境限制無法寫入，明確說明未寫入，不聲稱已保存。

**最後原則：不要求討論紀錄永遠存在；只要求必要成果不只存在於討論紀錄。**
