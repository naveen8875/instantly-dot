import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { validateRepo } from '../scripts/validate-lib.mjs';

// The Dot sets itself up by copying the shipped skeleton files and following playbooks/00-onboarding.md.
// These tests act as that Dot, so the playbook, the skeletons and the validator cannot drift apart.

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const PLAYBOOK = rd('playbooks/00-onboarding.md');
const FOLDER = 'acme-co';

// "Replace every REPLACE_ME value". The values a human would give in the form.
function fillValue(keyPath) {
  const k = keyPath.join('.');
  if (/timezone$/.test(k)) return 'America/New_York';
  if (/\.repo$/.test(k)) return 'acme/instantly-dot';
  if (/slack_user$/.test(k)) return '@sam';
  if (/mailboxes\.\d+$/.test(k)) return 'sam@acme-mail.com';
  if (/link$/.test(k)) return 'https://cal.example.com/sam';
  if (/campaigns\.\d+\.id$|campaign_id$/.test(k)) return 'cmp-0001';
  if (/workspace_id$/.test(k)) return 'ws-0001';
  if (/connection$/.test(k)) return 'Instantly';
  if (/^slack\./.test(k)) return `#${FOLDER}-${keyPath[keyPath.length - 1]}`;
  if (/calendar_id$/.test(k)) return 'primary';
  if (/folder$/.test(k)) return FOLDER;
  return 'Filled value';
}
function fill(node, p = []) {
  if (typeof node === 'string') {
    if (!node.includes('REPLACE_ME')) return node;
    return node.startsWith('#') ? `#${FOLDER}-${p[p.length - 1]}` : fillValue(p);
  }
  if (Array.isArray(node)) return node.map((v, i) => fill(v, [...p, String(i)]));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, [...p, k])]));
  return node;
}
const parse = (rel) => YAML.parse(rd(rel));
const stripComment = (t) => t.replace(/<!--[\s\S]*?-->\s*\n?/g, '');

// The playbook says: for interface chatgpt delete agency.channels, owner.slack_user, approvers[].slack_user and the slack: blocks.
function onboard(iface) {
  const agency = fill(parse('config/agency.example.yaml'));
  agency.interface = iface;
  agency.mode = 'dry_run';
  agency.wake.primary = 'schedule_only';
  agency.agency.approvers = [{ name: 'Sam', ...(iface === 'slack' ? { slack_user: '@sam' } : {}) }];
  agency.clients = [{ folder: FOLDER, active: true }];

  const ws = fill(parse('clients/_template/workspace.example.yaml'));
  ws.mode = 'dry_run';
  ws.offer.proof_points = [];
  const icp = fill(parse('clients/_template/icp.example.yaml'));
  icp.segments[0].search_filters = {};
  icp.segments[0].campaign_id = ws.instantly.campaigns[0].id;

  if (iface === 'chatgpt') {
    delete agency.agency.channels;
    delete agency.agency.owner.slack_user;
    delete agency.slack;
    delete ws.slack;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'onb-'));
  const w = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  w('config/approvals.yaml', rd('config/approvals.yaml'));
  w('config/agency.yaml', YAML.stringify(agency));
  w(`clients/${FOLDER}/workspace.yaml`, YAML.stringify(ws));
  w(`clients/${FOLDER}/icp.yaml`, YAML.stringify(icp));
  w(`clients/${FOLDER}/voice.md`, stripComment(rd('clients/_template/voice.md')));
  w(`clients/${FOLDER}/examples.md`, stripComment(rd('clients/_template/examples.md')));
  w(`clients/${FOLDER}/learnings.md`, rd('clients/_template/learnings.md'));
  w(`clients/${FOLDER}/logs/README.md`, rd('clients/_template/logs/README.md'));
  return { root, agency, ws };
}

test('following the onboarding playbook with the chatgpt interface produces config the validator accepts', () => {
  const { root, agency, ws } = onboard('chatgpt');
  const r = validateRepo(root);
  assert.deepEqual(r.errors, []);
  assert.equal(agency.mode, 'dry_run');
  assert.equal(ws.mode, 'dry_run');
  assert.equal(agency.wake.primary, 'schedule_only');
});

test('following the onboarding playbook with the slack interface produces config the validator accepts', () => {
  const { root } = onboard('slack');
  assert.deepEqual(validateRepo(root).errors, []);
});

test('the real shipped instructions validate a data folder the Dot created separately (the local setup)', () => {
  for (const iface of ['chatgpt', 'slack']) {
    const { root: dataRoot } = onboard(iface); // the Dot's instantly-dot-data folder
    const res = validateRepo(REPO, { dataRoot }); // REPO = the read-only instructions
    assert.deepEqual(res.errors, [], iface);
  }
});

test('every skeleton the playbook tells the Dot to copy exists in the repo', () => {
  const table = PLAYBOOK.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('| `'));
  const skeletons = table.map((l) => l.split('|')[2].trim().replace(/`/g, '')).filter(Boolean);
  assert.ok(skeletons.length >= 6, 'expected the skeleton table');
  for (const s of skeletons) assert.ok(fs.existsSync(path.join(REPO, s)), `playbook names ${s}, which does not exist`);
});

test('the skeletons put REPLACE_ME only in values and header comments, so "replace the values, delete the comment lines" is enough', () => {
  for (const rel of ['config/agency.example.yaml', 'clients/_template/workspace.example.yaml', 'clients/_template/icp.example.yaml']) {
    const lines = rd(rel).split('\n');
    for (const line of lines) {
      if (!line.includes('REPLACE_ME')) continue;
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue; // a comment line: the playbook says to delete these
      const inlineComment = line.includes(' #') ? line.slice(line.indexOf(' #')) : '';
      assert.ok(!inlineComment.includes('REPLACE_ME'), `${rel}: REPLACE_ME inside a trailing comment: ${line.trim()}`);
      assert.ok(/["']/.test(line), `${rel}: REPLACE_ME outside a quoted value: ${line.trim()}`);
    }
  }
  for (const rel of ['clients/_template/voice.md', 'clients/_template/examples.md']) {
    const text = rd(rel);
    assert.ok(!stripComment(text).includes('REPLACE_ME'), `${rel}: REPLACE_ME outside the leading comment block`);
  }
});

test('the playbook forbids the dangerous things and every action it cites is real', () => {
  assert.match(PLAYBOOK, /Never write `live`/);
  assert.match(PLAYBOOK, /Never put an API key/);
  assert.match(PLAYBOOK, /one pull request/i);
  assert.match(PLAYBOOK, /data folder/i);
  assert.match(PLAYBOOK, /Instructions are read only/);
  const actions = parse('config/approvals.yaml').actions;
  assert.equal(actions.write_setup_config, 'ask');
  assert.equal(actions.edit_repo_config, 'never');
  assert.match(rd('START_HERE.md'), /Run `playbooks\/00-onboarding\.md` and nothing else/);
  assert.match(rd('START_HERE.md'), /Your two folders/);
});
