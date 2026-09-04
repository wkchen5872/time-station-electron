---
name: "OPSX: Commit"
description: Finish an OpenSpec change through the project-owned openspec-commit skill
argument-hint: "[change-name]"
category: Workflow
tags: [workflow, commit, openspec]
---

Delegate this command to the project-owned `openspec-commit` skill.

**Input:** Forward `$ARGUMENTS` unchanged as the optional OpenSpec change name.

Use the **Skill tool** to invoke `openspec-commit` exactly once with
`$ARGUMENTS`.

Do not run archive, documentation update, or commit as separate actions. The
skill owns the complete workflow, resume logic, and context hand-offs.
