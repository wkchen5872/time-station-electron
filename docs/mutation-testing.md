---
type: Playbook
title: Mutation Testing Playbook
description: Stage-based mutation testing with testland/qa runners, survivor triage, and comparable score policy.
tags: [testing, mutation-testing, tdd, testland]
timestamp: 2026-09-04T00:00:00+08:00
---

<!-- Managed by wk-agent-ops · do not edit here — re-running install.sh overwrites this file. -->

# Mutation Testing Playbook

Mutation testing checks whether tests notice small faults in production code.
`wk-agent-ops` owns the TDD integration, language mapping, score policy, cadence,
and safety boundaries. [testland/qa](https://github.com/testland/qa) owns the
language runners and survivor triage.

## Skills installed by language profile

Running `scripts/skills/install.sh <profile>` installs one runner plus
`mutant-survival-triage` with project scope for Claude Code, Codex, and
Antigravity. The installer uses the skills CLI default link mode; it does not
use global scope or copy mode.

| Profile | Language | Runner skill | Triage skill |
|---|---|---|---|
| `node` | JavaScript / TypeScript | `stryker-mutation` | `mutant-survival-triage` |
| `python` | Python | `mutmut-mutation` | `mutant-survival-triage` |
| `jvm` | Java / Kotlin | `pitest-mutation` | `mutant-survival-triage` |
| `dotnet` | .NET | `stryker-net-mutation` | `mutant-survival-triage` |

Common-only installation does not guess a language and installs no mutation
skills. If automatic installation fails, the installer prints the exact
`npx skills add testland/qa` command to replay from the target repository.

The common installer installs Agent skills only. It does not install a mutation
runner package or edit the target project's manifest, lockfile, mutation config,
or test command. When a runner skill later proposes those changes, repository
policy remains authoritative: preserve the existing package manager and
lockfile, show side effects, obtain required consent, and never clear unrelated
worktree changes.

## Five-step closed loop

```text
[OpenSpec scenario / acceptance criteria]
                  │
                  ▼
Red ──► Green ──► Refactor ──► Mutate ──► Triage
  ▲                                         │
  └──────── confirmed test gap ─────────────┘
```

1. **Red** — write and run the smallest test that fails because the specified
   behavior is missing.
2. **Green** — implement only enough production behavior to pass.
3. **Refactor** — improve production and test structure while tests stay green.
4. **Mutate** — after the feature or stage is complete and normal tests are
   green, invoke the language runner for the intended scope.
5. **Triage** — invoke `mutant-survival-triage`; return to TDD only for a
   confirmed test gap.

Do not run mutation testing after every Red/Green step. TDD is the fast daily
loop; mutation testing is a stage-level review of test strength.

## Survivor decisions

| Classification | Action |
|---|---|
| `missing-case` | Add a failing test, then run Red → Green → Refactor. |
| `weak-assertion` | Produce Red evidence for the weakness, then strengthen the existing assertion; a new test file is not required. |
| `equivalent-mutant` | Record the observable-equivalence reason; do not add a meaningless test. |
| `unreachable` | Prove the code is unreachable, then prefer deleting dead code. No coverage alone is not proof. |
| `flaky-killer` | Treat the result as unreliable, stabilize the test, and rerun the relevant scope. |

Keep runner-native statuses separate when available: killed, survived, no
coverage or untested, timeout, invalid/error, and skipped. A failed baseline
test, runner error, or incomplete report makes the run invalid; do not derive a
score verdict from it.

## Execution cadence and scope

| Stage | Normal tests | Mutation testing |
|---|---|---|
| Each small TDD iteration | Focused test | Do not run |
| Module complete | Affected suite | That module |
| Pull Request | Required tests | Changed files or runner incremental mode |
| Main branch schedule | Full required checks | Full configured mutation universe |
| Before release | Full required checks | Full run for critical business modules |

Scope syntax belongs to each runner skill. For example, StrykerJS documents
incremental mode for reusing a prior result and reducing repeated work. Always
record the actual scope and exclusions; an incremental report still needs that
context.

## Mutation score policy

Do not begin with an arbitrary universal threshold such as 80%.

1. The first valid run establishes a baseline.
2. CI may enforce no regression only for comparable runs.
3. After important survivors are resolved, deliberately raise the baseline or
   ratchet threshold.
4. Permission, transaction, and amount-calculation modules may use explicitly
   configured higher thresholds.

Runs are comparable only when the project unit, runner and major version,
mutation configuration, test command, mutator set, scope, and exclusion policy
are compatible. Otherwise report `inconclusive`; do not update the baseline or
claim a score regression. A 100% score describes only the executed scope and is
not proof that the entire test suite is effective.

## Migration from wk-agent-ops legacy skills

The installer removes only the generated `mutation-setup` and `mutation-check`
skill directories. Existing `.mutation-state` or `openspec/.mutation-state`
files may contain human equivalent/deferred reasons, so they are preserved as
legacy records. Remove them only after those decisions have been reviewed or
transferred.

# Citations

[1] [testland/qa](https://github.com/testland/qa)
[2] [Vercel Labs skills CLI](https://github.com/vercel-labs/skills)
[3] [StrykerJS documentation](https://stryker-mutator.io/docs/stryker-js/introduction/)
[4] [StrykerJS incremental mode](https://stryker-mutator.io/docs/stryker-js/incremental/)
[5] [mutmut documentation](https://mutmut.readthedocs.io/en/latest/)
[6] [PIT mutation testing](https://pitest.org/)
[7] [Stryker.NET documentation](https://stryker-mutator.io/docs/stryker-net/introduction/)
