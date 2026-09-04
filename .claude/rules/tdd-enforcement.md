# TDD Policy Entrypoint

這是 Provider 原生載入入口；完整且唯一的共用規範位於
`docs/agent-protocol.md`。

進行實作前，agent **MUST read** 該文件的 §3–§5，並依工作類型套用：

- 行為變更與 bug fix：test-first，Red 必須因預期行為尚未成立而失敗。
- 非行為變更：執行與 artifact 相稱的替代驗證。
- Green 不得靠弱化、跳過或刪除需求測試取得。
- iteration 跑 focused test，task 邊界跑 affected suite，seal/commit 前跑
  project-defined full required checks。
- 有可信 Red 時不重複 causal check；缺少可信 Red、高風險或因果不清時才做
  safe revert-check 或等價檢查。
- Mutation testing 是 optional/advisory，不是 score、完成或 commit gate。

不得在此複製完整 policy；更新共用規範時只修改 managed protocol。
