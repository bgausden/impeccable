---
applyTo: "source/**/*.md,dist/**/*,.agents/skills/**/*.md,.claude/skills/**/*.md,.codex/skills/**/*.md,.cursor/skills/**/*.md,.gemini/skills/**/*.md,.github/skills/**/*.md,.kiro/skills/**/*.md,.opencode/skills/**/*.md,.pi/skills/**/*.md"
---

`source/skills/**/SKILL.md` and `source/copilot-cli/**` are the editable source of truth in this repository.

Do not hand-edit generated files in `dist/` or provider output folders such as `.github/skills/`, `.agents/skills/`, `.codex/skills/`, or other root-level generated skill directories. Change the matching source file, then rerun `npm run build`.
