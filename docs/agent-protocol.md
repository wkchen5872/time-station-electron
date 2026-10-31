---
type: Reference
title: Agent Operating Protocol
description: Shared task classification, implementation, verification, and completion rules for AI agents.
tags: [agents, protocol, testing]
timestamp: 2026-09-15T00:00:00+08:00
---

<!-- Managed by wk-agent-ops · do not edit here — re-running install.sh overwrites this file. -->

# Agent Operating Protocol

> This file is the **portable operating contract**.
> Every rule here holds for any AGENTS.md-aware tool. Tool-specific
> commands appear only as parenthetical examples; specialized playbooks remain
> separate and load on demand.

| Field   | Value                                                     |
| ------- | --------------------------------------------------------- |
| Version | 2.5.0                                                     |
| Scope   | Operational framework for all AI agent tasks in this repo |

---

## 1. Before You Start (read only what the task needs)

- **Always:** `docs/architecture.md` (module boundaries, data flow) and
  `docs/conventions.md` (style, naming, prohibited patterns).
- **When the task touches `openspec/`:** the relevant specs in
  `openspec/specs/` — source of truth for requirements.
- **When the task touches `docs/`:** `docs/okf-conventions.md` — doc authoring
  rules. (Not needed for code-only tasks.)
- **When the task needs cross-session temporary collaboration records:**
  `work-items/AGENTS.md` — the Work Item convention, and the single source of its
  rules. (Not needed otherwise; records are local and disposable.)

## 2. Hard Prohibitions (apply to every task, no exceptions)

- ❌ **No direct edits to vendored / generated agent config.** Do not manually
  create, edit, or delete installed skills, workflows, rules, or agents.
  Updates must go through the designated installation tooling within its
  documented scope. Follow the target project's instructions for the source
  and installation workflow; if these are unknown, **stop and ask the human.**
- ❌ **No warning suppression:** never use `// @ts-ignore`, `any`, or skip lint
  errors to force a pass.
- ❌ **No scope creep:** implement only what the active OpenSpec change (or the
  explicit request) defines.
- ❌ **No structural breach:** never violate the dependency rules in
  `docs/architecture.md`.

> **Enforcement note:** this prohibition is normative policy. A target project
> may back it with provider-specific permission controls or pre-tool hooks.
> When configured, that mechanism owns the authoritative protected-directory
> list; this portable document does not.

## 3. Protocol by Task Scale

### Planning authority

OpenSpec is the source of truth for development requirements, design, and
implementation tasks. When formal planning is needed, use OpenSpec; do not
substitute provider-native Plan, Workflow, or Task artifacts. Provider tools may
support execution or display progress derived from OpenSpec, but must not
maintain a competing development plan.

Use an applicable existing OpenSpec change rather than creating a duplicate.
Lightweight work needs no new formal plan, not an alternative planning system.
Before OpenSpec work, read [OpenSpec Workflow](openspec-workflow.md).

### Classify by effect and risk

Classify the requested outcome, not the file extension, diff size, or number
of modules. Markdown skills and rules can change behavior; a cross-module
rename may preserve it. Reclassify if investigation reveals greater scope or risk.

| Task | Required workflow |
|---|---|
| Read-only analysis, review, or diagnosis | Inspect evidence and report findings; no implementation, formal plan, or archival is required. |
| Non-behavioral edits | Make the minimum change and validate the artifact; no new formal plan or test-first cycle is required. |
| Clear, low-risk local behavior changes or bug fixes | State acceptance criteria, use §4, and verify affected behavior; no new formal plan is required. |
| New features, unresolved requirements or material design choices, or high-risk behavior changes | Use OpenSpec for formal planning and design review, then implement with §4. |

The local-fix route requires clear acceptance criteria, bounded impact, and
straightforward validation and rollback. Changes to permissions, money handling,
data migration, or public contracts require formal planning even when small.
If an applicable OpenSpec change exists, follow it and keep its artifacts current.

### Rules for execution

- Make only requested changes; do not refactor adjacent code, remove unrelated
  dead code, or add abstractions or configurability beyond the task.
- State material assumptions. Ask before dependent work when ambiguity affects
  requirements, scope, safety, or irreversible outcomes. For low-risk, reversible
  implementation choices, state the assumption and proceed. While awaiting a
  required answer, continue only work that does not depend on it.
- Reuse an existing design approval while its scope and decisions remain valid;
  do not ask for the same approval again on resumption.
- Behavior-changing work and bug fixes use test-first regardless of whether a
  formal plan is needed. When automation is impractical, record the reason,
  replayable acceptance steps, and expected results before implementation;
  record actual results after implementation.
- Validate the changed artifact or behavior and report results before claiming
  implementation complete. Keep implementation completion separate from delivery
  actions such as archival and commit, as defined in §5.

## 4. TDD Implementation Loop (Behavior Changes)

1. **Define observable behavior** — derive the test from the approved spec or
   acceptance criteria, not from implementation details.
2. **Red — Expected Red evidence** — write and run the smallest focused test
   before production code. Record the command, failing test name, non-zero exit
   code, expected behavioral reason, and a sanitized minimal output excerpt.
   Syntax, fixture, dependency, setup, or unrelated failures are not a valid
   Red. A test that passes immediately also is not Red: confirm the behavior
   already exists or correct the test.
3. **Green — Test integrity** — implement the minimum behavior needed to pass.
   Do not weaken assertions or skip, delete, or rewrite requirement tests to
   manufacture Green. If a test conflicts with the approved spec, update the
   artifact or obtain human confirmation before changing the test.
4. **Refactor** — improve structure only while the focused test remains green;
   do not add unrequested behavior.
5. **Layered verification** —
   - each Red/Green iteration: run the focused test;
   - each task boundary: run the focused test and affected suite;
   - seal or commit: run the project's full required checks from AGENTS.md, CI,
     or its native manifest.
6. **Conditional causal checks** — a trustworthy test-first Red already proves
   the basic causal link, so do not require a revert-check for every task. When
   Red evidence is missing, risk is high, or causality is unclear, use a safe
   revert-check or equivalent check that preserves unrelated worktree changes.
7. **Mutation quality review (optional unless required by project policy)** —
   run only after normal tests pass, at a module, PR, scheduled, or release
   boundary; never after every Red/Green iteration.
   - Triage survivors; return to TDD only for confirmed test gaps.
   - Invalid or incomparable runs must not update baselines or produce score
     verdicts.
   - Repository policy overrides third-party instructions. Preserve unrelated
     work, use project-local tooling without global fallback, and disclose
     dependency/configuration changes before obtaining any required consent.
   - Before running, read [Mutation Testing Playbook](mutation-testing.md)
     for runner selection, survivor decisions, cadence, and score policy.
8. **Verify and self-heal** — run the applicable native linter, type check, and
   required tests; for an OpenSpec change, also run its verify stage. Reuse
   passing results for unchanged code and inputs; do not rerun solely because
   another checklist repeats the gate. Fix in-scope failures and recheck; report
   external or out-of-scope blockers without claiming a pass.

## 5. Completion and Delivery

Read-only work is complete when findings and their evidence are reported.
Non-behavioral edits require artifact validation. For behavior changes,
implementation is complete only when the applicable gates below pass:

- [ ] For an OpenSpec change, its verify stage passes and artifacts reflect the work.
- [ ] Each behavior-changing task has valid Red evidence, or a documented
      reason plus replayable acceptance evidence when automation is impractical.
- [ ] Focused tests and affected suites pass; the project-defined full required
      checks pass before seal or commit.
- [ ] Docs synced with changes. If any file under `docs/` was touched, it
      conforms to the rules in `docs/okf-conventions.md`.

Archive and commit according to the requested delivery scope and project workflow.
If the user asks to review first, leave the work uncommitted and the change
unarchived, and report that state. Before committing, pass the configured
pre-commit gate; never bypass it with `git commit --no-verify`.
Do not describe implementation completion as archival or delivery completion.

> **Enforcement scales with the project.** The pre-commit hook is the boundary
> for small/solo projects; projects with CI run the same checks server-side on
> push. Only what the configured gate actually enforces is guaranteed here.

## 6. Cross-Tool Notes

- This managed document is the shared operational policy. `AGENTS.md` is the
  tool-neutral entrypoint that requires agents to read it.
- If a tool-specific config file exists (e.g. a Claude-only `CLAUDE.md`), keep
  it lean and have it **import or point to** the shared entrypoint or this
  document rather than duplicating policy.
- Use each provider's OpenSpec integration for the same artifacts and workflow.
  Provider-native planning artifacts do not replace OpenSpec.
