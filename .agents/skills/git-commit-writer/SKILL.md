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
  version: "1.6"
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
assisting_model=<current root-session model>
```

When archive_path and change_id are provided, use them directly. They are a
pair: if only one is provided, stop and report the invalid input.

`tool_name` identifies the collaborating tool, such as `Codex` or `Claude Code`.
`assisting_model` is optional. Record the most specific model name actually
known for the current collaborating root session. Accept `GPT-5`, `GPT-5.6`, or `GPT-6`;
do not invent a variant, version, or context size to make the name more precise.
Preserve a user-supplied model name for this work verbatim; otherwise use the
model name available in the current runtime context automatically.
Apply the same rule to later standalone commits in that session while the root
model remains unchanged. You MUST NOT ask the user to repeat it or provide a
more precise model name just to commit.

Provider-native documentation and commit subagents MUST NOT replace or make root-session attribution ambiguous.
This records current collaboration, not original code authorship. Pre-existing
changes, another implementation session, or a commit-only root session MUST NOT
cause omission of a known current model. After a root model switch, use the
currently known model; do not reuse a stale name from before the switch.
Tool names such as `OpenAI Codex` are not model names. Only when no model name
is known for the current root session, omit `AI-Assisted-By` and report the omission;
do not block the commit. A known `GPT-5` MUST be recorded, not omitted.
You MUST NOT guess attribution from environment variables, documentation,
session logs, Git history, or the commit-only agent's identity.

`assisting_model` is Git attribution metadata only. It identifies the known
current root-session collaboration model, at the available precision.
It MUST NOT select or override this writer's runtime model or reasoning effort.

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

Preserve supplied attribution values. For standalone use, identify the executing
tool and resolve the optional model name using the rules above. A missing model
name or variant is not a staging or commit gate. Never substitute a tool name
for an unknown model.

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
tool name and MUST NOT guess an address. When the current root-session model is known,
follow it immediately with the model trailer:

```bash
git commit -m "<message>

<resolved Co-Authored-By trailer>
AI-Assisted-By: <assisting_model>"
```

When the model is unknown, omit the entire `AI-Assisted-By` line, not an empty
value or placeholder, and mention the omission in the result.

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
