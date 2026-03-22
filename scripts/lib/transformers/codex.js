import path from 'path';
import { cleanDir, ensureDir, writeFile, generateYamlFrontmatter, replacePlaceholders, prefixSkillReferences, buildArgumentHint } from '../utils.js';

/**
 * Codex Transformer (Skills Only)
 *
 * All skills output to .codex/skills/{name}/SKILL.md
 * Frontmatter: name, description, argument-hint for user-invocable skills
 * For user-invocable skills: {{argname}} becomes $ARGNAME in body
 *
 * @param {Array} skills - All skills (including user-invocable ones)
 * @param {string} distDir - Distribution output directory
 * @param {Object} patterns - Design patterns data (unused)
 * @param {Object} options - Optional settings
 * @param {string} options.prefix - Prefix to add to user-invocable skill names (e.g., 'i-')
 * @param {string} options.outputSuffix - Suffix for output directory (e.g., '-prefixed')
 */
export function transformCodex(skills, distDir, patterns = null, options = {}) {
  const { prefix = '', outputSuffix = '' } = options;
  const codexDir = path.join(distDir, `codex${outputSuffix}`);
  const skillsDir = path.join(codexDir, '.codex/skills');

  cleanDir(codexDir);
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

    if (skill.userInvocable && (skill.argumentHint || (skill.args && skill.args.length > 0))) {
      frontmatterObj['argument-hint'] = skill.argumentHint || buildArgumentHint(skill.args);
    }
    if (skill.license) frontmatterObj.license = skill.license;

    const frontmatter = generateYamlFrontmatter(frontmatterObj);

    let skillBody = replacePlaceholders(skill.body, 'codex', commandNames);
    if (prefix) skillBody = prefixSkillReferences(skillBody, prefix, allSkillNames);
    // For user-invocable skills, transform remaining {{argname}} to $ARGNAME
    if (skill.userInvocable) {
      skillBody = skillBody.replace(/\{\{([^}]+)\}\}/g, (match, argName) => {
        return `$${argName.toUpperCase()}`;
      });
    }

    const content = `${frontmatter}\n\n${skillBody}`;
    const outputPath = path.join(skillDir, 'SKILL.md');
    writeFile(outputPath, content);

    // Copy reference files if they exist
    if (skill.references && skill.references.length > 0) {
      const refDir = path.join(skillDir, 'reference');
      ensureDir(refDir);
      for (const ref of skill.references) {
        const refOutputPath = path.join(refDir, `${ref.name}.md`);
        const refContent = replacePlaceholders(ref.content, 'codex');
        writeFile(refOutputPath, refContent);
        refCount++;
      }
    }
  }

  const userInvocableCount = skills.filter(s => s.userInvocable).length;
  const refInfo = refCount > 0 ? ` (${refCount} reference files)` : '';
  const prefixInfo = prefix ? ` [${prefix}prefixed]` : '';
  console.log(`✓ Codex${prefixInfo}: ${skills.length} skills (${userInvocableCount} user-invocable)${refInfo}`);
}
