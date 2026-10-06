#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepo } from './validate-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataArg = process.argv.indexOf('--data');
const dataRoot = dataArg > -1 ? process.argv[dataArg + 1] : undefined;
const { errors, warnings } = validateRepo(root, { dataRoot });

for (const w of warnings) console.warn(`warning  ${w}`);
for (const e of errors) console.error(`error    ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s). The Dot reads these files, so fix them before you push.`);
  process.exit(1);
}
console.log(`ok: no errors, ${warnings.length} warning(s)`);
