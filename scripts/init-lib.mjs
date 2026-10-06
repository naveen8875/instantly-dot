import YAML from 'yaml';
import { PROFILE_SECTIONS, UNFILLED } from './validate-lib.mjs';

export const PLACEHOLDER = 'REPLACE_ME';
// Default sign-off: the name set on the mailbox that sends the reply (Instantly's first_name and last_name on the account).
export const SENDING_ACCOUNT = '{sending_account_name}';

export function slugify(s) {
  return (
    String(s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'client'
  );
}

const val = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : PLACEHOLDER);
const list = (arr) => (Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : []);

const STATUS = { 0: 'Draft', 1: 'Active' };
export const campaignLabel = (c) => `${c.name} (${STATUS[c.status] ?? `status ${c.status}`})`;

// Looks up the workspace, the campaigns and their sender mailboxes. Read-only calls. The key lives in memory only.
export async function lookupInstantly(key, fetchImpl = fetch) {
  const base = 'https://api.instantly.ai/api/v2';
  const get = async (path) => {
    const res = await fetchImpl(base + path, { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) {
      const hint = res.status === 401 ? ' (the key is wrong or revoked)' : res.status === 403 ? ' (the key lacks a read scope)' : res.status === 402 ? ' (the workspace has no paid plan)' : '';
      throw new Error(`Instantly returned ${res.status} for ${path.split('?')[0]}${hint}`);
    }
    return res.json();
  };
  const ws = await get('/workspaces/current');
  const campaigns = [];
  let after;
  for (let page = 0; page < 10; page++) {
    const r = await get(`/campaigns?limit=100${after ? `&starting_after=${encodeURIComponent(after)}` : ''}`);
    campaigns.push(...(r.items ?? []));
    after = r.next_starting_after;
    if (!after) break;
  }
  return {
    workspace: { id: ws.id, name: ws.name },
    campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status, mailboxes: list(c.email_list) })),
  };
}

const header = (what) => `# ${what}. Written by \`npm run init\`. Edit freely, then run \`npm run validate\`.\n`;

// answers -> { path: fileText }. Pure. `templates` carries the static files from clients/_template.
export function buildFiles(a, templates = {}) {
  const slack = a.interface === 'slack';
  const folder = a.client.folder || slugify(a.client.name);
  const clientName = val(a.client.name);

  const agency = {
    interface: a.interface,
    agency: {
      name: val(a.agency.name),
      timezone: val(a.agency.timezone),
      repo: val(a.agency.repo),
      owner: { name: val(a.owner.name), ...(slack ? { slack_user: val(a.owner.slackUser) } : {}) },
      approvers: [{ name: val(a.owner.name), ...(slack ? { slack_user: val(a.owner.slackUser) } : {}) }],
      ...(slack ? { channels: { digest: a.agencyChannels?.digest || '#agency-digest', alerts: a.agencyChannels?.alerts || '#agency-alerts' } } : {}),
    },
    canary: 'v1',
    mode: 'dry_run',
    quiet_hours: { from: '22:00', to: '07:00' },
    wake: { primary: 'schedule_only', backup_poll_minutes: 60 },
    ...(slack ? { slack: { non_owner_slack_approvals: false } } : {}),
    fallbacks: { allow_browser_fallback: true, allow_zapier_fallback: false },
    clients: [{ folder, active: true }],
  };

  const given = (a.client.campaigns ?? []).filter((c) => c && String(c.id ?? '').trim());
  const campaigns = given.length ? given.map((c) => ({ id: val(c.id), name: val(c.name || c.id) })) : [{ id: PLACEHOLDER, name: PLACEHOLDER }];
  const mailboxes = list(a.client.mailboxes).length ? list(a.client.mailboxes) : [PLACEHOLDER];
  const tz = val(a.calendar?.timezone || a.agency.timezone);
  const calendarLink = val(a.offer?.calendarLink);

  const workspace = {
    client: { name: clientName, ...(a.client.website ? { website: String(a.client.website).trim() } : {}) },
    mode: 'dry_run',
    instantly: {
      connection: val(a.client.connection || `${a.client.name} Instantly`),
      workspace_id: val(a.client.workspaceId),
      dot_sets_interest_status: true,
      campaigns,
      mailboxes,
    },
    ...(slack
      ? {
          slack: {
            events: a.slackChannels?.events || `#${folder}-events`,
            approvals: a.slackChannels?.approvals || `#${folder}-approvals`,
            alerts: a.slackChannels?.alerts || `#${folder}-alerts`,
            reports: a.slackChannels?.reports || `#${folder}-reports`,
          },
        }
      : {}),
    sender: { display_name: val(a.sender?.displayName || SENDING_ACCOUNT), signature: val(a.sender?.signature || a.sender?.displayName || SENDING_ACCOUNT) },
    offer: {
      primary_cta: val(a.offer?.cta || 'a 20-minute call'),
      calendar_link: calendarLink,
      proof_points: list(a.offer?.proofPoints),
    },
    calendar: {
      calendar_id: val(a.calendar?.id || 'primary'),
      timezone: tz,
      working_hours: { from: '09:00', to: '17:00', days: [1, 2, 3, 4, 5] },
      meeting_minutes: 20,
      buffer_minutes: 15,
      slots_to_offer: 3,
      booking_window_days: 7,
      video_link: val(a.offer?.videoLink || a.offer?.calendarLink),
    },
    limits: { max_replies_sent_per_run: 10, max_leads_per_batch: 200, max_new_leads_added_per_day: 100 },
    health: { min_health_score: 80, bounce_warn: 0.03, bounce_stop: 0.05, spam_complaint_stop: 0.003, daily_headroom_fraction: 0.5 },
    reporting: { positive_reply_target: 0.01 },
  };

  const icp = {
    segments: [
      {
        name: 'Primary segment',
        active: true,
        plain_language: val(a.icp?.plainLanguage),
        campaign_id: campaigns[0].id,
        search_filters: {},
        never_contact: { domains: [], emails: [] },
        batch_size: 100,
        refill_when_days_of_leads_below: 5,
        structure: 'A',
        personalization: 'role-pain',
      },
    ],
  };

  const section = (title, body) => `## ${title}\n\n${body && String(body).trim() ? String(body).trim() : UNFILLED}\n`;
  const known = {
    'Who we help (and who we do not)': a.icp?.plainLanguage,
    'What we offer and what we ask for': a.offer?.cta ? `We ask for: ${a.offer.cta}.` : '',
    Booking: a.offer?.calendarLink ? a.offer.calendarLink : '',
  };
  const profile =
    `# Business profile\n\nContext for writing in the owner's voice. The only results a message may claim are the ones in \`workspace.yaml\` under \`offer.proof_points\`. This file explains who we are and who we write to.\n\n` +
    `- **Website:** ${a.client.website ? String(a.client.website).trim() : UNFILLED}\n- **In one line:** ${UNFILLED}\n- **Pages read:** ${UNFILLED}\n- **Last updated:** ${UNFILLED}\n\n` +
    PROFILE_SECTIONS.map((s) => section(s, known[s])).join('\n');

  const stripComment = (t) => (t ?? '').replace(/<!--[\s\S]*?-->\s*\n?/g, '');
  const base = `clients/${folder}`;
  const files = {
    'config/agency.yaml': header('Agency config') + YAML.stringify(agency),
    [`${base}/workspace.yaml`]: header(`${clientName}: workspace`) + YAML.stringify(workspace),
    [`${base}/icp.yaml`]: header(`${clientName}: who to reach`) + YAML.stringify(icp),
    [`${base}/voice.md`]:
      `# Client voice\n\nHard rules live in voice/tone.md. This file adds how this client sounds.\n\n- **Formality:** casual\n- **Greeting:** e.g. "Hey {first name},"\n- **Sign-off:** e.g. "Cheers, ${a.sender?.displayName && a.sender.displayName !== SENDING_ACCOUNT ? a.sender.displayName : "the sending account's name"}"\n- **Sentence length:** short and punchy\n- **Phrases they use:**\n- **Phrases they never use:**\n- **How they offer a call:** e.g. "Easiest is a quick 20 minutes, here are three times:"\n`,
    [`${base}/examples.md`]: stripComment(templates.examples) || '# Examples\n',
    [`${base}/learnings.md`]: templates.learnings ?? '# Learnings\n',
    [`${base}/profile.md`]: profile,
    [`${base}/logs/README.md`]: templates.logsReadme ?? '# logs/\n',
  };

  const todo = [];
  for (const [path, text] of Object.entries(files)) {
    if (text.includes(PLACEHOLDER)) todo.push(path);
  }
  return { files, folder, todo };
}

export function renderBootstrap({ repo, folder, interface: iface }) {
  const repoName = repo && repo !== PLACEHOLDER ? repo : 'OWNER/REPO';
  const read = `You will run email outreach on Instantly for me. Your instructions live in my private GitHub repo ${repoName}.
Read START_HERE.md first, then every file it points to: triggers.md, config/agency.yaml, config/approvals.yaml, voice/tone.md,
every file in playbooks/ and templates/, and the files in clients/${folder}/.

Do not send, add, enrich, create, activate or post anything yet.

1. Summarise your job in exactly 10 bullets: what you do, which client you run, what needs my approval, what you must never do, how you learn, and what wakes you.`;
  if (iface === 'chatgpt') {
    return `${read}
2. Run setup/self-check.md for client ${folder}. I use the chatgpt interface: skip checks 9 and 10, and post the result here in this conversation.
3. Do not create any schedules. I will ask you in chat: "check the inbox", "morning routine", "propose leads", "digest".
4. List the Instantly tools you can see, by name.`;
  }
  return `${read}
2. Run setup/self-check.md at agency level. Expect NOT READY until the client is fully set up. List exactly what is missing.
3. Create these 7 schedules in the agency timezone from config/agency.yaml, each pointing at triggers.md:
   hourly check · 07:30 daily · 08:00 weekdays · 10:00 weekdays · 14:00 weekdays · Monday 08:30 · first working day 09:00.
4. List the Instantly tools you can see, by name.`;
}
