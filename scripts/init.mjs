#!/usr/bin/env node
// Setup wizard. Asks about 10 questions and writes config/agency.yaml and one client folder.
// Nothing is sent anywhere except, if you give it a key, read-only GET calls to Instantly.
//
//   npm run init                       interactive
//   npm run init -- --answers a.json   no prompts (see the shape in scripts/init-lib.mjs buildFiles)
//   npm run init -- --no-api           never call Instantly
//   npm run init -- --data ../instantly-dot-data   write the config to a separate data folder (the local setup)
//   npm run init -- --force            overwrite an existing config/agency.yaml and client folder
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { validateRepo } from './validate-lib.mjs';
import { buildFiles, lookupInstantly, campaignLabel, renderBootstrap, slugify } from './init-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const argVal = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);

const dataRoot = argVal('data') ? path.resolve(argVal('data')) : root;
const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : undefined);
const templates = {
  examples: read('clients/_template/examples.md'),
  learnings: read('clients/_template/learnings.md'),
  logsReadme: read('clients/_template/logs/README.md'),
};

function gitRemoteRepo() {
  try {
    const url = execSync('git remote get-url origin', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

function writeAll(files, force) {
  for (const rel of Object.keys(files)) {
    const p = path.join(dataRoot, rel);
    if (fs.existsSync(p) && !force && (rel === 'config/agency.yaml' || rel.endsWith('workspace.yaml'))) {
      console.error(`\n${rel} already exists. To add another client, follow setup/add-client.md (do not use --force: it would replace your first client). To start over, re-run with --force.`);
      process.exit(1);
    }
  }
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(dataRoot, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
}

function finish(answers, files, folder, todo) {
  console.log(`\nWrote ${Object.keys(files).length} files: config/agency.yaml and clients/${folder}/.`);
  const { errors, warnings } = validateRepo(root, { dataRoot });
  if (errors.length === 0) console.log('npm run validate: no errors.');
  else {
    console.log(`\nStill to fix (npm run validate lists these any time):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  if (warnings.length) {
    console.log('\nWorth doing before you go live (not needed to try it):');
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (todo.length) console.log(`\nSearch for REPLACE_ME in: ${todo.join(', ')}`);
  console.log(`
Next:
  1. git add -A && git commit -m "Set up Instantly Dot" && git push
  2. In ChatGPT, open your Dot and connect Instantly and GitHub (see QUICKSTART.md, step 5)
  3. Paste this into your Dot:

----------------------------------------------------------------
${renderBootstrap({ repo: answers.agency.repo, folder, interface: answers.interface })}
----------------------------------------------------------------
`);
}

async function main() {
  const answersFile = argVal('answers');
  if (answersFile) {
    const answers = JSON.parse(fs.readFileSync(path.resolve(answersFile), 'utf8'));
    const { files, folder, todo } = buildFiles(answers, templates);
    writeAll(files, flag('force'));
    return finish(answers, files, folder, todo);
  }

  // A line iterator, not rl.question(): it also works when input is pasted or piped, and it returns '' at end of input instead of hanging.
  const tty = Boolean(process.stdin.isTTY);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
  const lines = rl[Symbol.asyncIterator]();
  const nextLine = async () => {
    const r = await lines.next();
    return r.done ? '' : r.value;
  };
  const ask = async (q, def = '') => {
    process.stdout.write(def ? `${q} [${def}] ` : `${q} `);
    const a = (await nextLine()).trim();
    if (!tty) process.stdout.write(`${a}\n`);
    return a || def;
  };
  const askSecret = async (q) => {
    process.stdout.write(q);
    const orig = rl._writeToOutput;
    if (tty) rl._writeToOutput = () => {};
    const a = (await nextLine()).trim();
    if (tty) rl._writeToOutput = orig;
    process.stdout.write('\n');
    return a;
  };

  console.log('\nInstantly Dot setup. About 5 minutes. It only writes files in this folder.\nPress Enter to accept a [default]. Leave anything blank to fill in later: it is written as REPLACE_ME and `npm run validate` will list it.\n');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const agencyName = await ask('Your company or agency name:');
  const timezone = await ask('Your timezone:', tz);
  const repo = await ask('Your GitHub repo for this copy (owner/name):', gitRemoteRepo());
  const ownerName = await ask('Your name (you are the owner and the approver):');

  console.log('\nWhere will you approve things?\n  1) In ChatGPT chat. Easiest: no Slack, no relay, nothing to deploy.\n  2) In Slack. Needs a Slack admin to approve the app, plus a relay for fast wake-ups.');
  const iface = (await ask('Choose 1 or 2:', '1')) === '2' ? 'slack' : 'chatgpt';
  let slackUser = '';
  if (iface === 'slack') slackUser = await ask('Your Slack handle (for example @sam):');

  const clientName = await ask('\nClient name (or your own company, if you are trying it on yourself):');
  const folder = slugify(clientName);

  let found;
  if (!flag('no-api')) {
    let key = process.env.INSTANTLY_API_KEY ?? '';
    if (key) console.log('\nINSTANTLY_API_KEY is set in your shell: using it for read-only lookups.');
    else {
      console.log('\nOptional: paste an Instantly API key and I will fill in your workspace, campaigns and mailboxes.\nUse a READ-ONLY key (scope all:read). It stays in memory, is never saved, and I only make read calls.');
      key = await askSecret('API key (Enter to skip): ');
    }
    if (key) {
      try {
        found = await lookupInstantly(key);
        console.log(`Found workspace "${found.workspace.name}" with ${found.campaigns.length} campaign(s).`);
      } catch (e) {
        console.log(`Could not look it up: ${e.message}. Carrying on, you can fill these in by hand.`);
      }
    }
  }

  let workspaceId = '';
  let campaigns = [];
  let mailboxes = [];
  if (found) {
    workspaceId = found.workspace.id;
    if (found.campaigns.length) {
      found.campaigns.forEach((c, i) => console.log(`  ${i + 1}) ${campaignLabel(c)}`));
      const pick = await ask('Which campaigns belong to this client? Numbers like 1,3 (Enter = all):');
      const idx = pick ? pick.split(/[,\s]+/).map((n) => Number(n) - 1).filter((n) => found.campaigns[n]) : found.campaigns.map((_, i) => i);
      campaigns = idx.map((i) => ({ id: found.campaigns[i].id, name: found.campaigns[i].name }));
      mailboxes = [...new Set(idx.flatMap((i) => found.campaigns[i].mailboxes))];
      console.log(`Their sender mailboxes (${mailboxes.length}): ${mailboxes.join(', ') || 'none found'}`);
      if (mailboxes.length && (await ask('Use these mailboxes? (Y/n)', 'Y')).toLowerCase().startsWith('n')) mailboxes = [];
    }
  }
  if (!workspaceId) workspaceId = await ask('Instantly workspace id (blank to fill in later):');
  if (!campaigns.length) {
    const ids = await ask('Campaign ids, comma separated (blank to fill in later):');
    campaigns = ids ? ids.split(',').map((s) => ({ id: s.trim(), name: s.trim() })).filter((c) => c.id) : [];
  }
  if (!mailboxes.length) {
    const m = await ask('Sender mailboxes, comma separated (blank to fill in later):');
    mailboxes = m ? m.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }

  const connection = await ask('Name of the Instantly connection in ChatGPT for this workspace:', `${clientName} Instantly`);
  const displayName = await ask('Name replies are signed with:', ownerName);
  const cta = await ask('What do you ask for?', 'a 20-minute call');
  const calendarLink = await ask('Your booking link (https://...):');
  const videoLink = await ask('Video call link (Enter = same as the booking link):', calendarLink);
  const proof = await ask('One real result you can cite, for example "Cut ramp time from 90 to 30 days" (blank = none yet):');
  const icp = await ask('Who are you trying to reach? One sentence, for example "VPs of Sales at Series A fintech":');
  rl.close();

  const answers = {
    interface: iface,
    agency: { name: agencyName, timezone, repo },
    owner: { name: ownerName, slackUser },
    client: { name: clientName, folder, connection, workspaceId, campaigns, mailboxes },
    sender: { displayName, signature: displayName },
    offer: { cta, calendarLink, videoLink, proofPoints: proof ? [proof] : [] },
    calendar: { id: 'primary', timezone },
    icp: { plainLanguage: icp },
  };
  const { files, todo } = buildFiles(answers, templates);
  writeAll(files, flag('force'));
  finish(answers, files, folder, todo);
}

main().catch((e) => {
  console.error(`\nSetup stopped: ${e.message}`);
  process.exit(1);
});
