import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFiles, lookupInstantly, renderBootstrap, slugify, PLACEHOLDER } from '../scripts/init-lib.mjs';
import { validateRepo } from '../scripts/validate-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const templates = {
  examples: rd('clients/_template/examples.md'),
  learnings: rd('clients/_template/learnings.md'),
  logsReadme: rd('clients/_template/logs/README.md'),
};

const full = (over = {}) => ({
  interface: 'chatgpt',
  agency: { name: 'Acme Growth', timezone: 'America/New_York', repo: 'acme/instantly-dot' },
  owner: { name: 'Sam Lee', slackUser: '' },
  client: {
    name: 'Acme Co',
    connection: 'Acme Instantly',
    workspaceId: 'ws-0001',
    campaigns: [{ id: 'cmp-0001', name: 'Q4 VP Sales' }],
    mailboxes: ['sam@acme-mail.com'],
  },
  sender: { displayName: 'Sam', signature: 'Sam' },
  offer: { cta: 'a 20-minute call', calendarLink: 'https://cal.example.com/sam', videoLink: 'https://meet.example.com/sam', proofPoints: ['Cut ramp from 90 to 30 days'] },
  calendar: { id: 'primary', timezone: 'America/New_York' },
  icp: { plainLanguage: 'VPs of Sales at Series A fintech' },
  ...over,
});

// Writes the generated files into a scratch repo that has the real approvals.yaml, then runs the real validator.
function validateGenerated(answers) {
  const { files, folder, todo } = buildFiles(answers, templates);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'init-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.copyFileSync(path.join(REPO, 'config/approvals.yaml'), path.join(root, 'config/approvals.yaml'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return { ...validateRepo(root), folder, todo, files };
}

test('slugify makes a safe folder name', () => {
  assert.equal(slugify('Acme Co.'), 'acme-co');
  assert.equal(slugify('  Ünïcode & Friends!! '), 'n-code-friends');
  assert.equal(slugify(''), 'client');
});

test('chatgpt answers generate a config the real validator accepts, in dry_run', () => {
  const r = validateGenerated(full());
  assert.deepEqual(r.errors, []);
  assert.equal(r.folder, 'acme-co');
  assert.ok(r.files['config/agency.yaml'].includes('interface: chatgpt'));
  assert.ok(!r.files['config/agency.yaml'].includes('slack_user'));
  assert.ok(!r.files['clients/acme-co/workspace.yaml'].includes('slack:'));
  assert.ok(r.files['clients/acme-co/workspace.yaml'].includes('mode: dry_run'));
  assert.ok(r.files['config/agency.yaml'].includes('mode: dry_run'));
  assert.ok(r.files['config/agency.yaml'].includes('primary: schedule_only'));
});

test('slack answers generate a config the real validator accepts', () => {
  const r = validateGenerated(full({ interface: 'slack', owner: { name: 'Sam Lee', slackUser: '@sam' } }));
  assert.deepEqual(r.errors, []);
  assert.ok(r.files['clients/acme-co/workspace.yaml'].includes('#acme-co-approvals'));
  assert.ok(r.files['config/agency.yaml'].includes('#agency-alerts'));
});

test('empty examples, no proof point and no filters are warnings, not blockers, for a first try', () => {
  const r = validateGenerated(full({ offer: { cta: '', calendarLink: 'https://cal.example.com/sam', proofPoints: [] } }));
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('proof_points is empty')));
  assert.ok(r.warnings.some((w) => w.includes('no search_filters yet')));
  assert.ok(r.warnings.some((w) => w.includes('all 8 sections are empty')));
});

test('blank answers become REPLACE_ME so the validator tells you exactly what is left', () => {
  const r = validateGenerated(full({ client: { name: 'Acme Co', campaigns: [], mailboxes: [], workspaceId: '' }, offer: { proofPoints: [] } }));
  assert.ok(r.errors.some((e) => e.includes('workspace.yaml') && e.includes('REPLACE_ME')));
  assert.ok(r.todo.includes('clients/acme-co/workspace.yaml'));
  assert.ok(r.files['clients/acme-co/workspace.yaml'].includes(PLACEHOLDER));
});

test('generated clients always start in dry_run and never loosen approvals', () => {
  const { files } = buildFiles(full(), templates);
  for (const [rel, text] of Object.entries(files)) if (rel.endsWith('.yaml')) assert.ok(!/mode:\s*live/.test(text), rel);
  assert.ok(!Object.keys(files).some((f) => f.includes('approvals')));
});

test('the template comment blocks are stripped from generated markdown', () => {
  const { files } = buildFiles(full(), templates);
  assert.ok(!files['clients/acme-co/examples.md'].includes('REPLACE_ME'));
  assert.ok(files['clients/acme-co/examples.md'].includes('## referral'));
});

test('bootstrap prompt: chatgpt skips Slack checks and schedules; slack creates the 7 schedules; repo and client are filled in', () => {
  const c = renderBootstrap({ repo: 'acme/instantly-dot', folder: 'acme-co', interface: 'chatgpt' });
  assert.ok(c.includes('acme/instantly-dot') && c.includes('clients/acme-co/'));
  assert.ok(c.includes('skip checks 9 and 10') && c.includes('Do not create any schedules'));
  const s = renderBootstrap({ repo: 'acme/instantly-dot', folder: 'acme-co', interface: 'slack' });
  assert.ok(s.includes('Create these 7 schedules'));
  assert.ok(renderBootstrap({ repo: PLACEHOLDER, folder: 'x', interface: 'chatgpt' }).includes('OWNER/REPO'));
});

function fakeInstantly(pages) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.authorization, method: init.method ?? 'GET' });
    if (url.endsWith('/workspaces/current')) return Response.json({ id: 'ws-1', name: 'Acme WS' });
    const after = new URL(url).searchParams.get('starting_after');
    const page = after ? pages[1] : pages[0];
    return Response.json(page);
  };
  return { fetchImpl, calls };
}

test('lookupInstantly: reads the workspace, follows pagination, returns campaigns with their mailboxes, GET only', async () => {
  const { fetchImpl, calls } = fakeInstantly([
    { items: [{ id: 'c1', name: 'One', status: 1, email_list: ['a@x.com', 'b@x.com'] }], next_starting_after: 'c1' },
    { items: [{ id: 'c2', name: 'Two', status: 0 }] },
  ]);
  const r = await lookupInstantly('secret-key', fetchImpl);
  assert.deepEqual(r.workspace, { id: 'ws-1', name: 'Acme WS' });
  assert.deepEqual(r.campaigns.map((c) => [c.id, c.mailboxes.length]), [['c1', 2], ['c2', 0]]);
  assert.ok(calls.every((c) => c.method === 'GET' && c.auth === 'Bearer secret-key'));
  assert.equal(calls.length, 3);
});

test('lookupInstantly: errors are plain and never contain the key', async () => {
  for (const [status, hint] of [[401, 'wrong or revoked'], [403, 'lacks a read scope'], [402, 'no paid plan']]) {
    await assert.rejects(
      () => lookupInstantly('super-secret-key', async () => new Response('{}', { status })),
      (e) => e.message.includes(String(status)) && e.message.includes(hint) && !e.message.includes('super-secret-key'),
    );
  }
});
