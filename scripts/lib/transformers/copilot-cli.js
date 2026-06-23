import fs from 'fs';
import path from 'path';
import {
  cleanDir,
  ensureDir,
  writeFile,
  generateYamlFrontmatter,
  replacePlaceholders,
  prefixSkillReferences,
  compileProviderBlocks,
  stripRuleMarkers,
} from '../utils.js';

function transformInstructionContent(content, commandNames, allSkillNames, prefix) {
  let transformed = replacePlaceholders(content, 'copilot-cli', commandNames);

  if (prefix) {
    transformed = prefixSkillReferences(transformed, prefix, allSkillNames);
  }

  return transformed;
}

function copyInstructionTree(srcDir, destDir, commandNames, allSkillNames, prefix) {
  if (!fs.existsSync(srcDir)) return 0;

  let fileCount = 0;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      fileCount += copyInstructionTree(srcPath, destPath, commandNames, allSkillNames, prefix);
      continue;
    }

    const content = fs.readFileSync(srcPath, 'utf-8');
    const transformed = transformInstructionContent(content, commandNames, allSkillNames, prefix);
    writeFile(destPath, transformed);
    fileCount++;
  }

  return fileCount;
}

/**
 * GitHub Copilot CLI Transformer
 *
 * Outputs:
 * - .github/skills/{name}/SKILL.md
 * - .github/copilot-instructions.md
 * - .github/instructions/*.instructions.md
 *
 * @param {Array} skills - All skills (including user-invocable ones)
 * @param {string} distDir - Distribution output directory
 * @param {Object} patterns - Design patterns data (unused)
 * @param {Object} options - Optional settings
 * @param {string} options.prefix - Prefix to add to user-invocable skill names (e.g. 'i-')
 * @param {string} options.outputSuffix - Suffix for output directory (e.g. '-prefixed')
 * @param {string} options.rootDir - Project root so instruction source files can be copied
 */
export function transformCopilotCli(skills, distDir, patterns = null, options = {}) {
  const { prefix = '', outputSuffix = '', rootDir = process.cwd() } = options;
  const copilotDir = path.join(distDir, `copilot-cli${outputSuffix}`);
  const githubDir = path.join(copilotDir, '.github');
  const skillsDir = path.join(githubDir, 'skills');

  cleanDir(copilotDir);
  ensureDir(skillsDir);

  const allSkillNames = skills.map(s => s.name);
  const commandNames = skills.filter(s => s.userInvocable).map(s => `${prefix}${s.name}`);
  let refCount = 0;
  let scriptCount = 0;

  for (const skill of skills) {
    const skillName = `${prefix}${skill.name}`;
    const skillDir = path.join(skillsDir, skillName);

    const frontmatterObj = {
      name: skillName,
      description: skill.description,
    };

    if (skill.license) frontmatterObj.license = skill.license;

    const frontmatter = generateYamlFrontmatter(frontmatterObj);
    const scriptsPath = `.github/skills/${skillName}/scripts`;
    let skillBody = compileProviderBlocks(skill.body, ['github']);
    skillBody = replacePlaceholders(skillBody, 'copilot-cli', commandNames, allSkillNames);
    skillBody = stripRuleMarkers(skillBody);
    skillBody = skillBody.replace(/\{\{scripts_path\}\}/g, scriptsPath);
    if (prefix) skillBody = prefixSkillReferences(skillBody, prefix, allSkillNames);
    const content = `${frontmatter}\n\n${skillBody}`;
    writeFile(path.join(skillDir, 'SKILL.md'), content);

    if (skill.references && skill.references.length > 0) {
      const refDir = path.join(skillDir, 'reference');
      ensureDir(refDir);

      for (const ref of skill.references) {
        let refContent = compileProviderBlocks(ref.content, ['github']);
        refContent = replacePlaceholders(refContent, 'copilot-cli', [], allSkillNames);
        refContent = stripRuleMarkers(refContent);
        refContent = refContent.replace(/\{\{scripts_path\}\}/g, scriptsPath);
        writeFile(path.join(refDir, `${ref.name}.md`), refContent);
        refCount++;
      }
    }

    if (skill.scripts && skill.scripts.length > 0) {
      const scriptsOutDir = path.join(skillDir, 'scripts');
      ensureDir(scriptsOutDir);
      for (const script of skill.scripts) {
        writeFile(path.join(scriptsOutDir, script.name), script.content);
        scriptCount++;
      }
    }
  }

  const instructionsRoot = path.join(rootDir, 'source', 'copilot-cli');
  const copilotInstructionsPath = path.join(instructionsRoot, 'copilot-instructions.md');
  let instructionCount = 0;

  if (fs.existsSync(copilotInstructionsPath)) {
    const instructionsContent = fs.readFileSync(copilotInstructionsPath, 'utf-8');
    writeFile(
      path.join(githubDir, 'copilot-instructions.md'),
      transformInstructionContent(instructionsContent, commandNames, allSkillNames, prefix)
    );
    instructionCount++;
  }

  instructionCount += copyInstructionTree(
    path.join(instructionsRoot, 'instructions'),
    path.join(githubDir, 'instructions'),
    commandNames,
    allSkillNames,
    prefix
  );

  const userInvocableCount = skills.filter(s => s.userInvocable).length;
  const refInfo = refCount > 0 ? ` (${refCount} reference files)` : '';
  const scriptInfo = scriptCount > 0 ? ` (${scriptCount} script files)` : '';
  const instructionInfo = instructionCount > 0 ? ` (${instructionCount} instruction files)` : '';
  const prefixInfo = prefix ? ` [${prefix}prefixed]` : '';
  console.log(`✓ Copilot CLI${prefixInfo}: ${skills.length} skills (${userInvocableCount} user-invocable)${refInfo}${scriptInfo}${instructionInfo}`);
}
