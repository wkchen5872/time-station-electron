<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

1. Populate your project context:
   "Please read openspec/project.md and help me fill it out
    with details about my project, tech stack, and conventions"

2. Create your first change proposal:
   "I want to add [YOUR FEATURE HERE]. Please create an
    OpenSpec change proposal for this feature"

3. Learn the OpenSpec workflow:
   "Please explain the OpenSpec workflow from openspec/AGENTS.md
    and how I should work with you on this project"

嚴格限制 Emoji 使用：原則上禁止在對話與文案中使用 Emoji 作為情緒表達或裝飾。
  - 允許例外 1：功能性狀態符號 (僅限使用：✅, ⚠️, ❌)。
  - 允許例外 2：若 Emoji 屬於程式碼字串、原始資料或引用內容的一部分，請原樣保留。