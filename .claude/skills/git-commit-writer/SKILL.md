---
name: git-commit-writer
description: >
  Stage the completed worktree, generate a Conventional Commits message, and
  execute the commit. Uses explicit OpenSpec archive context when supplied and
  auto-detects context only for standalone use.
license: MIT
compatibility: "Requires git. Optional: openspec CLI."
metadata:
  author: wkchen
  version: "1.4"
---

# Git Commit Writer

Create one conventional commit from the completed worktree.

**No confirmation prompt — invocation authorizes final staging and commit.**

## Optional input

The caller may provide:

```text
archive_path=<exact archived change directory>
change_id=<OpenSpec change id without date prefix>
tool_name=<executing agent tool>
assisting_model=<primary implementation model>
```

When archive_path and change_id are provided, use them directly. They are a
pair: if only one is provided, stop and report the invalid input.

`tool_name` and `assisting_model` are also a pair. `openspec-commit` always
supplies both. For standalone use, accept exact runtime-provided identities; if
either value is unavailable or uncertain, stop and request it. You MUST NOT
guess an identity from environment variables, model families, or vendor
domains.

---

## Step 1 — Validate optional OpenSpec input

### Explicit context

When archive_path and change_id are provided, verify the exact archive before
staging:

```bash
if [ ! -d "$archive_path" ]; then
  echo "❌ Archive not found: $archive_path"
  exit 1
fi
```

Keep the verified pair as explicit context. Never replace an invalid explicit
path with auto-detection. Do not resolve standalone context yet.

### Attribution context

When `tool_name` and `assisting_model` are provided, preserve both exact values.
If only one is provided, stop. When neither is provided, standalone resolution
may use exact identities supplied by the current runtime; if either identity is
uncertain, stop before staging and request the missing value.

---

## Step 2 — Stage and gather the final diff

Stage all changes before inspecting the commit content:

```bash
git add -A

if git diff --cached --quiet; then
  echo "ℹ️ Nothing to commit"
  exit 0
fi

git diff --cached --name-only
git diff --cached --stat
git diff --cached
```

---

## Step 3 — Resolve OpenSpec context

### Explicit context

When the pair from Step 1 is valid, use it directly and read
`<archive_path>/proposal.md`, focusing on **Why** and **What Changes**.

### Standalone context resolution

Only when explicit context is absent, inspect the current branch, active
changes, and final staged paths:

```bash
git branch --show-current
openspec list --json
git diff --cached --name-only
```

Build a candidate set using exact path components, never substring matching:

- An active change is associated only when it appears in `openspec list --json`
  and either the branch is exactly `feature/<change-id>` or a staged path is
  beneath `openspec/changes/<change-id>/`.
- An archive is associated only when a staged path is beneath its exact
  `openspec/changes/archive/<archive-directory>/` directory. Derive its change
  ID only after that directory is associated.

The number of active changes does not create an association.
A sole active change without either association is not context.

Resolve the filtered set:

- **Zero associated candidates** — use only the staged diff and omit the
  OpenSpec scope. Do not read an unrelated proposal.
- **One associated candidate** — use its change ID and proposal as context.
- **Multiple associated candidates** — ask the user to select one when the host
  supports interaction; otherwise stop and list them. Never choose the first.

---

## Step 4 — Infer commit type

| Change nature | type |
|---|---|
| New feature or capability | `feat` |
| Bug fix | `fix` |
| Restructuring without behavior change | `refactor` |
| Documentation only | `docs` |
| Scripts, config, tooling, maintenance | `chore` |
| Tests | `test` |

Use both the staged diff and proposal when archive context exists. The staged
diff is authoritative for what the commit actually contains.

---

## Step 5 — Format the message

With OpenSpec context:

```text
<type>(<change_id>): <subject>

<body>
```

Without OpenSpec context:

```text
<type>: <subject>

<body>
```

Rules:

- Subject uses imperative mood, has at most 72 characters, and no trailing
  period.
- Body is 2–5 lines explaining what changed and why.
- Never claim a proposal item that is absent from the staged diff.

---

## Step 6 — Commit

Build the co-author trailer from this strict verified mapping:

| `tool_name` | Trailer |
|---|---|
| `Codex` | `Co-Authored-By: Codex <noreply@openai.com>` |
| `Claude Code` | `Co-Authored-By: Claude Code <noreply@anthropic.com>` |

Unmapped tools use `Co-Authored-By: <tool_name>` without an email. Preserve the
tool name and MUST NOT guess an address. Follow it immediately with the primary
implementation model supplied by the caller:

```bash
git commit -m "<message>

<resolved Co-Authored-By trailer>
AI-Assisted-By: <assisting_model>"
```

If a pre-commit hook fails:

1. Read the failure output and fix the in-scope issue.
2. **Re-run `git add -A`** so hook or formatter changes enter the commit.
3. Confirm `git diff --cached` still contains the intended change.
4. Retry `git commit` without `--no-verify`.

---

## Step 7 — Output

```bash
git log -1 --format='%h %s'
```

Report:

```text
💾 Commit: <short-hash> <type>(<change_id>): <subject>
```

Omit `(<change_id>)` when no OpenSpec context exists.
