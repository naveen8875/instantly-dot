import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { validateRepo, CORE_NEVER, HARD_ASK } from '../scripts/validate-lib.mjs';
import { buildRoutes, webhookCommands } from '../scripts/build-relay-routes.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPROVALS = fs.readFileSync(path.join(REPO, 'config', 'approvals.yaml'), 'utf8');

const EXAMPLES = (fill = 'They asked a thing. We answered in one line.') =>
  ['interested', 'how it works', 'pricing', 'we already use a tool', 'no budget', 'send me info', 'not now', 'referral']
    .map((h) => `## ${h}\n\n${fill}\n`)
    .join('\n');

function client(key, over = {}) {
  return {
    client: { name: key },
    mode: 'dry_run',
    instantly: {
      connection: `${key} Instantly`,
      workspace_id: `ws-${key}-0000`,
      dot_sets_interest_status: true,
      campaigns: [{ id: `cmp-${key}-0001`, name: `${key} cold` }],
      mailboxes: [`sam@${key}-mail.com`],
    },
    slack: { events: `#${key}-events`, approvals: `#${key}-approvals`, alerts: `#${key}-alerts`, reports: `#${key}-reports` },
    sender: { display_name: 'Sam', signature: 'Sam' },
    offer: { primary_cta: 'a 20-minute call', calendar_link: `https://cal.example.com/${key}`, proof_points: ['Cut ramp from 90 to 30 days'] },
    calendar: {
      calendar_id: `${key}@example.com`,
      timezone: 'America/New_York',
      working_hours: { from: '09:00', to: '17:00', days: [1, 2, 3, 4, 5] },
      meeting_minutes: 20,
      buffer_minutes: 15,
      slots_to_offer: 3,
      booking_window_days: 7,
      video_link: `https://meet.example.com/${key}`,
    },
    limits: { max_replies_sent_per_run: 10, max_leads_per_batch: 200, max_new_leads_added_per_day: 100 },
    health: { min_health_score: 80, bounce_warn: 0.03, bounce_stop: 0.05, spam_complaint_stop: 0.003, daily_headroom_fraction: 0.5 },
    reporting: { positive_reply_target: 0.01 },
    ...over,
  };
}

function icp(key) {
  return {
    segments: [
      {
        name: 'VP Sales',
        active: true,
        plain_language: 'VPs of sales',
        campaign_id: `cmp-${key}-0001`,
        search_filters: { level: ['VP-Level'], department: ['Sales'] },
        never_contact: { domains: [], emails: [] },
        batch_size: 100,
        refill_when_days_of_leads_below: 5,
        structure: 'A',
        personalization: 'role-pain',
      },
    ],
  };
}

const AGENCY = (clients) => ({
  interface: 'slack',
  agency: {
    name: 'Test Agency',
    timezone: 'America/New_York',
    repo: 'test/agency',
    owner: { name: 'Owner', slack_user: '@owner' },
    approvers: [{ name: 'Owner', slack_user: '@owner' }],
    channels: { digest: '#agency-digest', alerts: '#agency-alerts' },
  },
  canary: 'v1',
  mode: 'dry_run',
  quiet_hours: { from: '22:00', to: '07:00' },
  wake: { primary: 'schedule_only', backup_poll_minutes: 60 },
  slack: { non_owner_slack_approvals: false },
  fallbacks: { allow_browser_fallback: true, allow_zapier_fallback: false },
  clients: clients.map((c) => ({ folder: c, active: true })),
});

function makeRepo({ clients = ['acme-co', 'globex'], tweak = () => {}, approvals = APPROVALS } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dot-'));
  const w = (rel, text) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  };
  w('config/approvals.yaml', approvals);
  w('config/agency.yaml', YAML.stringify(AGENCY(clients)));
  for (const c of clients) {
    w(`clients/${c}/workspace.yaml`, YAML.stringify(client(c)));
    w(`clients/${c}/icp.yaml`, YAML.stringify(icp(c)));
    w(`clients/${c}/voice.md`, '# Voice\n');
    w(`clients/${c}/examples.md`, EXAMPLES());
    w(`clients/${c}/learnings.md`, '# Learnings\n');
  }
  fs.mkdirSync(path.join(root, 'playbooks'), { recursive: true });
  const ctx = { root, w, read: (rel) => fs.readFileSync(path.join(root, rel), 'utf8'), yaml: (rel, fn) => {
    const doc = YAML.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
    fn(doc);
    fs.writeFileSync(path.join(root, rel), YAML.stringify(doc));
  } };
  tweak(ctx);
  return ctx;
}

const has = (res, text) => res.errors.some((e) => e.includes(text));

test('a correct two-client repo passes with no errors', () => {
  const { root } = makeRepo();
  const res = validateRepo(root);
  assert.deepEqual(res.errors, []);
});

test('REPLACE_ME anywhere in agency.yaml fails, including a comment', () => {
  const { root } = makeRepo({ tweak: ({ w, read }) => w('config/agency.yaml', '# REPLACE_ME delete me\n' + read('config/agency.yaml')) });
  assert.ok(has(validateRepo(root), 'REPLACE_ME'));
});

test('REPLACE_ME in a client file, or a leftover example file, fails', () => {
  const { root } = makeRepo({
    tweak: ({ w }) => {
      w('clients/acme-co/voice.md', '<!-- REPLACE_ME -->\n# Voice\n');
      w('clients/globex/workspace.example.yaml', 'x: 1\n');
    },
  });
  const res = validateRepo(root);
  assert.ok(has(res, 'clients/acme-co/voice.md: still contains REPLACE_ME'));
  assert.ok(has(res, 'delete the example file'));
});

test('two clients sharing a Slack channel fail the build', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/globex/workspace.yaml', (d) => (d.slack.approvals = '#acme-co-approvals')) });
  assert.ok(has(validateRepo(root), 'channel #acme-co-approvals is used by both'));
});

test('two clients sharing a campaign id or a mailbox fail the build', () => {
  const a = makeRepo({ tweak: ({ yaml }) => yaml('clients/globex/workspace.yaml', (d) => (d.instantly.campaigns[0].id = 'cmp-acme-co-0001')) });
  assert.ok(has(validateRepo(a.root), 'campaign cmp-acme-co-0001 is used by both'));
  const b = makeRepo({ tweak: ({ yaml }) => yaml('clients/globex/workspace.yaml', (d) => (d.instantly.mailboxes[0] = 'SAM@acme-co-mail.com')) });
  assert.ok(has(validateRepo(b.root), 'mailbox sam@acme-co-mail.com is used by both'));
});

test('a client channel that equals an agency channel fails', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/acme-co/workspace.yaml', (d) => (d.slack.reports = '#agency-digest')) });
  assert.ok(has(validateRepo(root), 'is also an agency channel'));
});

test('a shared Instantly workspace is only a warning', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/globex/workspace.yaml', (d) => (d.instantly.workspace_id = 'ws-acme-co-0000')) });
  const res = validateRepo(root);
  assert.deepEqual(res.errors, []);
  assert.ok(res.warnings.some((w) => w.includes('share Instantly workspace')));
});

test('loosening any core never line fails the build', () => {
  for (const name of CORE_NEVER) {
    const loosened = APPROVALS.replace(new RegExp(`^(\\s*${name}:)\\s*never`, 'm'), `$1 ask`);
    assert.notEqual(loosened, APPROVALS, `${name} not found in approvals.yaml`);
    const { root } = makeRepo({ approvals: loosened });
    assert.ok(has(validateRepo(root), `${name} must stay "never"`), name);
  }
});

test('setting a credit-spending or launch action to auto fails the build', () => {
  for (const name of HARD_ASK) {
    const loosened = APPROVALS.replace(new RegExp(`^(\\s*${name}:)\\s*\\w+`, 'm'), `$1 auto`);
    const { root } = makeRepo({ approvals: loosened });
    assert.ok(has(validateRepo(root), `${name} must not be "auto"`), name);
  }
});

test('setting a send action to auto passes with a warning', () => {
  const loosened = APPROVALS.replace(/^(\s*send_reply_interested:)\s*ask/m, '$1 auto');
  const { root } = makeRepo({ approvals: loosened });
  const res = validateRepo(root);
  assert.deepEqual(res.errors, []);
  assert.ok(res.warnings.some((w) => w.includes('send_reply_interested is "auto"')));
});

test('a playbook citing an action that is not in approvals.yaml fails', () => {
  const { root } = makeRepo({ tweak: ({ w }) => w('playbooks/99-test.md', 'Do the thing (approval: send_carrier_pigeon).\nAnd (approval: send_reply_question, read_inbox).') });
  const res = validateRepo(root);
  assert.ok(has(res, 'unknown approval action "send_carrier_pigeon"'));
  assert.equal(res.errors.filter((e) => e.includes('unknown approval')).length, 1);
});

test('an unlisted client folder, a bad timezone and a bad canary fail', () => {
  const { root } = makeRepo({
    tweak: ({ yaml }) =>
      yaml('config/agency.yaml', (d) => {
        d.clients.push({ folder: 'missing-co', active: true });
        d.agency.timezone = 'Mars/Olympus';
        d.canary = 'latest';
      }),
  });
  const res = validateRepo(root);
  assert.ok(has(res, 'clients/missing-co does not exist'));
  assert.ok(has(res, 'not a valid IANA timezone'));
  assert.ok(has(res, 'canary must look like'));
});

test('a segment pointing at a campaign the client does not own fails', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/acme-co/icp.yaml', (d) => (d.segments[0].campaign_id = 'cmp-globex-0001')) });
  assert.ok(has(validateRepo(root), 'campaign_id is not one of the campaigns in workspace.yaml'));
});

test('empty example sections warn in dry_run and fail when live', () => {
  const dry = makeRepo({ tweak: ({ w }) => w('clients/acme-co/examples.md', EXAMPLES('')) });
  const r1 = validateRepo(dry.root);
  assert.deepEqual(r1.errors, []);
  assert.ok(r1.warnings.some((x) => x.includes('all 8 sections are empty') && x.includes('before going live')));
  const live = makeRepo({
    tweak: ({ w, yaml }) => {
      w('clients/acme-co/examples.md', EXAMPLES(''));
      yaml('clients/acme-co/workspace.yaml', (d) => (d.mode = 'live'));
    },
  });
  assert.ok(has(validateRepo(live.root), 'empty and this client is live'));
});

test('empty proof_points: a warning in dry_run, an error when live. The Dot may not use a result that is not listed', () => {
  const dry = makeRepo({ tweak: ({ yaml }) => yaml('clients/acme-co/workspace.yaml', (d) => (d.offer.proof_points = [])) });
  const r = validateRepo(dry.root);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('proof_points is empty')));
  const live = makeRepo({
    tweak: ({ yaml }) =>
      yaml('clients/acme-co/workspace.yaml', (d) => {
        d.offer.proof_points = [];
        d.mode = 'live';
      }),
  });
  assert.ok(has(validateRepo(live.root), 'needs at least one real claim before going live'));
});

test('a segment may leave search_filters empty if plain_language says who to reach, but not both empty', () => {
  const ok = makeRepo({ tweak: ({ yaml }) => yaml('clients/acme-co/icp.yaml', (d) => (d.segments[0].search_filters = {})) });
  const r = validateRepo(ok.root);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('no search_filters yet')));
  const bad = makeRepo({
    tweak: ({ yaml }) =>
      yaml('clients/acme-co/icp.yaml', (d) => {
        d.segments[0].search_filters = {};
        d.segments[0].plain_language = '';
      }),
  });
  assert.ok(has(validateRepo(bad.root), 'needs search_filters, or a plain_language description'));
});

test('interface is required and must be chatgpt or slack', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('config/agency.yaml', (d) => delete d.interface) });
  assert.ok(has(validateRepo(root), 'interface must be one of chatgpt, slack'));
});

test('interface chatgpt needs no Slack handles, channels or relay', () => {
  const { root } = makeRepo({
    tweak: ({ yaml }) => {
      yaml('config/agency.yaml', (d) => {
        d.interface = 'chatgpt';
        delete d.agency.channels;
        delete d.agency.owner.slack_user;
        d.agency.approvers = [{ name: 'Owner' }];
        delete d.slack;
      });
      for (const c of ['acme-co', 'globex']) yaml(`clients/${c}/workspace.yaml`, (d) => delete d.slack);
    },
  });
  assert.deepEqual(validateRepo(root).errors, []);
});

test('interface chatgpt cannot use the Slack event wake', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('config/agency.yaml', (d) => { d.interface = 'chatgpt'; d.wake.primary = 'slack_event'; }) });
  assert.ok(has(validateRepo(root), 'slack_event needs interface slack'));
});

test('interface slack still requires every channel and handle', () => {
  const { root } = makeRepo({
    tweak: ({ yaml }) => {
      yaml('config/agency.yaml', (d) => delete d.agency.owner.slack_user);
      yaml('clients/acme-co/workspace.yaml', (d) => delete d.slack.alerts);
    },
  });
  const res = validateRepo(root);
  assert.ok(has(res, 'owner.slack_user is required when interface is slack'));
  assert.ok(has(res, 'slack.alerts must be a channel name'));
});

test('bounce_warn must be lower than bounce_stop', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/acme-co/workspace.yaml', (d) => (d.health.bounce_warn = 0.06)) });
  assert.ok(has(validateRepo(root), 'bounce_warn must be lower'));
});

test('instructions and data can live in separate folders (the local setup)', () => {
  const { root: dataRoot } = makeRepo();
  const instructions = fs.mkdtempSync(path.join(os.tmpdir(), 'instr-'));
  fs.mkdirSync(path.join(instructions, 'config'), { recursive: true });
  fs.copyFileSync(path.join(REPO, 'config/approvals.yaml'), path.join(instructions, 'config/approvals.yaml'));
  // approvals and playbooks come from the instructions folder, agency.yaml and clients/ from the data folder
  fs.rmSync(path.join(dataRoot, 'config/approvals.yaml'));
  const ok = validateRepo(instructions, { dataRoot });
  assert.deepEqual(ok.errors, []);
  // a loosened approvals file in the instructions folder is still caught
  fs.writeFileSync(path.join(instructions, 'config/approvals.yaml'), APPROVALS.replace(/^(\s*delete_anything:)\s*never/m, '$1 ask'));
  assert.ok(has(validateRepo(instructions, { dataRoot }), 'delete_anything must stay "never"'));
  // and a data folder with no agency.yaml is reported as not set up
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
  assert.ok(has(validateRepo(instructions, { dataRoot: empty }), 'this copy is not set up yet'));
});

test('the repo as shipped: approvals and every playbook citation are consistent', () => {
  const res = validateRepo(REPO);
  // The shipped template has no agency.yaml yet. That is the only error allowed.
  const unexpected = res.errors.filter((e) => !e.startsWith('config/agency.yaml: missing'));
  assert.deepEqual(unexpected, []);
});

test('webhook commands: three events per campaign, scoped to the campaign, secret never written to disk', () => {
  const { root } = makeRepo();
  const cmds = webhookCommands(root, 'https://relay.example.workers.dev/');
  assert.equal(cmds.length, 2 * 1 * 3);
  const acme = cmds.filter((c) => c.includes('INSTANTLY_API_KEY_ACME_CO'));
  assert.equal(acme.length, 3);
  assert.ok(acme.every((c) => c.includes('"campaign":"cmp-acme-co-0001"') && c.includes('$RELAY_SECRET')));
  assert.ok(!cmds.join('\n').includes('__RELAY_SECRET__'));
});

test('relay routes come from the client folders and warn about shared workspaces', () => {
  const { root } = makeRepo({ tweak: ({ yaml }) => yaml('clients/globex/workspace.yaml', (d) => (d.instantly.workspace_id = 'ws-acme-co-0000')) });
  const { routes, secrets, warnings } = buildRoutes(root);
  assert.equal(routes.campaigns['cmp-acme-co-0001'], 'ACME_CO');
  assert.equal(routes.campaigns['cmp-globex-0001'], 'GLOBEX');
  assert.deepEqual(routes.workspaces, {});
  assert.ok(warnings[0].includes('shared by'));
  assert.ok(secrets.includes('SLACK_WEBHOOK_GLOBEX') && secrets.includes('RELAY_SECRET'));
});
