---
description: Finish an OpenSpec change through the project-owned openspec-commit skill
---

Delegate this workflow to the project-owned `openspec-commit` skill after the
OpenSpec apply stage.

**Input:** Treat any text after `/opsx-commit` as the optional OpenSpec change
name and pass it unchanged.

Activate `openspec-commit` exactly once.

Do not run archive, documentation update, or commit as separate actions. If
nested skill activation is unavailable, follow
`.agents/skills/openspec-commit/SKILL.md` in the current context.
