import { describe, test, expect, beforeEach, afterEach, mock } from '../../test-helpers.js';
import fs from 'fs';
import path from 'path';
import { transformCopilotCli } from '../../../scripts/lib/transformers/copilot-cli.js';
import { parseFrontmatter } from '../../../scripts/lib/utils.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-copilot-cli');

function writeInstructionSources() {
  const sourceDir = path.join(TEST_DIR, 'source/copilot-cli');
  fs.mkdirSync(path.join(sourceDir, 'instructions'), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, 'copilot-instructions.md'),
    'Use {{model}} and see {{config_file}}. Available commands: {{available_commands}}.'
  );
  fs.writeFileSync(
    path.join(sourceDir, 'instructions/test.instructions.md'),
    '---\napplyTo: "source/**/*.md"\n---\nRun /audit after the polish skill.'
  );
}

describe('transformCopilotCli', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should create correct directory structure', () => {
    writeInstructionSources();

    transformCopilotCli([], TEST_DIR, null, { rootDir: TEST_DIR });

    expect(fs.existsSync(path.join(TEST_DIR, 'copilot-cli/.github/skills'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'copilot-cli/.github/instructions'))).toBe(true);
  });

  test('should create skill files with only supported frontmatter fields', () => {
    writeInstructionSources();

    const skills = [
      {
        name: 'audit',
        description: 'Audit skill',
        license: 'MIT',
        userInvocable: true,
        args: [{ name: 'target', description: 'Target', required: false }],
        body: 'Audit {{target}}.'
      }
    ];

    transformCopilotCli(skills, TEST_DIR, null, { rootDir: TEST_DIR });

    const content = fs.readFileSync(path.join(TEST_DIR, 'copilot-cli/.github/skills/audit/SKILL.md'), 'utf-8');
    const parsed = parseFrontmatter(content);

    expect(parsed.frontmatter.name).toBe('audit');
    expect(parsed.frontmatter.description).toBe('Audit skill');
    expect(parsed.frontmatter.license).toBe('MIT');
    expect(parsed.frontmatter['user-invocable']).toBeUndefined();
    expect(parsed.frontmatter['argument-hint']).toBeUndefined();
    expect(parsed.body).toContain('Audit {{target}}.');
  });

  test('should copy reference files', () => {
    writeInstructionSources();

    const skills = [
      {
        name: 'frontend-design',
        description: 'Design skill',
        body: 'Design body.',
        references: [
          { name: 'typography', content: 'Typography for {{model}}.', filePath: '/fake/typography.md' }
        ]
      }
    ];

    transformCopilotCli(skills, TEST_DIR, null, { rootDir: TEST_DIR });

    const refPath = path.join(TEST_DIR, 'copilot-cli/.github/skills/frontend-design/reference/typography.md');
    expect(fs.existsSync(refPath)).toBe(true);
    expect(fs.readFileSync(refPath, 'utf-8')).toContain('Typography for GitHub Copilot.');
  });

  test('should copy and transform repository instructions', () => {
    writeInstructionSources();

    const skills = [
      { name: 'audit', description: 'Audit', userInvocable: true, body: 'Body.' },
      { name: 'polish', description: 'Polish', userInvocable: true, body: 'Body.' }
    ];

    transformCopilotCli(skills, TEST_DIR, null, { rootDir: TEST_DIR });

    const instructions = fs.readFileSync(path.join(TEST_DIR, 'copilot-cli/.github/copilot-instructions.md'), 'utf-8');
    const scoped = fs.readFileSync(path.join(TEST_DIR, 'copilot-cli/.github/instructions/test.instructions.md'), 'utf-8');

    expect(instructions).toContain('GitHub Copilot');
    expect(instructions).toContain('.github/copilot-instructions.md');
    expect(instructions).toContain('/audit, /polish');
    expect(scoped).toContain('Run /audit after the polish skill.');
  });

  test('should support prefix option for skills and instructions', () => {
    writeInstructionSources();

    const skills = [
      { name: 'audit', description: 'Audit', userInvocable: true, body: 'Run /polish after the audit skill.' },
      { name: 'polish', description: 'Polish', userInvocable: true, body: 'Body.' }
    ];

    transformCopilotCli(skills, TEST_DIR, null, {
      rootDir: TEST_DIR,
      prefix: 'i-',
      outputSuffix: '-prefixed'
    });

    const skillPath = path.join(TEST_DIR, 'copilot-cli-prefixed/.github/skills/i-audit/SKILL.md');
    const instructionsPath = path.join(TEST_DIR, 'copilot-cli-prefixed/.github/instructions/test.instructions.md');

    expect(fs.existsSync(skillPath)).toBe(true);
    expect(fs.readFileSync(skillPath, 'utf-8')).toContain('/i-polish');
    expect(fs.readFileSync(skillPath, 'utf-8')).toContain('the i-audit skill');
    expect(fs.readFileSync(instructionsPath, 'utf-8')).toContain('/i-audit');
  });

  test('should log correct summary including instruction files', () => {
    writeInstructionSources();

    const consoleMock = mock(() => {});
    const originalLog = console.log;
    console.log = consoleMock;

    transformCopilotCli(
      [{ name: 'audit', description: 'Audit', userInvocable: true, body: 'Body.' }],
      TEST_DIR,
      null,
      { rootDir: TEST_DIR }
    );

    console.log = originalLog;

    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('✓ Copilot CLI:'));
    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('1 skills'));
    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('1 user-invocable'));
    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('2 instruction files'));
  });
});
