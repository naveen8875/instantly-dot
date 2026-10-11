import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { loadAccess, checkAccess, renderTools, renderKeyScopes, renderAccessLevels, renderMailboxPauseNote, buildMcpFiles } from './grok-access.mjs';

// Builds the Grok Bot skills from the Dot's source files, so there is one source of truth.
//
//   playbooks/*.md, voice/tone.md, templates/*.md, setup/self-check.md, START_HERE.md, config/approvals.yaml
//        │  includes, section overrides, text replacements (all declared in grok/skills.yaml)
//        ▼
//   grok/plugin/skills/<name>/SKILL.md      (self-contained: every file a skill refers to is inlined at the end)
//
// The build FAILS if a finished skill still mentions something a Bot will not have (a repo folder, "ChatGPT",
// a file that is not inlined), so a skill can never point at something that is not there.

export const MANIFEST = 'grok/skills.yaml';
const DATA_FILE_NAMES = new Set([
  'agency.yaml', 'workspace.yaml', 'icp.yaml', 'profile.md', 'voice.md', 'examples.md', 'learnings.md',
  'runs.md', 'replies.md', 'pending.md', 'batches.md', 'experiments.md', 'removed-lessons.md', 'orders.md', // the files in logs/
  'infra.md', // a client's sending-infrastructure answers
  'routines.md', // the list of routines the owner has
]);
const FILE_REF = /`([^`\s]+\.(?:md|ya?ml|mjs|json))`/g;
const FORBIDDEN = [
  [/\bDots?\b/, 'mentions a Dot'],
  [/ChatGPT/i, 'mentions ChatGPT'],
  [/\bSlack\b/, 'mentions Slack'],
  [/START_HERE/, 'mentions START_HERE'],
  [/\bplaybooks?\b/i, 'mentions a playbook'],
  [/instructions folder/i, 'mentions the instructions folder'],
  [/GitHub/, 'mentions GitHub'],
  [/\bnpm\b|\bnode scripts/, 'mentions npm or node scripts'],
  [/pull request/i, 'mentions a pull request'],
  [/\{\{(approvals|tools|key_scopes|access_levels|mailbox_pause_note|skills|include)\b/, 'has a placeholder that was never filled in'],
];

const headingLevel = (line) => {
  const m = /^(#{1,6}) /.exec(line);
  return m ? m[1].length : 0;
};

// Walks lines and reports which ones are inside a ``` fence.
function fenceMap(lines) {
  let inFence = false;
  return lines.map((l) => {
    if (/^\s*```/.test(l)) {
      const was = inFence;
      inFence = !inFence;
      return was || inFence; // the fence lines themselves count as fenced
    }
    return inFence;
  });
}

function sectionRange(text, heading) {
  const lines = text.split('\n');
  const fenced = fenceMap(lines);
  const i = lines.findIndex((l, n) => !fenced[n] && l.trim() === heading.trim());
  if (i < 0) throw new Error(`heading not found: "${heading}"`);
  const level = headingLevel(lines[i]);
  let j = i + 1;
  while (j < lines.length) {
    const lv = fenced[j] ? 0 : headingLevel(lines[j]);
    if (lv && lv <= level) break;
    j++;
  }
  return { lines, i, j };
}

export function extractSection(text, heading) {
  const { lines, i, j } = sectionRange(text, heading);
  return lines.slice(i, j).join('\n').replace(/\n+$/, '');
}

export function replaceSection(text, heading, replacement) {
  const { lines, i, j } = sectionRange(text, heading);
  return [...lines.slice(0, i), replacement.replace(/\n+$/, ''), '', ...lines.slice(j)].join('\n');
}

function demote(text, by) {
  const lines = text.split('\n');
  const fenced = fenceMap(lines);
  return lines
    .map((l, n) => {
      if (fenced[n]) return l;
      const m = /^(#{1,6}) /.exec(l);
      return m ? '#'.repeat(Math.min(6, m[1].length + by)) + l.slice(m[1].length) : l;
    })
    .join('\n');
}

function replaceAll(text, rule, where) {
  const { from, to, regex, required } = rule;
  if (regex) {
    const re = new RegExp(from, 'g');
    if (!re.test(text)) {
      if (required) throw new Error(`${where}: replacement did not match (regex): ${from}`);
      return text;
    }
    return text.replace(new RegExp(from, 'g'), to);
  }
  if (!text.includes(from)) {
    if (required) throw new Error(`${where}: replacement did not match: ${String(from).slice(0, 90)}`);
    return text;
  }
  return text.split(from).join(to);
}

// Renders config/approvals.yaml as three plain lists, keeping each action's comment.
export function renderApprovals(text, commentOverrides = {}, levelOverrides = {}) {
  const groups = { auto: [], ask: [], never: [] };
  let inActions = false;
  for (const raw of text.split('\n')) {
    if (/^actions:\s*$/.test(raw)) {
      inActions = true;
      continue;
    }
    if (!inActions) continue;
    const m = /^  ([a-z_]+):\s*(auto|ask|never)\s*(?:#\s*(.*))?$/.exec(raw);
    if (!m) continue;
    const [, name, fileLevel, comment] = m;
    const level = levelOverrides[name] ?? fileLevel;
    const note = name in commentOverrides ? commentOverrides[name] : comment;
    groups[level].push(note ? `- \`${name}\`: ${note}` : `- \`${name}\``);
  }
  return [
    '**Do without asking (auto):**',
    ...groups.auto,
    '',
    '**Ask the owner first, every time (ask):**',
    ...groups.ask,
    '',
    '**Never. A human does it (never):**',
    ...groups.never,
  ].join('\n');
}

export function loadManifest(root) {
  return YAML.parse(fs.readFileSync(path.join(root, MANIFEST), 'utf8'));
}

// The owner's own files. `clients/_template/` is not: it holds the skeletons the Bot copies from, so it must be inlined.
function isDataRef(ref) {
  if (ref.startsWith('clients/_template/')) return false;
  return ref.startsWith('clients/') || ref.startsWith('logs/') || ref === 'config/agency.yaml' || ref === 'config/routines.md' || DATA_FILE_NAMES.has(ref);
}

export function buildAll(root) {
  const manifest = loadManifest(root);
  const rd = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const errors = [];
  const skillSlash = {}; // playbook file -> /skill-name
  for (const s of manifest.skills) if (s.source.startsWith('playbooks/')) skillSlash[path.basename(s.source)] = `/${s.name}`;
  const overrides = manifest.overrides ?? {};
  const globalRules = (manifest.replace ?? []).map((r) => ({ required: false, ...r }));
  const access = loadAccess(root);
  for (const e of checkAccess(root, access)) errors.push(e);

  // Includes and placeholders that are generated from other files. Applied before AND after the per-file overrides, because an override may bring its own.
  //   {{include FILE "## Heading"}}        the section, heading included
  //   {{include FILE "## Heading" body}}   the section's text without its heading line
  const fillOnce = (t) =>
    t
      .replace(/\{\{include (\S+) "([^"]+)"( body)?\}\}/g, (_, file, heading, body) => {
        const section = extractSection(rd(file), heading);
        return body ? section.split('\n').slice(1).join('\n').replace(/^\n+/, '') : section;
      })
      .replace(/\{\{approvals\}\}/g, () => renderApprovals(rd('config/approvals.yaml'), manifest.approvals_comments ?? {}, manifest.approvals_overrides ?? {}))
      .replace(/\{\{mailbox_pause_note\}\}/g, () => renderMailboxPauseNote(access))
      .replace(/\{\{tools\}\}/g, () => renderTools(access))
      .replace(/\{\{key_scopes\}\}/g, () => renderKeyScopes(access))
      .replace(/\{\{access_levels\}\}/g, () => renderAccessLevels(access))
      .replace(/\{\{skills\}\}/g, () =>
        ['| Skill | Use it when |', '|---|---|', ...manifest.skills.map((s) => `| \`/${s.name}\` | ${s.when} |`)].join('\n'),
      );
  // An include may itself contain an include or a placeholder, so repeat until nothing changes (at most three times).
  const fill = (t) => {
    for (let i = 0; i < 3; i++) {
      const next = fillOnce(t);
      if (next === t) break;
      t = next;
    }
    return t;
  };

  // Apply everything that is declared for one source file, in a fixed order.
  function process(rel, textIn, where) {
    const own = overrides[rel] ?? {};
    let text = own.replace_file ? rd(own.replace_file) : textIn;
    // 1. includes and generated placeholders
    text = fill(text);
    // 2. per-file overrides
    const o = overrides[rel] ?? {};
    for (const [heading, file] of Object.entries(o.replace_sections ?? {})) {
      // a section override is a file, or { flag, on, off }: the file used depends on `features.<flag>` in the manifest
      const chosen = typeof file === 'string' ? file : (manifest.features?.[file.flag] ? file.on : file.off);
      text = replaceSection(text, heading, rd(chosen));
    }
    for (const rule of o.replace_text ?? []) text = replaceAll(text, { required: true, ...rule }, `${where} (${rel})`);
    text = fill(text);
    // 3. global rules
    for (const rule of globalRules) text = replaceAll(text, rule, where);
    // 4. cross references to other playbooks
    text = text.replace(/`(?:playbooks\/)?(\d\d-[a-z-]+\.md)`/g, (m, f) => (skillSlash[f] ? `\`${skillSlash[f]}\`` : m));
    text = text.replace(/\bplaybook (\d\d)\b/gi, (m, n) => {
      const hit = Object.entries(skillSlash).find(([f]) => f.startsWith(`${n}-`));
      return hit ? `\`${hit[1]}\`` : m;
    });
    text = text.replace(/\bplaybooks?\b/gi, (m) => (m[0] === 'P' ? 'Skill' : 'skill') + (m.toLowerCase().endsWith('s') ? 's' : ''));
    return text;
  }

  const files = { ...buildMcpFiles(access) }; // the plugin's connection configs, with the tool allowlist
  for (const skill of manifest.skills) {
    const where = `skill ${skill.name}`;
    try {
      let body = process(skill.source, rd(skill.source), where);
      body = body.replace(/^# \d\d · /m, '# ');

      // Inline every repo file the skill refers to (templates, skeletons, the self-check), recursively.
      const appended = [];
      const seen = new Set();
      const queue = [];
      const scan = (text) => {
        for (const m of text.matchAll(FILE_REF)) {
          const ref = m[1];
          if (isDataRef(ref) || seen.has(ref) || ref.includes('<') || ref.includes('*')) continue;
          if (fs.existsSync(path.join(root, ref)) && !(manifest.never_inline ?? []).includes(ref)) {
            seen.add(ref);
            queue.push(ref);
          }
        }
      };
      scan(body);
      while (queue.length) {
        const ref = queue.shift();
        const text = process(ref, rd(ref), where);
        appended.push({ ref, text });
        scan(text);
      }
      let out = body.replace(/\n+$/, '') + '\n';
      for (const a of appended) out += `\n---\n\n## Reference: \`${a.ref}\`\n\n${demote(a.text, 2).replace(/\n+$/, '')}\n`;

      const preamble = skill.base
        ? ''
        : `> **Before you start:** follow \`/instantly-operating-rules\`${skill.writes ? ' and \`/instantly-voice-rules\`' : ''}. The owner's files live in \`${manifest.data_folder}/\`.\n\n`;
      const header = `---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n<!-- Generated by \`npm run build:grok\` from ${skill.source}. Do not edit: change the source and rebuild. -->\n\n`;
      const finalText = header + preamble + out;
      files[`${manifest.output_dir}/${skill.name}/SKILL.md`] = finalText;

      // Lint: nothing in a finished skill may point at something the Bot does not have.
      const allowed = new Set(appended.map((a) => a.ref));
      const problems = [];
      const lintable = finalText.replace(/<!--[\s\S]*?-->/g, '');
      for (const [re, msg] of FORBIDDEN) {
        const lines = lintable.split('\n');
        lines.forEach((l, n) => {
          if (re.test(l)) problems.push(`${msg} (line ${n + 1}: ${l.trim().slice(0, 110)})`);
        });
      }
      for (const m of lintable.matchAll(FILE_REF)) {
        const ref = m[1];
        if (isDataRef(ref) || allowed.has(ref) || ref.includes('<') || ref.includes('*')) continue;
        problems.push(`refers to \`${ref}\`, which is not inlined`);
      }
      for (const p of [...new Set(problems)]) errors.push(`${where}: ${p}`);
    } catch (e) {
      errors.push(`${where}: ${e.message}`);
    }
  }
  return { files, errors, manifest };
}
