# Developer Guide

Documentation for contributors to Impeccable.

## Architecture

This repository uses a **feature-rich source format** that transforms into provider-specific formats. We chose "Option A" architecture: maintain rich metadata in source files and downgrade for providers with limited support (like Cursor), rather than limiting everyone to the lowest common denominator.

### Why This Approach?

Different providers have different capabilities:
- **Claude Code, OpenCode**: Full metadata — args, user-invocable, allowed-tools, license, compatibility
- **Codex, Agents**: `argument-hint` frontmatter
- **Gemini**: Minimal frontmatter, `{{arg}}` placeholders become `{{args}}`
- **Cursor, Kiro, Pi**: Basic frontmatter (name, description, license/compatibility)

Source skills now keep Copilot-safe frontmatter for user-invocable skills (`argument-hint`) and store richer arg metadata in a leading `<!-- impeccable-args -->` comment in the body. The build strips that comment from generated output and reconstructs structured args where supported.

## Source Format

### Skills (`source/skills/{name}/SKILL.md`)

```yaml
---
name: skill-name
description: What this skill provides
argument-hint: [TARGET=<value>]
user-invocable: true
license: License info (optional)
compatibility: Environment requirements (optional)
---

<!-- impeccable-args
- name: target
  description: What to operate on
  required: false
-->

Your skill instructions here...
```

**Frontmatter fields** (based on [Agent Skills spec](https://agentskills.io/specification)):
- `name` (required): Skill identifier (1-64 chars, lowercase/numbers/hyphens)
- `description` (required): What the skill provides (1-1024 chars)
- `user-invocable` (optional): Boolean — if `true`, the skill can be invoked as a slash command
- `argument-hint` (optional): Flat hint string for user-invocable skills, compatible with Copilot/Agents parsers
- `license` (optional): License/attribution info
- `compatibility` (optional): Environment requirements (1-500 chars)
- `metadata` (optional): Arbitrary key-value pairs
- `allowed-tools` (optional, experimental): Pre-approved tools list

**Body**: The skill instructions for the LLM.

**Optional body metadata for user-invocable skills**:
- Leading `<!-- impeccable-args ... -->` comment: Rich arg metadata used by the build to recreate structured `args` arrays for providers that support them
- Inside the comment:
  - `name`: Argument identifier
  - `description`: What it's for
  - `required`: Boolean (defaults to false)

## Building

### Prerequisites
- Bun (fast JavaScript runtime and package manager)
- No external dependencies required

### Commands

```bash
# Build all provider formats
bun run build

# Clean dist folder
bun run clean

# Rebuild from scratch
bun run rebuild
```

### What Gets Generated

```
source/                          → dist/
  skills/{name}/SKILL.md           cursor/.cursor/skills/{name}/SKILL.md
                                   claude-code/.claude/skills/{name}/SKILL.md
                                   gemini/.gemini/skills/{name}/SKILL.md
                                   codex/.codex/skills/{name}/SKILL.md
                                   agents/.agents/skills/{name}/SKILL.md
                                   kiro/.kiro/skills/{name}/SKILL.md
                                   opencode/.opencode/skills/{name}/SKILL.md
                                   pi/.pi/skills/{name}/SKILL.md
```

## Provider Transformations

All providers output skills to `dist/{provider}/.{config}/skills/{name}/SKILL.md` with reference files in subdirectories. They differ in frontmatter fields and argument handling.

### Cursor
- Output: `dist/cursor/.cursor/skills/{name}/SKILL.md`
- Frontmatter: name, description, license
- **Note**: Agent Skills require Cursor nightly channel

### Claude Code (Full Featured)
- Output: `dist/claude-code/.claude/skills/{name}/SKILL.md`
- Frontmatter: name, description, user-invocable, args, license, compatibility, metadata, allowed-tools
- Reconstructs structured `args` from `<!-- impeccable-args -->`
- Preserves `{{arg}}` placeholders in body

### OpenCode (Full Featured)
- Output: `dist/opencode/.opencode/skills/{name}/SKILL.md`
- Frontmatter: name, description, user-invocable, args, license, compatibility, metadata, allowed-tools
- Reconstructs structured `args` from `<!-- impeccable-args -->`
- Same format as Claude Code

### Gemini CLI
- Output: `dist/gemini/.gemini/skills/{name}/SKILL.md`
- Frontmatter: name, description
- For user-invocable skills: remaining `{{arg}}` placeholders become `{{args}}`

### Codex CLI
- Output: `dist/codex/.codex/skills/{name}/SKILL.md`
- Frontmatter: name, description, argument-hint, license
- For user-invocable skills: `{{argname}}` → `$ARGNAME` (uppercase)

### Agents (VS Code Copilot, Antigravity)
- Output: `dist/agents/.agents/skills/{name}/SKILL.md`
- Frontmatter: name, description, user-invocable, argument-hint
- Uses source `argument-hint` directly (e.g., `<target> [FORMAT=<value>]`)

### Kiro
- Output: `dist/kiro/.kiro/skills/{name}/SKILL.md`
- Frontmatter: name, description, license, compatibility, metadata

### Pi
- Output: `dist/pi/.pi/skills/{name}/SKILL.md`
- Frontmatter: name, description, license, compatibility, metadata

## Adding New Content

### 1. Create Source File

```bash
mkdir source/skills/myskill
touch source/skills/myskill/SKILL.md
```

Add frontmatter and content following the format above.

### 2. Build

```bash
bun run build
```

This generates all 8 provider formats automatically.

### 3. Test

Test with your provider of choice to ensure it works correctly. Remember that Cursor will have limited functionality.

### 4. Commit

Commit source files:
```bash
git add source/
git commit -m "Add [skill name]"
```

## Build System Details

The build system uses a modular architecture under `scripts/`:

- `build.js` — Main orchestrator
- `lib/utils.js` — Shared utilities (frontmatter parsing, file I/O, placeholder replacement)
- `lib/zip.js` — ZIP bundle generation
- `lib/transformers/*.js` — One file per provider (cursor, claude-code, gemini, codex, agents, kiro, opencode, pi)

### Key Functions

- `parseFrontmatter()`: Extracts YAML frontmatter and body
- `readSourceFiles()`: Reads all skill directories from `source/skills/`
- `replacePlaceholders()`: Substitutes `{{model}}`, `{{config_file}}`, etc. per provider
- `transformCursor()`: Basic frontmatter (name, description, license)
- `transformClaudeCode()`: Full metadata with reconstructed args and allowed-tools
- `transformGemini()`: Minimal frontmatter, `{{arg}}` → `{{args}}`
- `transformCodex()`: Emits argument-hint, `{{arg}}` → `$ARGNAME`
- `transformAgents()`: Emits argument-hint and user-invocable flag
- `transformKiro()`: Basic frontmatter with license/compatibility/metadata
- `transformOpenCode()`: Full metadata (same as Claude Code)
- `transformPi()`: Basic frontmatter with license/compatibility/metadata

## Best Practices

### Skill Writing

1. **Focused scope**: One clear domain per skill
2. **Clear descriptions**: Make purpose obvious
3. **Clear instructions**: LLM should understand exactly what to do
4. **Include examples**: Where they clarify intent
5. **State constraints**: What NOT to do as clearly as what to do
6. **Test across providers**: Verify it works in multiple contexts

## Reference Documentation

- [Agent Skills Specification](https://agentskills.io/specification) - Open standard
- [Cursor Commands](https://cursor.com/docs/agent/chat/commands)
- [Cursor Rules](https://cursor.com/docs/context/rules)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Claude Code Slash Commands](https://code.claude.com/docs/en/slash-commands)
- [Anthropic Skills (Claude Code)](https://github.com/anthropics/skills)
- [Gemini CLI Custom Commands](https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands)
- [Gemini CLI Skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)
- [Codex CLI Slash Commands](https://developers.openai.com/codex/guides/slash-commands#create-your-own-slash-commands-with-custom-prompts)
- [Codex CLI Skills](https://developers.openai.com/codex/skills/)
- [Pi Skills](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)

## Repository Structure

```
impeccable/
├── source/                          # Edit these! Source of truth
│   └── skills/                      # Skill definitions
│       ├── frontend-design/
│       │   ├── SKILL.md
│       │   └── reference/*.md       # Domain-specific references
│       ├── audit/SKILL.md
│       ├── polish/SKILL.md
│       └── ...
├── dist/                            # Generated output (gitignored)
│   ├── cursor/
│   ├── claude-code/
│   ├── gemini/
│   ├── codex/
│   ├── agents/
│   ├── kiro/
│   ├── opencode/
│   └── pi/
├── scripts/
│   ├── build.js                     # Main orchestrator
│   └── lib/
│       ├── utils.js                 # Shared utilities
│       ├── zip.js                   # ZIP generation
│       └── transformers/            # One file per provider
│           ├── cursor.js
│           ├── claude-code.js
│           ├── gemini.js
│           ├── codex.js
│           ├── agents.js
│           ├── kiro.js
│           ├── opencode.js
│           └── pi.js
├── tests/                           # Bun test suite
├── package.json                     # ESM project config
├── README.md                        # User documentation
├── DEVELOP.md                       # This file
└── .gitignore
```

## Troubleshooting

### Build fails with YAML parsing errors
- Check frontmatter indentation (YAML is indent-sensitive)
- Ensure `---` delimiters are on their own lines
- Verify colons have spaces after them (`key: value`)

### Output doesn't match expectations
- Check the transformer function for your provider in `scripts/lib/transformers/`
- Verify source file has correct frontmatter structure
- Run `bun run rebuild` to ensure clean build

### Provider doesn't recognize the files
- Check installation path for your provider
- Verify file naming matches provider requirements
- Consult provider's documentation (links above)

## Questions?

Open an issue or submit a PR!
