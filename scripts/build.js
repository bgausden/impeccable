#!/usr/bin/env node

/**
 * Build System for Cross-Provider Design Skills
 *
 * Transforms source skills into provider-specific formats:
 * - Cursor: .cursor/skills/
 * - Claude Code: .claude/skills/
 * - Gemini: .gemini/skills/
 * - Codex: .codex/skills/
 * - GitHub Copilot CLI: .github/skills/
 * - Agents: .agents/skills/ (VS Code Copilot + Antigravity)
 *
 * Also assembles a universal ZIP containing all providers,
 * and builds Tailwind CSS plus a local static preview site.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readSourceFiles, readPatterns } from './lib/utils.js';
import { createTransformer, PROVIDERS, transformCopilotCli } from './lib/transformers/index.js';
import { createAllZips } from './lib/zip.js';
import { execSync } from 'child_process';

/**
 * Copy directory recursively
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncCopilotCliToRoot(distDir, rootDir) {
  const copilotSrcDir = path.join(distDir, 'copilot-cli', '.github');

  if (!fs.existsSync(copilotSrcDir)) {
    return;
  }

  const githubDestDir = path.join(rootDir, '.github');
  fs.mkdirSync(githubDestDir, { recursive: true });

  const skillsSrc = path.join(copilotSrcDir, 'skills');
  const skillsDest = path.join(githubDestDir, 'skills');
  if (fs.existsSync(skillsDest)) {
    fs.rmSync(skillsDest, { recursive: true, force: true });
  }
  copyDirSync(skillsSrc, skillsDest);

  const copilotInstructionsSrc = path.join(copilotSrcDir, 'copilot-instructions.md');
  if (fs.existsSync(copilotInstructionsSrc)) {
    fs.copyFileSync(copilotInstructionsSrc, path.join(githubDestDir, 'copilot-instructions.md'));
  }

  const instructionsSrc = path.join(copilotSrcDir, 'instructions');
  if (fs.existsSync(instructionsSrc)) {
    copyDirSync(instructionsSrc, path.join(githubDestDir, 'instructions'));
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

/**
 * Build Tailwind CSS using the CLI
 * Tailwind v4 uses @theme directives, so we compile CSS explicitly with the CLI
 */
function buildTailwindCSS() {
  const inputFile = path.join(ROOT_DIR, 'public', 'css', 'main.css');
  const outputFile = path.join(ROOT_DIR, 'public', 'css', 'styles.css');

  console.log('🎨 Building Tailwind CSS...');
  try {
    execSync(`npx @tailwindcss/cli -i "${inputFile}" -o "${outputFile}" --minify`, {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    console.log('✓ Tailwind CSS compiled\n');
  } catch (error) {
    console.error('Failed to build Tailwind CSS:', error.message);
    process.exit(1);
  }
}

/**
 * Build static site by copying the public directory into the build output.
 * CSS is pre-compiled by Tailwind CLI, and the site runs directly from
 * browser-native ES modules plus static assets.
 */
async function buildStaticSite() {
  const publicDir = path.join(ROOT_DIR, 'public');
  const outdir = path.join(ROOT_DIR, 'build');

  console.log('📦 Copying static site assets...');

  try {
    if (fs.existsSync(outdir)) fs.rmSync(outdir, { recursive: true, force: true });
    fs.mkdirSync(outdir, { recursive: true });
    copyDirSync(publicDir, outdir);

    const fileCounts = { html: 0, js: 0, css: 0, total: 0, bytes: 0 };
    const stack = [outdir];

    while (stack.length > 0) {
      const currentDir = stack.pop();
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }

        const size = fs.statSync(entryPath).size;
        fileCounts.total++;
        fileCounts.bytes += size;
        if (entry.name.endsWith('.html')) fileCounts.html++;
        if (entry.name.endsWith('.js')) fileCounts.js++;
        if (entry.name.endsWith('.css')) fileCounts.css++;
      }
    }

    console.log(`✓ Static site copied to ./build/`);
    console.log(`  HTML: ${fileCounts.html} file(s)`);
    console.log(`  JS: ${fileCounts.js} file(s)`);
    console.log(`  CSS: ${fileCounts.css} file(s)`);
    console.log(`  Total: ${(fileCounts.bytes / 1024).toFixed(1)} KB across ${fileCounts.total} file(s)\n`);
  } catch (error) {
    console.error('Failed to build static site:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Assemble universal directory from all provider outputs
 */
function assembleUniversal(distDir, suffix = '') {
  const universalDir = path.join(distDir, `universal${suffix}`);

  // Clean and recreate
  if (fs.existsSync(universalDir)) {
    fs.rmSync(universalDir, { recursive: true, force: true });
  }

  const providerConfigs = [
    ...Object.values(PROVIDERS),
    { provider: 'copilot-cli', configDir: '.github' },
  ];

  for (const { provider, configDir } of providerConfigs) {
    const src = path.join(distDir, `${provider}${suffix}`, configDir);
    const dest = path.join(universalDir, configDir);
    if (fs.existsSync(src)) {
      copyDirSync(src, dest);
    }
  }

  // Add a visible README so macOS users don't see an empty folder
  // (all provider dirs are dotfiles, hidden by default in Finder)
  const prefixNote = suffix ? '\nSkills in this bundle are prefixed with i- (e.g. /i-audit) to avoid conflicts.\n' : '';
  fs.writeFileSync(path.join(universalDir, 'README.txt'),
`Impeccable — Design fluency for AI harnesses
https://github.com/pbakaus/impeccable
${prefixNote}
This folder contains skills for all supported tools:

  .cursor/    → Cursor
  .claude/    → Claude Code
  .gemini/    → Gemini CLI
  .codex/     → Codex CLI
  .github/    → GitHub Copilot CLI
  .agents/    → VS Code Copilot, Antigravity
  .kiro/      → Kiro
  .opencode/  → OpenCode
  .pi/        → Pi
  .trae-cn/   → Trae China
  .trae/      → Trae International

To install, copy the relevant folder(s) into your project root.
These are hidden folders (dotfiles) — press Cmd+Shift+. in Finder to see them.
`);

  const label = suffix ? ' (prefixed)' : '';
  console.log(`✓ Assembled universal${label} directory (${providerConfigs.length} providers)`);
}

/**
 * Main build process
 */
async function build() {
  console.log('🔨 Building cross-provider design skills...\n');

  // Build CSS with Tailwind CLI (handles @theme directive)
  buildTailwindCSS();

  // Copy HTML, JS, assets, and compiled CSS into build/
  await buildStaticSite();

  // Read source files (unified skills architecture)
  const { skills } = readSourceFiles(ROOT_DIR);
  const patterns = readPatterns(ROOT_DIR);
  const userInvocableCount = skills.filter(s => s.userInvocable).length;
  console.log(`📖 Read ${skills.length} skills (${userInvocableCount} user-invocable) and ${patterns.patterns.length + patterns.antipatterns.length} pattern categories\n`);

  // Transform for each provider (unprefixed + prefixed)
  for (const config of Object.values(PROVIDERS)) {
    const transform = createTransformer(config);
    transform(skills, DIST_DIR);
    transform(skills, DIST_DIR, { prefix: 'i-', outputSuffix: '-prefixed' });
  }

  // Copilot CLI uses a custom transformer (outputs instruction files in addition to skills)
  transformCopilotCli(skills, DIST_DIR, patterns, { rootDir: ROOT_DIR });
  transformCopilotCli(skills, DIST_DIR, patterns, { prefix: 'i-', outputSuffix: '-prefixed', rootDir: ROOT_DIR });

  // Assemble universal directory (unprefixed and prefixed)
  assembleUniversal(DIST_DIR);
  assembleUniversal(DIST_DIR, '-prefixed');

  // Create ZIP bundles (individual + universal)
  await createAllZips(DIST_DIR);

  // Copy all provider outputs to project root for local testing
  const syncConfigs = Object.values(PROVIDERS);

  for (const { provider, configDir } of syncConfigs) {
    const skillsSrc = path.join(DIST_DIR, provider, configDir, 'skills');
    const skillsDest = path.join(ROOT_DIR, configDir, 'skills');

    if (fs.existsSync(skillsSrc)) {
      if (fs.existsSync(skillsDest)) fs.rmSync(skillsDest, { recursive: true });
      copyDirSync(skillsSrc, skillsDest);
    }
  }

  syncCopilotCliToRoot(DIST_DIR, ROOT_DIR);

  console.log(`📋 Synced skills to: ${syncConfigs.map(p => p.configDir).join(', ')}, .github`);

  console.log('\n✨ Build complete!');
}

// Run the build
build();
