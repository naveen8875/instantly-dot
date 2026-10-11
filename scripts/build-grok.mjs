#!/usr/bin/env node
// Builds the Grok Bot skills from the Dot's playbooks, templates and rules (see scripts/grok-lib.mjs and grok/skills.yaml).
//   npm run build:grok          write grok/plugin/skills/*/SKILL.md
//   npm run check:grok          fail if the committed skills are out of date, or any skill points at something missing
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './grok-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const { files, errors, manifest } = buildAll(root);

if (errors.length) {
  console.error(errors.map((e) => `error    ${e}`).join('\n'));
  console.error(`\n${errors.length} problem(s). A skill may only mention things the Bot actually has. Fix the source or add a rule in grok/skills.yaml.`);
  process.exit(1);
}

const outDir = path.join(root, manifest.output_dir);
const wanted = new Set(Object.keys(files));
const stale = fs.existsSync(outDir)
  ? fs.readdirSync(outDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `${manifest.output_dir}/${d.name}/SKILL.md`).filter((f) => !wanted.has(f))
  : [];

if (check) {
  const out = [];
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) out.push(`missing: ${rel}`);
    else if (fs.readFileSync(p, 'utf8') !== text) out.push(`out of date: ${rel}`);
  }
  for (const s of stale) out.push(`not in the manifest any more: ${s}`);
  if (out.length) {
    console.error(out.map((o) => `error    ${o}`).join('\n') + '\n\nRun `npm run build:grok` and commit the result.');
    process.exit(1);
  }
  console.log(`ok: ${wanted.size} Grok skills are up to date`);
} else {
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  for (const s of stale) fs.rmSync(path.dirname(path.join(root, s)), { recursive: true, force: true });
  for (const [rel, text] of Object.entries(files)) console.log(`${String(text.split('\n').length).padStart(5)} lines  ${rel}`);
  console.log(`\nwrote ${wanted.size} skills${stale.length ? `, removed ${stale.length} stale` : ''}`);
}
