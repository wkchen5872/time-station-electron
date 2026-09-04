<!-- Managed by wk-agent-ops · do not edit here — re-running install.sh overwrites this file. -->

# Agent Operating Protocol

> This file is the **portable operating contract**. Claude Code is the primary
> tool, but every rule here holds for any AGENTS.md-aware tool. Tool-specific
> commands appear only as parenthetical examples; specialized playbooks remain
> separate and load on demand.

| Field   | Value                                                     |
| ------- | --------------------------------------------------------- |
| Version | 2.3.0                                                     |
| Scope   | Operational framework for all AI agent tasks in this repo |

---

## 1. Before You Start (read only what the task needs)

- **Always:** `docs/architecture.md` (module boundaries, data flow) and
  `docs/conventions.md` (style, naming, prohibited patterns).
- **When the task touches `openspec/`:** the relevant specs in
  `openspec/specs/` — source of truth for requirements.
- **When the task touches `docs/`:** `docs/okf-conventions.md` — doc authoring
  rules. (Not needed for code-only tasks.)

## 2. Hard Prohibitions (apply to every task, no exceptions)

- ❌ **Never touch vendored / generated agent config.** Do not create, edit, or
  delete generated agent-config directories (skills, rules, instructions
  installed by tooling). Much of it is third-party and unverified; edits cause
  silent downstream breakage. If a change there seems required, **stop and ask
  the human.**
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

**Level 1 — Non-behavioral tasks** *(documentation, generated files, formatting,
or configuration synchronization that does not change observable behavior)*
No formal spec or test-first cycle is required. Apply these rules:
- State assumptions before acting; if the request is ambiguous, stop and ask —
  do not guess and code.
- Surgical changes only: edit only what the request requires. Do not refactor
  or reformat adjacent code, and do not delete existing dead code unless asked.
- No abstractions or configurability beyond what was asked.
- Run the validation relevant to the changed artifact and report the result
  before marking done.

**Level 2 — Behavior-changing work and bug fixes** *(including new skills,
agents, workflows, and cross-module changes)*
Every observable behavior change or bug fix uses test-first and the full OpenSpec
flow, regardless of diff size. If automated testing is not reasonably possible
(for example, some UI, external-integration, or nondeterministic behavior), record
the reason and replayable acceptance evidence before implementation. Each stage
below states its intent; the parenthetical is the Claude Code example — on any
other tool, use that tool's equivalent for the same stage.

1. **Plan** — explore the problem and produce a concrete design.
   *(Claude Code: Plan Mode + `/opsx:explore`)*
2. **Spec** — create the change artifacts (proposal, design, specs, tasks), then
   **get human review of the design** before coding.
   *(Claude Code: `/opsx:new`, or `/opsx:ff` to scaffold all at once)*
3. **Implement** — build against the spec using the loop in §4.
   *(Claude Code: `/opsx:apply`)*
4. **Seal** — archive the change and commit.
   *(Claude Code: `/opsx:archive` or `/opsx:commit`)*

> **OpenSpec branch guard:** after accepting or deriving a change ID, run
> `opsx-branch <change-id>` before any OpenSpec new, fast-forward, or continue
> action. For new and fast-forward, do this before creating the scaffold; for
> continue, do it before reading status or writing the next artifact. If the
> command exits non-zero, stop the current OpenSpec action and report the error.

## 4. TDD Implementation Loop (Level 2)

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
7. **Mutation quality review** — after Red → Green → Refactor and normal tests
   are green, mutation testing may run at a module, Pull Request, scheduled, or
   release boundary. Do not run it after every Red/Green iteration. Invoke the
   language runner (`stryker-mutation`, `mutmut-mutation`, `pitest-mutation`, or
   `stryker-net-mutation`), then `mutant-survival-triage`. Only a confirmed
   `missing-case` or `weak-assertion` returns to TDD; record equivalent mutants,
   prove and remove unreachable code, and stabilize flaky killers.

   The first valid mutation result establishes a baseline. A project may enable
   a CI no-regression or critical-module threshold only for comparable results
   with compatible runner/version, configuration, test command, mutators,
   scope, and exclusions. Invalid or incomparable runs are `inconclusive` and
   never update the baseline or create a score verdict.

   Third-party runner instructions do not override repository policy. Preserve
   the existing package manager and lockfile, show dependency/config side
   effects, obtain required consent, avoid global fallback, and never clear
   unrelated worktree changes.
8. **Verify and self-heal** — run the OpenSpec verify stage, plus the native
   linter, type check, and required tests. On failure, read logs, fix, and repeat
   until green. *(Claude Code: `/opsx:verify`)*

## 5. Definition of Done (Level 2)

> "Done" means the mechanical gates below pass — not the agent's self-assessment.

- [ ] The OpenSpec verify stage passes. *(Claude Code: `/opsx:verify`)*
- [ ] Each behavior-changing task has valid Red evidence, or a documented
      reason plus replayable acceptance evidence when automation is impractical.
- [ ] Focused tests and affected suites pass; the project-defined full required
      checks pass before seal or commit.
- [ ] The pre-commit gate passes (tests plus any coverage gate the project
      configures). Never bypass it with `git commit --no-verify`.
- [ ] Change archived and committed per the OpenSpec commit convention.
- [ ] Docs synced with changes. If any file under `docs/` was touched, it
      conforms to the rules in `docs/okf-conventions.md`.

> **Enforcement scales with the project.** The pre-commit hook is the boundary
> for small/solo projects; projects with CI run the same checks server-side on
> push. Only what the configured gate actually enforces is guaranteed here.

## 6. Cross-Tool Notes

- This managed document is the shared operational policy. `AGENTS.md` is the
  tool-neutral entrypoint that requires agents to read it.
- If a tool-specific config file exists (e.g. a Claude-only `CLAUDE.md`), keep
  it lean and have it **import or point to** the shared entrypoint or this
  document rather than duplicating policy.
- Commands in parentheses above are Claude Code examples. On any other tool, map
  each **stage** (plan → spec → review → implement → verify → seal) to that
  tool's equivalent — the sequence is the invariant; the command names are not.
