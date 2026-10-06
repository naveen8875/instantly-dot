import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

// Actions that must stay `never`. Loosening one fails the build.
export const CORE_NEVER = [
  'edit_live_campaign_sequence',
  'delete_anything',
  'connect_or_remove_mailbox',
  'change_warmup_settings',
  'change_passwords_billing_or_keys',
  'buy_domains_or_mailboxes',
  'share_data_across_clients',
  'send_via_other_mail_plugin',
  'forward_email',
  'update_lead_or_account_fields',
  'reply_to_sensitive',
  'reply_to_no_reply_categories',
  'edit_repo_config',
];

// Actions that spend credits or change what sends. They may be ask or never, never auto.
export const HARD_ASK = [
  'activate_campaign',
  'enrich_and_verify_leads',
  'add_leads_to_campaign',
  'resume_campaign',
  'pause_or_resume_mailbox',
  'update_campaign_settings',
  'write_setup_config',
];

const LEVELS = ['auto', 'ask', 'never'];
const MODES = ['dry_run', 'live', 'paused'];
const WAKE = ['schedule_only', 'slack_event'];
const INTERFACES = ['chatgpt', 'slack'];
const EXAMPLE_SECTIONS = [
  'interested',
  'how it works',
  'pricing',
  'we already use a tool',
  'no budget',
  'send me info',
  'not now',
  'referral',
];
const CLIENT_FILES = ['workspace.yaml', 'icp.yaml', 'voice.md', 'examples.md', 'learnings.md', 'profile.md'];
export const PROFILE_SECTIONS = [
  'What we do',
  'Who we help (and who we do not)',
  'Who we reach out to first',
  'What we offer and what we ask for',
  'Proof we may cite',
  'How we sound',
  'Booking',
];
export const UNFILLED = '_Not filled in yet._';
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const read = (p) => fs.readFileSync(p, 'utf8');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const posInt = (v) => Number.isInteger(v) && v > 0;

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

function validTimezone(tz) {
  if (!nonEmpty(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function slackChannel(v) {
  return nonEmpty(v) && v.startsWith('#') && v.length > 1 && !/\s/.test(v);
}

// root: the instructions (config/approvals.yaml, playbooks/, templates/, START_HERE.md).
// opts.dataRoot: where config/agency.yaml and clients/ live. Defaults to root (the GitHub setup, where they are one folder).
export function validateRepo(root, opts = {}) {
  const dataRoot = opts.dataRoot ? path.resolve(opts.dataRoot) : root;
  const errors = [];
  const warnings = [];
  const rel = (p) => path.relative(p.startsWith(dataRoot + path.sep) ? dataRoot : root, p) || '.';
  const err = (file, msg) => errors.push(`${file}: ${msg}`);
  const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

  const load = (file) => {
    try {
      return YAML.parse(read(file)) ?? {};
    } catch (e) {
      err(rel(file), `invalid YAML (${e.message.split('\n')[0]})`);
      return null;
    }
  };

  // ---------- approvals ----------
  const actions = validateApprovals();

  function validateApprovals() {
    const file = path.join(root, 'config', 'approvals.yaml');
    if (!fs.existsSync(file)) {
      err('config/approvals.yaml', 'missing');
      return {};
    }
    const doc = load(file);
    if (!doc || !isObj(doc.actions)) {
      err('config/approvals.yaml', 'needs an `actions` map');
      return {};
    }
    for (const [name, level] of Object.entries(doc.actions)) {
      if (!LEVELS.includes(level)) err('config/approvals.yaml', `${name}: "${level}" is not auto, ask or never`);
    }
    for (const name of CORE_NEVER) {
      if (doc.actions[name] !== 'never') err('config/approvals.yaml', `${name} must stay "never" (found "${doc.actions[name] ?? 'missing'}")`);
    }
    for (const name of HARD_ASK) {
      if (doc.actions[name] === 'auto') err('config/approvals.yaml', `${name} must not be "auto": it spends credits or changes what sends`);
    }
    for (const [name, level] of Object.entries(doc.actions)) {
      if ((name.startsWith('send_') || name === 'book_meeting') && level === 'auto') {
        warn('config/approvals.yaml', `${name} is "auto": messages will go out without a human approving them`);
      }
    }
    return doc.actions;
  }

  // ---------- playbooks cite real actions ----------
  const cited = [
    ...walk(path.join(root, 'playbooks'), (f) => f.endsWith('.md')),
    ...walk(path.join(root, 'templates'), (f) => f.endsWith('.md')),
    path.join(root, 'START_HERE.md'),
    path.join(root, 'triggers.md'),
  ].filter((f) => fs.existsSync(f));
  for (const file of cited) {
    const text = read(file);
    for (const m of text.matchAll(/approval:\s*([a-z_]+(?:\s*,\s*[a-z_]+)*)/g)) {
      for (const name of m[1].split(',').map((s) => s.trim())) {
        if (!(name in actions)) err(rel(file), `cites unknown approval action "${name}"`);
      }
    }
  }

  // ---------- agency ----------
  const agencyFile = path.join(dataRoot, 'config', 'agency.yaml');
  let agency = null;
  if (!fs.existsSync(agencyFile)) {
    err('config/agency.yaml', 'missing: this copy is not set up yet. Tell your Dot "set me up" (see QUICKSTART.md), or run `npm run init`');
  } else {
    agency = validateAgency();
  }

  function validateAgency() {
    const f = 'config/agency.yaml';
    if (read(agencyFile).includes('REPLACE_ME')) err(f, 'still contains REPLACE_ME (check the comment at the top too)');
    const doc = load(agencyFile);
    if (!doc) return null;
    const a = doc.agency ?? {};
    if (!nonEmpty(a.name)) err(f, 'agency.name is required');
    if (!validTimezone(a.timezone)) err(f, `agency.timezone "${a.timezone}" is not a valid IANA timezone`);
    if (!nonEmpty(a.repo) || !/^[^/\s]+\/[^/\s]+$/.test(a.repo)) err(f, 'agency.repo must look like owner/name');
    if (!INTERFACES.includes(doc.interface)) err(f, `interface must be one of ${INTERFACES.join(', ')} (chatgpt: approvals in the Dot's ChatGPT chat, no Slack; slack: approvals in Slack channels)`);
    const slackMode = doc.interface === 'slack';
    if (!nonEmpty(a.owner?.name)) err(f, 'agency.owner.name is required');
    if (slackMode && !nonEmpty(a.owner?.slack_user)) err(f, 'agency.owner.slack_user is required when interface is slack');
    if (!Array.isArray(a.approvers) || a.approvers.length === 0) err(f, 'agency.approvers needs at least one person');
    else if (a.approvers.some((p) => !nonEmpty(p?.name) || (slackMode && !nonEmpty(p?.slack_user)))) err(f, slackMode ? 'every approver needs name and slack_user' : 'every approver needs a name');
    const ch = a.channels;
    if (slackMode || ch !== undefined) {
      if (!slackChannel(ch?.digest) || !slackChannel(ch?.alerts)) err(f, 'agency.channels.digest and .alerts must be Slack channel names starting with #');
      else if (ch.digest === ch.alerts) err(f, 'agency digest and alerts channels must differ');
    }
    if (!nonEmpty(doc.canary) || !/^v\d+(\.\d+)*$/.test(doc.canary)) err(f, 'canary must look like v1 or v2.1');
    if (!MODES.includes(doc.mode)) err(f, `mode must be one of ${MODES.join(', ')}`);
    if (!HHMM.test(doc.quiet_hours?.from ?? '') || !HHMM.test(doc.quiet_hours?.to ?? '')) err(f, 'quiet_hours.from and .to must be HH:MM');
    if (!WAKE.includes(doc.wake?.primary)) err(f, `wake.primary must be one of ${WAKE.join(', ')}`);
    else if (doc.interface === 'chatgpt' && doc.wake.primary === 'slack_event') err(f, 'wake.primary slack_event needs interface slack: the event wake is a Slack channel trigger');
    if (!Array.isArray(doc.clients) || doc.clients.length === 0) {
      err(f, 'clients is empty: add your first client (setup/add-client.md)');
    } else {
      const seen = new Set();
      for (const c of doc.clients) {
        if (!nonEmpty(c?.folder)) { err(f, 'every client needs a folder'); continue; }
        if (c.folder === '_template') err(f, 'a client folder cannot be _template');
        if (seen.has(c.folder)) err(f, `client folder "${c.folder}" is listed twice`);
        seen.add(c.folder);
        if (typeof c.active !== 'boolean') err(f, `client "${c.folder}" needs active: true or false`);
        if (!fs.existsSync(path.join(dataRoot, 'clients', c.folder))) err(f, `clients/${c.folder} does not exist`);
      }
    }
    return doc;
  }

  // ---------- clients ----------
  const clients = [];
  if (agency && Array.isArray(agency.clients)) {
    for (const entry of agency.clients) {
      if (!nonEmpty(entry?.folder) || entry.folder === '_template') continue;
      const dir = path.join(dataRoot, 'clients', entry.folder);
      if (!fs.existsSync(dir)) continue;
      const c = validateClient(entry, dir);
      if (c) clients.push(c);
    }
    crossClientChecks();
  }

  function validateClient(entry, dir) {
    const base = `clients/${entry.folder}`;
    for (const f of CLIENT_FILES) {
      if (!fs.existsSync(path.join(dir, f))) err(`${base}/${f}`, 'missing');
    }
    for (const file of walk(dir, () => true)) {
      const name = path.basename(file);
      if (/\.example\./.test(name)) err(rel(file), 'delete the example file after you copy it');
      if (read(file).includes('REPLACE_ME')) err(rel(file), 'still contains REPLACE_ME (check the comment at the top too)');
    }
    const wsFile = path.join(dir, 'workspace.yaml');
    const icpFile = path.join(dir, 'icp.yaml');
    const ws = fs.existsSync(wsFile) ? load(wsFile) : null;
    const icp = fs.existsSync(icpFile) ? load(icpFile) : null;
    if (!ws) return null;
    const f = `${base}/workspace.yaml`;

    if (!nonEmpty(ws.client?.name)) err(f, 'client.name is required');
    if (ws.client?.website !== undefined && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(String(ws.client.website))) err(f, 'client.website must be a web address like https://example.com');
    if (!MODES.includes(ws.mode)) err(f, `mode must be one of ${MODES.join(', ')}`);
    const ins = ws.instantly ?? {};
    if (!nonEmpty(ins.connection)) err(f, 'instantly.connection is required');
    if (!nonEmpty(ins.workspace_id)) err(f, 'instantly.workspace_id is required');
    if (typeof ins.dot_sets_interest_status !== 'boolean') err(f, 'instantly.dot_sets_interest_status must be true or false');
    const campaigns = Array.isArray(ins.campaigns) ? ins.campaigns : [];
    if (campaigns.length === 0) err(f, 'instantly.campaigns needs at least one campaign');
    for (const c of campaigns) if (!nonEmpty(c?.id) || !nonEmpty(c?.name)) err(f, 'every campaign needs id and name');
    const mailboxes = Array.isArray(ins.mailboxes) ? ins.mailboxes : [];
    if (mailboxes.length === 0) err(f, 'instantly.mailboxes needs at least one sender address');
    for (const m of mailboxes) if (!EMAIL.test(String(m))) err(f, `mailbox "${m}" is not an email address`);

    const channels = ws.slack ?? {};
    const chanNames = ['events', 'approvals', 'alerts', 'reports'];
    const needSlack = agency?.interface === 'slack';
    for (const k of chanNames) {
      if ((needSlack || channels[k] !== undefined) && !slackChannel(channels[k])) err(f, `slack.${k} must be a channel name starting with #`);
    }
    const chanValues = chanNames.map((k) => channels[k]).filter(Boolean);
    if (new Set(chanValues).size !== chanValues.length) err(f, 'the four slack channels must all be different');
    for (const v of chanValues) {
      if (agency?.agency?.channels && Object.values(agency.agency.channels).includes(v)) err(f, `slack channel ${v} is also an agency channel`);
    }

    if (!nonEmpty(ws.sender?.display_name) || !nonEmpty(ws.sender?.signature)) err(f, 'sender.display_name and sender.signature are required');
    for (const k of ['display_name', 'signature']) {
      const bad = (typeof ws.sender?.[k] === 'string' ? ws.sender[k].match(/\{[^}]*\}/g) ?? [] : []).filter((x) => x !== '{sending_account_name}');
      if (bad.length) err(f, `sender.${k} has an unknown placeholder ${bad[0]}: the only one allowed is {sending_account_name}`);
    }
    if (!nonEmpty(ws.offer?.primary_cta)) err(f, 'offer.primary_cta is required');
    if (!/^https:\/\//.test(ws.offer?.calendar_link ?? '')) err(f, 'offer.calendar_link must be an https URL');
    const proof = ws.offer?.proof_points;
    if (!Array.isArray(proof) || proof.some((p) => !nonEmpty(p))) err(f, 'offer.proof_points must be a list of real claims');
    else if (proof.length === 0) {
      if (ws.mode === 'live') err(f, 'offer.proof_points needs at least one real claim before going live: the Dot can use no result that is not listed');
      else warn(f, 'offer.proof_points is empty: drafts will cite no results until you add some');
    }

    const cal = ws.calendar ?? {};
    if (!nonEmpty(cal.calendar_id)) err(f, 'calendar.calendar_id is required');
    if (!validTimezone(cal.timezone)) err(f, `calendar.timezone "${cal.timezone}" is not a valid IANA timezone`);
    if (!HHMM.test(cal.working_hours?.from ?? '') || !HHMM.test(cal.working_hours?.to ?? '')) err(f, 'calendar.working_hours.from and .to must be HH:MM');
    if (!Array.isArray(cal.working_hours?.days) || cal.working_hours.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) err(f, 'calendar.working_hours.days must be numbers 0 to 6');
    for (const k of ['meeting_minutes', 'slots_to_offer', 'booking_window_days']) if (!posInt(cal[k])) err(f, `calendar.${k} must be a positive integer`);
    if (!Number.isInteger(cal.buffer_minutes) || cal.buffer_minutes < 0) err(f, 'calendar.buffer_minutes must be 0 or more');
    if (!/^https:\/\//.test(cal.video_link ?? '')) err(f, 'calendar.video_link must be an https URL');

    for (const k of ['max_replies_sent_per_run', 'max_leads_per_batch', 'max_new_leads_added_per_day']) {
      if (!posInt(ws.limits?.[k])) err(f, `limits.${k} must be a positive integer`);
    }
    for (const k of ['bounce_warn', 'bounce_stop', 'spam_complaint_stop', 'daily_headroom_fraction']) {
      const v = ws.health?.[k];
      if (typeof v !== 'number' || v <= 0 || v > 1) err(f, `health.${k} must be a number above 0 and at most 1`);
    }
    if (typeof ws.health?.min_health_score !== 'number' || ws.health.min_health_score < 0 || ws.health.min_health_score > 100) err(f, 'health.min_health_score must be 0 to 100');
    if (ws.health?.bounce_warn >= ws.health?.bounce_stop) err(f, 'health.bounce_warn must be lower than health.bounce_stop');
    if (typeof ws.reporting?.positive_reply_target !== 'number' || ws.reporting.positive_reply_target <= 0) err(f, 'reporting.positive_reply_target must be a positive number');

    if (agency && ['live', 'dry_run', 'paused'].includes(ws.mode) && agency.mode !== ws.mode) {
      warn(f, `client mode is ${ws.mode} and agency mode is ${agency.mode}: the stricter one wins`);
    }

    // icp
    if (icp) {
      const fi = `${base}/icp.yaml`;
      const segs = Array.isArray(icp.segments) ? icp.segments : [];
      if (segs.length === 0) err(fi, 'segments needs at least one segment');
      const campaignIds = new Set(campaigns.map((c) => c?.id));
      for (const s of segs) {
        if (!nonEmpty(s?.name)) { err(fi, 'every segment needs a name'); continue; }
        if (s.active === false) continue;
        if (!campaignIds.has(s.campaign_id)) err(fi, `segment "${s.name}": campaign_id is not one of the campaigns in workspace.yaml`);
        const hasFilters = isObj(s.search_filters) && Object.keys(s.search_filters).length > 0;
        if (!hasFilters && !nonEmpty(s.plain_language)) err(fi, `segment "${s.name}": needs search_filters, or a plain_language description the Dot can turn into filters`);
        else if (!hasFilters) warn(fi, `segment "${s.name}": no search_filters yet, the Dot will build them from plain_language and show them on the batch card`);
        if (!posInt(s.batch_size) || (posInt(ws.limits?.max_leads_per_batch) && s.batch_size > ws.limits.max_leads_per_batch)) err(fi, `segment "${s.name}": batch_size must be a positive integer within limits.max_leads_per_batch`);
        if (!['A', 'B', 'C'].includes(s.structure)) err(fi, `segment "${s.name}": structure must be A, B or C`);
        if (!['signal', 'role-pain', 'company-context'].includes(s.personalization)) err(fi, `segment "${s.name}": personalization must be signal, role-pain or company-context`);
      }
    }

    // profile.md: written from the owner's website. Unfilled sections are fine in practice mode and a blocker when live.
    const prFile = path.join(dir, 'profile.md');
    if (fs.existsSync(prFile)) {
      const fp = `${base}/profile.md`;
      const parts = read(prFile).split(/^## +/m).slice(1);
      const found = {};
      for (const part of parts) {
        const nl = part.indexOf('\n');
        found[(nl === -1 ? part : part.slice(0, nl)).trim()] = nl === -1 ? '' : part.slice(nl + 1).trim();
      }
      const unfilled = [];
      for (const s of PROFILE_SECTIONS) {
        if (!(s in found)) err(fp, `missing section "## ${s}"`);
        else if (found[s] === '' || found[s] === UNFILLED) unfilled.push(s);
      }
      if (unfilled.length) {
        const which = unfilled.length === PROFILE_SECTIONS.length ? 'all 7 sections are' : `${unfilled.length} section(s) are`;
        if (ws.mode === 'live') err(fp, `${which} not filled in and this client is live: ${unfilled.join(', ')}`);
        else warn(fp, `${which} not filled in (${unfilled.join(', ')}): ask the Dot to read your website and fill them`);
      }
    }

    // examples
    const exFile = path.join(dir, 'examples.md');
    if (fs.existsSync(exFile)) {
      const text = read(exFile).replace(/<!--[\s\S]*?-->/g, '');
      const sections = {};
      const parts = text.split(/^## +/m).slice(1);
      for (const part of parts) {
        const nl = part.indexOf('\n');
        const title = (nl === -1 ? part : part.slice(0, nl)).trim().toLowerCase();
        sections[title] = nl === -1 ? '' : part.slice(nl + 1).trim();
      }
      const fe = `${base}/examples.md`;
      const empty = [];
      for (const s of EXAMPLE_SECTIONS) {
        if (!(s in sections)) err(fe, `missing section "## ${s}"`);
        else if (!sections[s]) empty.push(s);
      }
      if (empty.length) {
        const which = empty.length === EXAMPLE_SECTIONS.length ? 'all 8 sections are' : `${empty.length} section(s) are`;
        if (ws.mode === 'live') err(fe, `${which} empty and this client is live: ${empty.join(', ')}`);
        else warn(fe, `${which} empty (${empty.join(', ')}): paste 1 to 3 real replies under each heading before going live`);
      }
    }

    return { folder: entry.folder, ws, channels: chanValues, campaigns: campaigns.map((c) => c?.id).filter(Boolean), mailboxes: mailboxes.map((m) => String(m).toLowerCase()) };
  }

  function crossClientChecks() {
    const owners = { channel: new Map(), campaign: new Map(), mailbox: new Map(), workspace: new Map() };
    const claim = (kind, key, folder) => {
      const prev = owners[kind].get(key);
      if (prev && prev !== folder) {
        if (kind === 'workspace') warn('config', `clients "${prev}" and "${folder}" share Instantly workspace ${key}: their campaigns and mailboxes must stay disjoint`);
        else err('config', `${kind} ${key} is used by both "${prev}" and "${folder}"`);
      } else owners[kind].set(key, folder);
    };
    for (const c of clients) {
      c.channels.forEach((k) => claim('channel', k, c.folder));
      c.campaigns.forEach((k) => claim('campaign', k, c.folder));
      c.mailboxes.forEach((k) => claim('mailbox', k, c.folder));
      if (nonEmpty(c.ws.instantly?.workspace_id)) claim('workspace', c.ws.instantly.workspace_id, c.folder);
    }
  }

  return { errors, warnings };
}
