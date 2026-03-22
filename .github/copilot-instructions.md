Impeccable is a source-driven build system for cross-provider AI skills and commands.

Always edit the source files in `source/` and the build logic in `scripts/`. Do not hand-edit generated provider outputs in `dist/` or the generated provider directories in the repository root such as `.cursor/`, `.claude/`, `.codex/`, `.agents/`, `.github/skills/`, `.kiro/`, `.opencode/`, or `.pi/`.

Key paths:
- `source/skills/**/SKILL.md` plus optional `reference/*.md` files are the single source of truth for skills.
- `source/copilot-cli/` is the single source of truth for Copilot CLI instruction files.
- `scripts/lib/transformers/*.js` contains provider-specific transforms.
- `scripts/build.js` orchestrates provider generation, universal bundles, and local sync back into the repository root.
- `lib/download-providers.js`, `server/lib/api-handlers.js`, and `functions/api/download/**` must stay in sync for downloadable provider artifacts.
- `public/` contains the static website, `server/` contains the local dev server, and `functions/` contains production download handlers.

Validation workflow:
- Run `npm run build` after changing source skills, Copilot instruction sources, transformers, or provider wiring.
- Run `npm test` after changing code.
- If you modify CSS in `public/css/`, also run `npm run css:build`.

When adding or changing a provider, update the transformer registry, build orchestration, universal bundle assembly, download provider registry, and user-facing installation docs together. If the provider writes to `.github`, never delete or overwrite unrelated repository files such as workflows, templates, or CODEOWNERS.
