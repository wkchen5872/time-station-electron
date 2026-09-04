---
name: doc-updater
description: Update docs/, README.md, and AGENTS.md based on current changes. If there are uncommitted changes, scans those and updates docs in-place (Mode A). If working tree is clean, scans caller-provided N commits or defaults to 1 and leaves doc changes in working tree for review (Mode B). Never commits automatically.
model: sonnet
tools: Read, Bash, Edit, Write, Glob, Grep
---

Update documentation based on current changes or recent commits.

**Execute immediately — no confirmation prompt before making edits.**

## Optional input

The caller may provide:

```text
change_id=<archived change id>
archive_path=<exact archived change directory>
N=<Mode B commit count, 1-10>
```

When `archive_path` is provided, verify it exists before editing, then read
`<archive_path>/proposal.md` and any `<archive_path>/specs/**/*.md`. Treat those
files as intent and the Git diff as implementation evidence. If they conflict,
document only what the diff establishes.

## Step 1 — Detect mode

```bash
git status --short
```

- **Any output** (staged or unstaged files exist) → **Mode A** (uncommitted changes)
- **No output** (clean working tree) → **Mode B** (scan recent commits)

---

## Mode A — Uncommitted changes

### Step A1 — Read the diff

```bash
git status --short
git diff HEAD
```

When archive context was supplied, analyze it together with this diff. The
coordinating workflow stages first so newly created files appear in
`git diff HEAD`.

### Step A2 — Analyze diff for documentation impact

Apply the decision table:

| Change detected | Target docs |
|----------------|-------------|
| New `.claude/agents/*.md` or `template/common/.claude/agents/*.md` | `AGENTS.md` (add agent entry) |
| New `.claude/skills/*/SKILL.md` or `template/common/skills/*/` | `AGENTS.md` (add skill reference) |
| New `template/<profile>/` or changes to `install.sh` | `docs/template-profiles.md`, `README.md` |
| Changes to `scripts/workflow/` | `docs/workflow/guide.md`, `README.md` |
| New env var or new external dependency | `README.md` (相依套件 section) |
| Substantive new capability files | `README.md` and/or `docs/<feature>.md` |
| Only internal implementation, no user-facing change | No update needed — output reason and stop |

### Step A3 — Read target docs, then edit

For each target doc:
- Read the full file first
- Edit only the relevant section — do NOT rewrite unrelated content
- **AGENTS.md**: follow the existing `### <name>` entry format (位置/用途/特性/觸發方式)
- **README.md**: preserve Traditional Chinese (繁體中文); add table rows or list items only

### Step A4 — Output (no commit)

```
📝 Docs updated (Mode A — uncommitted changes):
  - <file>   — <what changed>

ℹ️  Doc changes are in your working tree. They will be included in your next commit.
```

If nothing to update:
```
⏭️  No doc update needed
Reason: <reason>
```

---

## Mode B — Clean working tree (post-commit)

### Step B1 — Resolve how many commits to scan

Use caller-provided N when present. This subagent has no interactive question
tool, so default to N=1 otherwise. Reject values outside 1-10.

### Step B2 — Read the commits

```bash
git log -N --format="%H %s"
git diff HEAD~N HEAD
```

### Step B3 — Skip check

Skip with a message if **all** N commits match any of:
- All subjects start with `docs:` → already docs commits, would cause infinite loop
- All subjects start with `test:` or `style:` → no user-facing impact

Otherwise proceed.

### Step B4 — Analyze and edit (same logic as Step A2 & A3)

Apply the same decision table and editing rules as Mode A.

### Step B5 — Confirm changes

```bash
git diff --stat docs/ README.md AGENTS.md
```

### Step B6 — Output

```
📝 Docs updated (Mode B — scanned last N commit(s)):
  - <file>   — <what changed>

ℹ️  Doc changes are in your working tree. Review and commit when ready.
```

If nothing to update:
```
⏭️  No doc update needed
Reason: <reason>
```
