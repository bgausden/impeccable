# Impeccable

The vocabulary you didn't know you needed. 1 skill, 20 commands, and curated anti-patterns for impeccable style. Works with Cursor, Claude Code, GitHub Copilot CLI, Gemini CLI, Codex CLI, VS Code Copilot, and more.

## Repository Purpose

Maintain a **single source of truth** for design-focused skills and commands, then automatically transform them into provider-specific formats. Each provider has different capabilities (frontmatter, arguments, modular files), so we use a build system to generate appropriate outputs.

## Architecture: Option A (Feature-Rich Source)

We use a **feature-rich source format** that gets transformed for each provider:

- **Source files** (`source/`): Full metadata with YAML frontmatter, args, descriptions
- **Build system** (`scripts/`): Transforms source → provider-specific formats
- **Distribution** (`dist/`): Committed output files for each supported provider

### Why Option A?

Cursor doesn't support frontmatter or arguments (lowest common denominator). Instead of limiting all providers, we:
1. Author with full metadata in source files
2. Generate full-featured versions for providers that support it (Claude Code, Gemini, Codex)
3. Generate downgraded versions for Cursor (strip frontmatter, rely on appending)

## Repository Structure

```
impeccable/
├── source/                      # EDIT THESE! Single source of truth
│   ├── copilot-cli/             # Copilot CLI instruction sources
│   │   ├── copilot-instructions.md
│   │   └── instructions/*.instructions.md
│   └── skills/                  # Skill definitions with frontmatter
│       └── */SKILL.md
├── dist/                        # Generated outputs (committed for users)
│   ├── cursor/                  # Commands + Agent Skills
│   │   └── .cursor/
│   │       ├── commands/*.md
│   │       └── skills/*/SKILL.md
│   ├── claude-code/             # Full featured
│   │   └── .claude/
│   │       ├── commands/*.md
│   │       └── skills/*/SKILL.md
│   ├── gemini/                  # TOML commands + modular skills
│   │   ├── .gemini/
│   │   │   └── commands/*.toml
│   │   ├── GEMINI.md
│   │   └── GEMINI.*.md
│   ├── copilot-cli/             # Skills + instructions for GitHub Copilot CLI
│   │   └── .github/
│   │       ├── skills/*/SKILL.md
│   │       ├── copilot-instructions.md
│   │       └── instructions/*.instructions.md
│   └── codex/                   # Custom prompts + Agent Skills
│       └── .codex/
│           ├── prompts/*.md
│           └── skills/*/SKILL.md
├── api/                         # Vercel Functions (production)
│   ├── skills.js                # GET /api/skills
│   ├── commands.js              # GET /api/commands
│   └── download/
│       ├── [type]/[provider]/[id].js   # Individual downloads
│       └── bundle/[provider].js        # Bundle downloads
├── public/                      # Website for impeccable.style
│   ├── index.html               # Main page
│   ├── css/                     # Modular CSS (9 files)
│   │   ├── main.css             # Entry point with imports
│   │   ├── tokens.css           # Design system
│   │   └── ...                  # Component styles
│   └── app.js                   # Vanilla JS
├── server/                      # Node.js dev server (local dev only)
│   ├── index.js                 # Serves website + API routes
│   └── lib/
│       └── api-handlers.js      # Shared API logic (used by both server & functions)
├── scripts/                     # Build system (Node.js + tsx)
│   ├── build.js                 # Main orchestrator
│   ├── lib/
│   │   ├── utils.js             # Shared utilities
│   │   ├── zip.js               # ZIP generation
│   │   └── transformers/        # Provider-specific transformers
│   │       ├── cursor.js
│   │       ├── claude-code.js
│   │       ├── gemini.js
│   │       └── codex.js
├── README.md                    # End user documentation
├── DEVELOP.md                   # Contributor documentation
└── package.json                 # npm scripts
```

## Website (impeccable.style)

**Tech Stack:**
- Vanilla JavaScript (no frameworks)
- Modern CSS with Tailwind CLI plus native CSS features (nesting, OKLCH colors, @import)
- **Local Development**: Node.js server with native routes (`server/index.js`)
- **Production**: Cloudflare Pages static build plus download functions
- Deployed on Cloudflare Pages

**Dual Setup:**
- `/api` directory contains individual Vercel Functions for production
- `/server` directory contains monolithic Node.js server for local development
- `/server/lib/api-handlers.js` contains shared logic used by both
- Zero duplication: API functions and dev server import the same handlers

**Design:**
- Editorial precision aesthetic
- Cormorant Garamond (display) + Instrument Sans (body)
- OKLCH color space for vibrant, perceptually uniform colors
- Editorial sidebar layout (title left, content right)
- Modular CSS architecture (9 files)

**API Endpoints** (Vercel Functions):
- `/` - Homepage (static HTML)
- `/api/skills` - JSON list of all skills
- `/api/commands` - JSON list of all commands
- `/api/download/[type]/[provider]/[id]` - Individual file download
- `/api/download/bundle/[provider]` - ZIP bundle download

## Source File Format

### Commands (`source/commands/*.md`)

```yaml
---
name: command-name
description: Clear description of what this command does
args:
  - name: argname
    description: Argument description
    required: false
---

Command prompt here. Use {{argname}} placeholders for arguments.
```

### Skills (`source/skills/*.md`)

```yaml
---
name: skill-name
description: Clear description of what this skill provides
argument-hint: [TARGET=<value>]   # Optional, for user-invocable skills
user-invocable: true              # Optional
license: License info (optional)
---

<!-- impeccable-args
- name: target
  description: What to operate on
  required: false
-->

Skill instructions for the LLM here.
```

## Build System

Uses **npm + tsx** for builds. Modular architecture:

- **`utils.js`**: Shared functions (parseFrontmatter, readSourceFiles, writeFile, etc.)
- **Transformer pattern**: Each provider has one focused file
- **Registry**: `transformers/index.js` exports all transformers
- **Main script**: `build.js` orchestrates everything (~50 lines)

Run: `npm run build`

## Provider Transformations

### 1. Cursor (Agent Skills Standard)
- **Commands**: Body only → `dist/cursor/.cursor/commands/*.md` (no frontmatter support)
- **Skills**: Agent Skills standard → `dist/cursor/.cursor/skills/{name}/SKILL.md`
  - Full YAML frontmatter with name/description
  - Reference files in skill subdirectories
- **Installation**: Extract ZIP into your project root, creates `.cursor/` folder
- **Note**: Agent Skills require Cursor nightly channel

### 2. Claude Code (Full Featured)
- **Commands**: Full YAML frontmatter → `dist/claude-code/.claude/commands/*.md`
- **Skills**: Full YAML frontmatter → `dist/claude-code/.claude/skills/{name}/SKILL.md`
- **Preserves**: All metadata, all args
- **Format**: Matches [Anthropic Skills spec](https://github.com/anthropics/skills)
- **Installation**: Extract ZIP into your project root, creates `.claude/` folder

### 3. Gemini CLI (Full Featured)
- **Commands**: TOML format → `dist/gemini/.gemini/commands/*.toml`
  - Uses `description` and `prompt` keys
  - Transforms `{{argname}}` → `{{args}}` (Gemini uses single args string)
- **Skills**: Modular with imports → `dist/gemini/GEMINI.{name}.md` (root level)
  - Main `GEMINI.md` uses `@./GEMINI.{name}.md` import syntax
  - Gemini automatically loads imported files
- **Installation**: Extract ZIP into your project root, creates `.gemini/` folder + skill files

### 4. Codex CLI (Full Featured)
- **Commands**: Custom prompt format → `dist/codex/.codex/prompts/*.md`
  - Uses `description` and `argument-hint` in frontmatter
  - Transforms `{{argname}}` → `$ARGNAME` (uppercase variables)
  - Invoked as `/prompts:<name>`
- **Skills**: Agent Skills standard → `dist/codex/.codex/skills/{name}/SKILL.md`
  - Same SKILL.md format as Claude Code with YAML frontmatter
  - Reference files in skill subdirectories
- **Installation**: Extract ZIP into your project root, creates `.codex/` folder

### 5. GitHub Copilot CLI
- **Skills**: Agent Skills standard → `dist/copilot-cli/.github/skills/{name}/SKILL.md`
- **Instructions**: Repository custom instructions → `dist/copilot-cli/.github/copilot-instructions.md`
- **Path-specific instructions**: `dist/copilot-cli/.github/instructions/*.instructions.md`
- **Preserves**: Skill descriptions, licenses, reference files, and provider-specific placeholder replacement
- **Installation**: Merge the generated `.github/` contents into your project root

## Key Design Decisions

### Why commit dist/?
End users can copy files directly without needing build tools.

### Why separate transformers?
- Each provider ~30-85 lines, easy to understand
- Can modify one without affecting others
- Easy to add new providers

### Why npm + tsx?
- Familiar workflow for contributors
- Works cleanly with Node.js tooling and Cloudflare Pages
- `tsx` runs ESM scripts without extra build config
- Keeps local development close to production behavior

### Why modular skills for Gemini/Codex?
- Better context management (load only what's needed)
- Cleaner file organization
- Gemini: Uses native `@file.md` import feature
- Codex: Uses routing pattern with AGENTS.md guide

### Why vanilla JS for website?
- No build complexity
- Browser-native ES modules plus the Tailwind CLI keep tooling minimal
- Modern features (ES6+, CSS nesting, OKLCH colors)
- Fast, lean, maintainable

## Adding New Content

1. **Create source file** in `source/commands/` or `source/skills/`
2. **Add frontmatter** with name, description, args (for commands) or license (for skills)
3. **Write body** with instructions/prompt
4. **Build**: `npm run build`
5. **Test** with your provider
6. **Commit** both source and dist files

## Important Notes

- **Source is truth**: Always edit `source/`, never edit `dist/` directly
- **Test across providers**: Changes affect 4 different outputs
- **Argument handling**: Write prompts that work with both placeholders and appending
- **Cursor limitations**: No frontmatter/args, so design for graceful degradation

## Documentation

- **README.md**: End user guide (installation, usage, quick dev setup)
- **DEVELOP.md**: Contributor guide (architecture, build system, adding content)
- **This file (AGENTS.md)**: Context for AI assistants and new developers

## Provider Documentation Links

- [Agent Skills Specification](https://agentskills.io/specification) - Open standard
- [Cursor Commands](https://cursor.com/docs/agent/chat/commands)
- [Cursor Rules](https://cursor.com/docs/context/rules)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Claude Code Slash Commands](https://code.claude.com/docs/en/slash-commands)
- [Anthropic Skills](https://github.com/anthropics/skills)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [GitHub Copilot Agent Skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-skills)
- [Gemini CLI Custom Commands](https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands)
- [Gemini CLI GEMINI.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)
- [Codex CLI Slash Commands](https://developers.openai.com/codex/guides/slash-commands)
- [Codex CLI Skills](https://developers.openai.com/codex/skills/)
