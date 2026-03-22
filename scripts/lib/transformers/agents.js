import path from 'path';
import { cleanDir, ensureDir, writeFile, generateYamlFrontmatter, replacePlaceholders, prefixSkillReferences, buildArgumentHint } from '../utils.js';

/**
 * Agents Transformer (VS Code Copilot + Antigravity)
 *
 * All skills output to .agents/skills/{name}/SKILL.md
 * Frontmatter: name, description, user-invocable (if true), argument-hint
 *
 * @param {Array} skills - All skills (including user-invocable ones)
 * @param {string} distDir - Distribution output directory
 * @param {Object} patterns - Design patterns data (unused)
 * @param {Object} options - Optional settings
 */
export function transformAgents(skills, distDir, patterns = null, options = {}) {
  const { prefix = '', outputSuffix = '' } = options;
  const agentsDir = path.join(distDir, `agents${outputSuffix}`);
  const skillsDir = path.join(agentsDir, '.agents/skills');

  cleanDir(agentsDir);
  ensureDir(skillsDir);

  const allSkillNames = skills.map(s => s.name);
  const commandNames = skills.filter(s => s.userInvocable).map(s => `${prefix}${s.name}`);
  let refCount = 0;
  for (const skill of skills) {
    const skillName = `${prefix}${skill.name}`;
    const skillDir = path.join(skillsDir, skillName);

    const frontmatterObj = {
      name: skillName,
      description: skill.description,
    };

    if (skill.userInvocable) frontmatterObj['user-invocable'] = true;

    if (skill.userInvocable && (skill.argumentHint || (skill.args && skill.args.length > 0))) {
      frontmatterObj['argument-hint'] = skill.argumentHint || buildArgumentHint(skill.args);
    }

    const frontmatter = generateYamlFrontmatter(frontmatterObj);
    let skillBody = replacePlaceholders(skill.body, 'agents', commandNames);
    if (prefix) skillBody = prefixSkillReferences(skillBody, prefix, allSkillNames);
    const content = `${frontmatter}\n\n${skillBody}`;
    const outputPath = path.join(skillDir, 'SKILL.md');
    writeFile(outputPath, content);

    // Copy reference files if they exist
    if (skill.references && skill.references.length > 0) {
      const refDir = path.join(skillDir, 'reference');
      ensureDir(refDir);
      for (const ref of skill.references) {
        const refOutputPath = path.join(refDir, `${ref.name}.md`);
        const refContent = replacePlaceholders(ref.content, 'agents');
        writeFile(refOutputPath, refContent);
        refCount++;
      }
    }
  }

  const userInvocableCount = skills.filter(s => s.userInvocable).length;
  const refInfo = refCount > 0 ? ` (${refCount} reference files)` : '';
  const prefixInfo = prefix ? ` [${prefix}prefixed]` : '';
  console.log(`✓ Agents${prefixInfo}: ${skills.length} skills (${userInvocableCount} user-invocable)${refInfo}`);
}
