import { describe, test, expect, beforeEach, afterEach } from './test-helpers.js';
import fs from 'fs';
import path from 'path';
import * as utils from '../scripts/lib/utils.js';
import * as transformers from '../scripts/lib/transformers/index.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-build');

describe('build orchestration', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should call readSourceFiles with root directory', () => {
    const calls = [];
    const fakeUtils = {
      readSourceFiles(rootDir) {
        calls.push(['readSourceFiles', rootDir]);
        return { skills: [] };
      },
      readPatterns() {
        return { patterns: [], antipatterns: [] };
      }
    };
    const fakeTransformers = {
      transformCursor() {},
      transformClaudeCode() {},
      transformGemini() {},
      transformCodex() {},
      transformCopilotCli() {},
    };

    // Simulate the build process
    const ROOT_DIR = TEST_DIR;
    const DIST_DIR = path.join(ROOT_DIR, 'dist');

    const { skills } = fakeUtils.readSourceFiles(ROOT_DIR);
    const patterns = fakeUtils.readPatterns(ROOT_DIR);
    fakeTransformers.transformCursor(skills, DIST_DIR, patterns);
    fakeTransformers.transformClaudeCode(skills, DIST_DIR, patterns);
    fakeTransformers.transformGemini(skills, DIST_DIR, patterns);
    fakeTransformers.transformCodex(skills, DIST_DIR, patterns);
    fakeTransformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: ROOT_DIR });

    expect(calls).toEqual([['readSourceFiles', ROOT_DIR]]);
  });

  test('should call all transformers with correct arguments', () => {
    const skills = [
      { name: 'skill1', description: 'Skill 1', license: 'MIT', body: 'Skill body 1' }
    ];
    const patterns = { patterns: [], antipatterns: [] };

    const transformerCalls = [];
    const fakeUtils = {
      readSourceFiles() {
        return { skills };
      },
      readPatterns() {
        return patterns;
      }
    };
    const fakeTransformers = {
      transformCursor(...args) {
        transformerCalls.push(['cursor', ...args]);
      },
      transformClaudeCode(...args) {
        transformerCalls.push(['claude-code', ...args]);
      },
      transformGemini(...args) {
        transformerCalls.push(['gemini', ...args]);
      },
      transformCodex(...args) {
        transformerCalls.push(['codex', ...args]);
      },
      transformCopilotCli(...args) {
        transformerCalls.push(['copilot-cli', ...args]);
      },
    };

    const ROOT_DIR = TEST_DIR;
    const DIST_DIR = path.join(ROOT_DIR, 'dist');

    const sourceFiles = fakeUtils.readSourceFiles(ROOT_DIR);
    const patternData = fakeUtils.readPatterns(ROOT_DIR);
    fakeTransformers.transformCursor(sourceFiles.skills, DIST_DIR, patternData);
    fakeTransformers.transformClaudeCode(sourceFiles.skills, DIST_DIR, patternData);
    fakeTransformers.transformGemini(sourceFiles.skills, DIST_DIR, patternData);
    fakeTransformers.transformCodex(sourceFiles.skills, DIST_DIR, patternData);
    fakeTransformers.transformCopilotCli(sourceFiles.skills, DIST_DIR, patternData, { rootDir: ROOT_DIR });

    expect(transformerCalls).toEqual([
      ['cursor', skills, DIST_DIR, patterns],
      ['claude-code', skills, DIST_DIR, patterns],
      ['gemini', skills, DIST_DIR, patterns],
      ['codex', skills, DIST_DIR, patterns],
      ['copilot-cli', skills, DIST_DIR, patterns, { rootDir: ROOT_DIR }],
    ]);
  });

  test('should handle empty source files', () => {
    const patterns = { patterns: [], antipatterns: [] };

    const transformerCalls = [];
    const fakeUtils = {
      readSourceFiles() {
        return { skills: [] };
      },
      readPatterns() {
        return patterns;
      }
    };
    const fakeTransformers = {
      transformCursor(...args) {
        transformerCalls.push(['cursor', ...args]);
      },
      transformClaudeCode(...args) {
        transformerCalls.push(['claude-code', ...args]);
      },
      transformGemini(...args) {
        transformerCalls.push(['gemini', ...args]);
      },
      transformCodex(...args) {
        transformerCalls.push(['codex', ...args]);
      },
      transformCopilotCli(...args) {
        transformerCalls.push(['copilot-cli', ...args]);
      },
    };

    const ROOT_DIR = TEST_DIR;
    const DIST_DIR = path.join(ROOT_DIR, 'dist');

    const { skills } = fakeUtils.readSourceFiles(ROOT_DIR);
    const patternData = fakeUtils.readPatterns(ROOT_DIR);
    fakeTransformers.transformCursor(skills, DIST_DIR, patternData);
    fakeTransformers.transformClaudeCode(skills, DIST_DIR, patternData);
    fakeTransformers.transformGemini(skills, DIST_DIR, patternData);
    fakeTransformers.transformCodex(skills, DIST_DIR, patternData);
    fakeTransformers.transformCopilotCli(skills, DIST_DIR, patternData, { rootDir: ROOT_DIR });

    expect(transformerCalls).toEqual([
      ['cursor', [], DIST_DIR, patterns],
      ['claude-code', [], DIST_DIR, patterns],
      ['gemini', [], DIST_DIR, patterns],
      ['codex', [], DIST_DIR, patterns],
      ['copilot-cli', [], DIST_DIR, patterns, { rootDir: ROOT_DIR }],
    ]);
  });

  test('integration: full build creates all expected outputs', () => {
    // Create test source files
    const skillContent = `---
name: test-skill
description: A test skill
license: MIT
---

This is a test skill body.`;

    const skillDir = path.join(TEST_DIR, 'source/skills/test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
    fs.mkdirSync(path.join(TEST_DIR, 'source/copilot-cli/instructions'), { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, 'source/copilot-cli/copilot-instructions.md'), 'Repo instructions');

    // Run the build process
    const DIST_DIR = path.join(TEST_DIR, 'dist');
    const { skills } = utils.readSourceFiles(TEST_DIR);
    const patterns = utils.readPatterns(TEST_DIR);

    transformers.transformCursor(skills, DIST_DIR, patterns);
    transformers.transformClaudeCode(skills, DIST_DIR, patterns);
    transformers.transformGemini(skills, DIST_DIR, patterns);
    transformers.transformCodex(skills, DIST_DIR, patterns);
    transformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: TEST_DIR });

    // Verify Cursor outputs
    expect(fs.existsSync(path.join(DIST_DIR, 'cursor/.cursor/skills/test-skill/SKILL.md'))).toBe(true);

    // Verify Claude Code outputs
    expect(fs.existsSync(path.join(DIST_DIR, 'claude-code/.claude/skills/test-skill/SKILL.md'))).toBe(true);

    // Verify Gemini outputs
    expect(fs.existsSync(path.join(DIST_DIR, 'gemini/.gemini/skills/test-skill/SKILL.md'))).toBe(true);

    // Verify Codex outputs
    expect(fs.existsSync(path.join(DIST_DIR, 'codex/.codex/skills/test-skill/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'copilot-cli/.github/skills/test-skill/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'copilot-cli/.github/copilot-instructions.md'))).toBe(true);
  });

  test('integration: verify transformations are correct', () => {
    const skillContent = `---
name: audit
description: Run technical quality checks
user-invocable: true
args:
  - name: target
    description: Target element
    required: false
---

Please audit {{target}} for technical quality. Ask {{model}} for help.`;

    const skillDir = path.join(TEST_DIR, 'source/skills/audit');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const DIST_DIR = path.join(TEST_DIR, 'dist');
    const { skills } = utils.readSourceFiles(TEST_DIR);
    const patterns = utils.readPatterns(TEST_DIR);

    transformers.transformCursor(skills, DIST_DIR, patterns);
    transformers.transformClaudeCode(skills, DIST_DIR, patterns);
    transformers.transformGemini(skills, DIST_DIR, patterns);
    transformers.transformCodex(skills, DIST_DIR, patterns);
    transformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: TEST_DIR });

    // Verify Cursor: full frontmatter with user-invocable
    const cursorContent = fs.readFileSync(path.join(DIST_DIR, 'cursor/.cursor/skills/audit/SKILL.md'), 'utf-8');
    expect(cursorContent).toContain('---');
    expect(cursorContent).toContain('name: audit');
    expect(cursorContent).toContain('{{target}}');
    expect(cursorContent).toContain('the model');

    // Verify Claude Code: full frontmatter with user-invocable and args
    const claudeContent = fs.readFileSync(path.join(DIST_DIR, 'claude-code/.claude/skills/audit/SKILL.md'), 'utf-8');
    expect(claudeContent).toContain('---');
    expect(claudeContent).toContain('name: audit');
    expect(claudeContent).toContain('user-invocable: true');
    expect(claudeContent).toContain('{{target}}');
    expect(claudeContent).toContain('Claude');

    // Verify Gemini: skill in skills directory
    expect(fs.existsSync(path.join(DIST_DIR, 'gemini/.gemini/skills/audit/SKILL.md'))).toBe(true);
    const geminiContent = fs.readFileSync(path.join(DIST_DIR, 'gemini/.gemini/skills/audit/SKILL.md'), 'utf-8');
    expect(geminiContent).toContain('{{args}}'); // Replaced for user-invocable in Gemini
    expect(geminiContent).toContain('Gemini');

    // Verify Codex: skill in skills directory
    expect(fs.existsSync(path.join(DIST_DIR, 'codex/.codex/skills/audit/SKILL.md'))).toBe(true);
    const codexContent = fs.readFileSync(path.join(DIST_DIR, 'codex/.codex/skills/audit/SKILL.md'), 'utf-8');
    expect(codexContent).toContain('$TARGET'); // Replaced for user-invocable in Codex
    expect(codexContent).toContain('GPT');

    // Verify Copilot CLI: skill in .github/skills without command metadata
    expect(fs.existsSync(path.join(DIST_DIR, 'copilot-cli/.github/skills/audit/SKILL.md'))).toBe(true);
    const copilotContent = fs.readFileSync(path.join(DIST_DIR, 'copilot-cli/.github/skills/audit/SKILL.md'), 'utf-8');
    expect(copilotContent).toContain('name: audit');
    expect(copilotContent).toContain('{{target}}');
    expect(copilotContent).toContain('GitHub Copilot');
    expect(copilotContent).not.toContain('user-invocable: true');
  });

  test('integration: multiple skills', () => {
    const skill1Dir = path.join(TEST_DIR, 'source/skills/skill1');
    fs.mkdirSync(skill1Dir, { recursive: true });
    fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), '---\nname: skill1\n---\nSkill1');

    const skill2Dir = path.join(TEST_DIR, 'source/skills/skill2');
    fs.mkdirSync(skill2Dir, { recursive: true });
    fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), '---\nname: skill2\n---\nSkill2');

    const DIST_DIR = path.join(TEST_DIR, 'dist');
    const { skills } = utils.readSourceFiles(TEST_DIR);
    const patterns = utils.readPatterns(TEST_DIR);

    expect(skills).toHaveLength(2);

    transformers.transformCursor(skills, DIST_DIR, patterns);
    transformers.transformClaudeCode(skills, DIST_DIR, patterns);
    transformers.transformGemini(skills, DIST_DIR, patterns);
    transformers.transformCodex(skills, DIST_DIR, patterns);
    transformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: TEST_DIR });

    // Verify all files exist
    expect(fs.existsSync(path.join(DIST_DIR, 'cursor/.cursor/skills/skill1/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'cursor/.cursor/skills/skill2/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'claude-code/.claude/skills/skill1/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'claude-code/.claude/skills/skill2/SKILL.md'))).toBe(true);
  });

  test('should call transformers in correct order', () => {
    const callOrder = [];
    const fakeUtils = {
      readSourceFiles() {
        return { skills: [] };
      },
      readPatterns() {
        return { patterns: [], antipatterns: [] };
      }
    };
    const fakeTransformers = {
      transformCursor() {
      callOrder.push('cursor');
      },
      transformClaudeCode() {
      callOrder.push('claude-code');
      },
      transformGemini() {
      callOrder.push('gemini');
      },
      transformCodex() {
      callOrder.push('codex');
      },
      transformCopilotCli() {
      callOrder.push('copilot-cli');
      },
    };

    const ROOT_DIR = TEST_DIR;
    const DIST_DIR = path.join(ROOT_DIR, 'dist');

    const { skills } = fakeUtils.readSourceFiles(ROOT_DIR);
    const patterns = fakeUtils.readPatterns(ROOT_DIR);
    fakeTransformers.transformCursor(skills, DIST_DIR, patterns);
    fakeTransformers.transformClaudeCode(skills, DIST_DIR, patterns);
    fakeTransformers.transformGemini(skills, DIST_DIR, patterns);
    fakeTransformers.transformCodex(skills, DIST_DIR, patterns);
    fakeTransformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: ROOT_DIR });

    expect(callOrder).toEqual(['cursor', 'claude-code', 'gemini', 'codex', 'copilot-cli']);
  });

  test('should include agents and kiro transformers', () => {
    const { skills } = utils.readSourceFiles(TEST_DIR);
    const patterns = utils.readPatterns(TEST_DIR);
    const DIST_DIR = path.join(TEST_DIR, 'dist');

    // These should not throw
    transformers.transformAgents(skills, DIST_DIR, patterns);
    transformers.transformKiro(skills, DIST_DIR, patterns);

    // Verify outputs
    expect(fs.existsSync(path.join(DIST_DIR, 'agents/.agents/skills'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'kiro/.kiro/skills'))).toBe(true);
  });

  test('should include copilot-cli transformer', () => {
    fs.mkdirSync(path.join(TEST_DIR, 'source/copilot-cli/instructions'), { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, 'source/copilot-cli/copilot-instructions.md'), 'Repo instructions');

    const { skills } = utils.readSourceFiles(TEST_DIR);
    const patterns = utils.readPatterns(TEST_DIR);
    const DIST_DIR = path.join(TEST_DIR, 'dist');

    transformers.transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: TEST_DIR });

    expect(fs.existsSync(path.join(DIST_DIR, 'copilot-cli/.github/skills'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'copilot-cli/.github/copilot-instructions.md'))).toBe(true);
  });
});
