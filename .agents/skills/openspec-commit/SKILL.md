---
name: openspec-commit
description: >
  Finish an OpenSpec change by coordinating archive, documentation update, and
  a conventional git commit. Supports Claude Code, Codex, and Antigravity.
license: MIT
compatibility: Requires openspec CLI and git.
metadata:
  author: wkchen
  version: "2.2"
---

# OpenSpec Commit

Complete a feature inside its isolated worktree after implementation and
verification:

1. `openspec-archive-change`
2. `doc-updater`
3. `git-commit-writer`

This skill coordinates those capabilities; it does not duplicate their logic.

**Input:** An optional active change name. If omitted, resolve it from the
current OpenSpec and Git state. Never guess when multiple candidates exist.

Resolve available attribution at Step 5. Model precision or absence must not
block archive, documentation handling, or commit.

---

## Provider action routing

Invoke capabilities by name. Provider-native OPSX files are aliases for the
same OpenSpec action, not additional workflow steps.

| Provider | OpenSpec capability source | Native alias |
|---|---|---|
| Claude Code | `.claude/skills/openspec-archive-change/` | `.claude/commands/opsx/archive.md` |
| Codex | `.codex/skills/openspec-archive-change/` | skill invocation; no project command file |
| Antigravity | `.agent/skills/openspec-archive-change/` | `.agent/workflows/opsx-archive.md` |

The same OpenSpec naming pattern applies to
`openspec-apply-change`, `openspec-bulk-archive-change`, and
`openspec-continue-change`; their native OPSX action IDs are `apply`,
`bulk-archive`, and `continue`.

Project-owned portable skills from wk-agent-ops are installed separately to
`.claude/skills/` and the plural shared root `.agents/skills/`.

**Do not invoke both** an `openspec-*` capability and its OPSX alias. Invoke
exactly one provider entry point for the capability. If the host cannot nest a
skill call, follow the named capability's instructions in the current context.

---

## Step 1 — Resolve active or resumable context

Inspect both sources:

```bash
openspec list --json
git status --short
```

From Git status, collect top-level directories changed under
`openspec/changes/archive/`. These are resumable archives from an earlier run
whose archive step completed but docs or commit did not.

Resolution rules:

1. **Explicit change name**
   - Matching active change → select it for archive.
   - Otherwise, matching uncommitted archive (after stripping its date prefix)
     → select it and resume.
   - No match → stop and report the missing change.
2. **No explicit name**
   - Exactly one candidate across active changes and resumable archives → use it.
   - Multiple candidates → ask the user to select; do not guess.
   - No candidates → ask whether to run docs + commit without OpenSpec context.
     If declined, stop.

Record:

```text
change_id=<selected change, if any>
archive_path=<exact resumable archive path, if already archived>
resume=<true|false>
```

---

## Step 2 — Archive or resume

### Active change

Invoke exactly one provider entry point for the capability
`openspec-archive-change`, passing `change_id`.

Wait for its full flow, including artifact/task warnings and the spec-sync
decision. Both "sync" and an explicitly chosen "skip sync" are valid archive
outcomes.

Capture its result:

```text
change_id
archive_path
spec_sync_status=<synced|skipped|no_delta_specs>
warnings=<list, possibly empty>
```

Validate that the returned `archive_path` exists. If archive failed or the path
is absent, stop without invoking downstream capabilities.

### Resumable archive

Do not invoke archive again. Reuse the exact `archive_path` selected from Git
status, validate it exists, and set:

```text
spec_sync_status=already_archived
warnings=<preserved warning if sync status cannot be reconstructed>
```

### No OpenSpec context

Skip archive and leave `change_id` and `archive_path` empty.

---

## Step 3 — Prepare the complete diff

This workflow is an explicit request to commit all changes in the isolated
feature worktree. Stage them once so new files, spec sync, and the archive move
are visible to `doc-updater` through `git diff HEAD`:

```bash
git add -A
git diff --cached --stat
```

If the staged diff is empty, stop and report that there is nothing to document
or commit.

---

## Step 4 — Invoke doc-updater

Invoke exactly one provider entry point:

- **Claude Code:** invoke the provider-native `doc-updater-agent` subagent.
- **Codex:** spawn the provider-native `doc-updater-agent` custom agent.
- **Every other provider:** invoke the portable `doc-updater` skill from
  `.agents/skills/doc-updater/`. If the host cannot nest a skill call, follow
  that skill's instructions in the current context.

Claude Code and Codex MUST NOT silently fall back to the portable skill. If the
required subagent is unavailable, stop and report the missing provider
configuration.

For Claude Code and Codex, invoke the exact custom agent name only. Do not pass a spawn `model` or `reasoning_effort`; the provider-native agent configuration
owns those runtime settings.

Pass the selected entry point:

```text
change_id=<change_id, when available>
archive_path=<exact archive_path, when available>
```

`doc-updater` must combine archived proposal/spec intent with `git status` and
`git diff HEAD` evidence. Wait for it to complete, then capture:

```text
docs_updated=<list>
docs_skipped_reason=<reason, when no update was needed>
```

If an explicit archive path is invalid or documentation editing reports a
conflict, stop before commit.

---

## Step 5 — Invoke git-commit-writer

Resolve the attribution pair now, immediately before commit delegation:

```text
tool_name=<executing agent tool>
assisting_model=<current root-session model>
```

Use the agent tool that owns the root session (`Codex`, `Claude Code`, or
`Antigravity`), not an outer host surface. Record the most specific model name
actually known for the current root session. Accept `GPT-5`, `GPT-5.6`, or `GPT-6`; do not invent
a variant, version, or context size. Preserve a user-supplied name for this work
verbatim when it describes the current collaboration; otherwise use the current runtime model name automatically.
This records current collaboration, not original code authorship. Pre-existing
changes, another implementation session, or a commit-only root session MUST NOT
cause omission of a known current model. After a root model switch, use the
currently known model rather than a stale name from before the switch.
You MUST NOT ask the user to repeat it or provide a more precise name to commit.
Reuse confirmed attribution for later commits in the same session while the
root model remains unchanged.

Provider-native documentation and commit subagents MUST NOT replace or make the root-session attribution ambiguous.
Tool names are not model names. Only if the current root-session model is unknown, omit
`assisting_model` from the handoff and report the omitted `AI-Assisted-By` trailer;
do not block the commit. A known `GPT-5` MUST be recorded, not omitted.
MUST NOT parse session logs or use private transcript formats.
MUST NOT use documentation lookup, environment variables, or Git history to
infer a model name that is not available in the current context.

`assisting_model` is Git attribution metadata only, at the available precision.
It MUST NOT be used as a subagent spawn model or reasoning-effort override.
This workflow MUST NOT request or require `assisting_model` before archive or documentation handling.

Pass the same exact archive context plus the tool and optional model as task input
(omit the `assisting_model` field entirely when unknown):

```text
change_id=<change_id, when available>
archive_path=<archive_path, when available>
tool_name=<executing agent tool>
assisting_model=<current root-session model>
```

- **Claude Code:** invoke the provider-native `git-commit-writer-agent`
  subagent with these values in its task prompt.
- **Codex:** spawn the provider-native `git-commit-writer-agent` custom agent
  with these values.
- **Every other provider:** invoke the portable `git-commit-writer` skill from
  `.agents/skills/git-commit-writer/`. If the host cannot nest a skill call,
  follow that skill's instructions in the current context.

Claude Code and Codex MUST NOT silently fall back to the portable skill. If the
required subagent is unavailable, stop and report the missing provider
configuration. The commit-only agent must preserve `assisting_model`; it MUST
NOT replace the current root-session model with its own model.

For Claude Code and Codex, invoke the exact custom agent name only. Do not pass a spawn `model` or `reasoning_effort`; the provider-native agent configuration
owns those runtime settings.

The writer owns final staging, empty-diff validation, commit execution, and
restaging before a pre-commit retry. Wait for and capture `commit_hash`.

---

## Step 6 — Verify and summarize

Inspect the result:

```bash
git show --stat --oneline HEAD
git status --short
```

Report:

```text
✅ Feature committed

📦 Archive: <archive_path or "No OpenSpec context">
   Specs:   <spec_sync_status>
   Warnings: <warnings or "None">

📝 Docs:
   <docs_updated or docs_skipped_reason>

💾 Commit: <commit_hash and subject>
```

If Git status still contains changes, list them and do not claim the worktree is
clean.

Next step for the documented worktree flow:

```text
wt-done <feature-name>
```

---

## Error handling

| Situation | Action |
|---|---|
| Multiple active/resume candidates | Ask the user; never select the first |
| Archive fails or path is absent | Stop before docs and commit |
| Explicit archive context is invalid | Stop; do not fall back to newest archive |
| Doc update conflicts | Stop and show the conflicting files |
| Commit hook fails | Let `git-commit-writer` fix, restage, and retry without `--no-verify` |
| Workflow is rerun after archive | Resume from the exact uncommitted archive |
