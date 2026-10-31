---
type: Playbook
title: OpenSpec Workflow
description: Shared OpenSpec planning, review, implementation, verification, and delivery workflow.
tags: [agents, openspec, workflow]
timestamp: 2026-09-15T00:00:00+08:00
---

<!-- Managed by wk-agent-ops · do not edit here — re-running install.sh overwrites this file. -->

# OpenSpec Workflow

Use this playbook when [Agent Operating Protocol](agent-protocol.md) requires
formal planning or the task follows an existing OpenSpec change. These are
repository workflow requirements, not a description of upstream CLI defaults.

## 1. Explore and select the change

Read the relevant existing specs and active changes. Clarify the outcome,
acceptance criteria, affected boundaries, and unresolved decisions. Reuse an
applicable change; create a new one only when needed. Exploration alone does
not require creating artifacts or an implementation branch.

OpenSpec owns requirements, design, and implementation tasks. A provider's
execution mode or progress display may assist, but must not replace those
artifacts or introduce a separate development plan.

## 2. Prepare the branch

After accepting or deriving a change ID, run `opsx-branch <change-id>` before
any OpenSpec new, fast-forward, or continue action. For new and fast-forward,
do this before creating the scaffold; for continue, do it before reading status
or writing the next artifact. If the command exits non-zero, stop the current
OpenSpec action and report the error. If the helper is unavailable, report the
missing prerequisite; do not silently skip the guard.

When the active Provider sandbox is known to protect Git metadata, request the
minimum required Git-write permission on the first attempt; do not run a
guaranteed-to-fail sandbox probe first.

## 3. Specify and review

Use the installed OpenSpec skills or integration and the project's configured
schema to create the required artifacts, such as proposal, design, specs, and
tasks. Do not create provider-native plan or task files as substitutes.

Obtain human review of the design before implementation. Existing approval
remains valid while scope and decisions remain unchanged. Material requirement
or design changes need renewed review of the changed decisions.

For behavior that cannot reasonably be tested automatically, record the reason,
replayable acceptance steps, and expected results before implementation. Add
actual results after implementation; a proposed check is not passing evidence.

## 4. Implement and verify

Read the active change's artifacts and implement its tasks using the protocol's
TDD loop. Keep tasks and evidence current. Run the applicable project checks
and OpenSpec verification before reporting implementation complete. A spec
review does not replace executing tests or acceptance checks.

## 5. Deliver within the requested scope

When archival is requested or part of the authorized project workflow, use the
OpenSpec archive process, including required reconciliation of delta specs.
Commit only within the requested delivery scope and after required checks pass.
For review-first work, leave changes unarchived and uncommitted and report what
was verified and what remains. Archival, commit, merge, and deployment are
separate actions; completing one does not imply completing the others.

## Integration entrypoints

Use the installed integration for each stage: explore, new/fast-forward/continue,
apply, verify, and archive/commit. Load its instructions when invoking it rather
than duplicating command mechanics here. If no OpenSpec integration is available,
report the prerequisite instead of falling back to provider-native planning.
