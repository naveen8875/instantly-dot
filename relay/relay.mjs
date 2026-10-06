// Instantly webhook → Slack relay.
//
// Instantly cannot wake a Dot directly. This relay receives Instantly webhooks and posts one short,
// sanitised line into the client's events channel, which the Dot watches with an event trigger.
//
// Deploy as a Cloudflare Worker (see wrangler.toml.example) or call handle() from any runtime with fetch.
//
// What it guarantees:
//   - only POSTs carrying the shared secret in the x-relay-secret header get through
//   - only the event types in FORWARD_EVENTS are forwarded
//   - reply text, subjects, snippets and campaign names are NEVER forwarded (untrusted, and not needed:
//     the Dot reads the thread from Instantly itself using email_id)
//   - every forwarded field is validated against a strict pattern, so a hostile payload cannot smuggle text into Slack
//   - Instantly's retries (3 within 30 seconds) are de-duplicated
//
// Env:
//   RELAY_SECRET           shared secret; also set it as a custom header on the Instantly webhook
//   ROUTES                 JSON: {"campaigns": {"<campaign uuid>": "ACME_CO"}, "workspaces": {"<workspace uuid>": "ACME_CO"}}
//   SLACK_WEBHOOK_<KEY>    Slack incoming-webhook URL for each client key in ROUTES
//   SLACK_WEBHOOK_AGENCY   where events that match no client go (and nothing else)
//   FORWARD_EVENTS         optional, comma separated; default reply_received,lead_meeting_booked,account_error
//   DEDUPE                 optional KV-like binding with get(key) and put(key, value, {expirationTtl})

const DEFAULT_EVENTS = ['reply_received', 'lead_meeting_booked', 'account_error'];
const ID = /^[0-9a-zA-Z-]{8,64}$/;
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[^\s@<>]{2,24}$/;

function safeId(v) {
  return typeof v === 'string' && ID.test(v) ? v : '-';
}
function safeEmail(v) {
  return typeof v === 'string' && EMAIL.test(v) && v.length <= 254 ? v : '-';
}

async function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0) return false;
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export function resolveRoute(payload, routes) {
  const byCampaign = routes?.campaigns?.[payload.campaign_id];
  if (byCampaign) return byCampaign;
  const byWorkspace = routes?.workspaces?.[payload.workspace];
  if (byWorkspace) return byWorkspace;
  return 'AGENCY';
}

export function buildMessage(payload) {
  return [
    `Instantly event: ${payload.event_type}`,
    `campaign ${safeId(payload.campaign_id)}`,
    safeEmail(payload.lead_email),
    `account ${safeEmail(payload.email_account)}`,
    `email ${safeId(payload.email_id)}`,
  ].join(' · ');
}

export async function handle(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'POST only' });

  if (!(await sameSecret(request.headers.get('x-relay-secret'), env.RELAY_SECRET))) {
    return json(401, { error: 'unauthorized' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'body is not JSON' });
  }
  if (!payload || typeof payload !== 'object' || typeof payload.event_type !== 'string') {
    return json(400, { error: 'missing event_type' });
  }

  const allowed = (env.FORWARD_EVENTS ? env.FORWARD_EVENTS.split(',') : DEFAULT_EVENTS).map((s) => s.trim());
  if (!allowed.includes(payload.event_type)) return json(200, { ignored: payload.event_type });

  let routes;
  try {
    routes = env.ROUTES ? JSON.parse(env.ROUTES) : {};
  } catch {
    return json(500, { error: 'ROUTES is not valid JSON' });
  }

  const key = resolveRoute(payload, routes);
  const hookUrl = env[`SLACK_WEBHOOK_${key}`];
  if (!hookUrl) return json(500, { error: `no SLACK_WEBHOOK_${key} configured` });

  const dedupeKey = [payload.event_type, payload.campaign_id, payload.lead_email, payload.email_id, payload.timestamp].join('|');
  if (env.DEDUPE && (await env.DEDUPE.get(dedupeKey))) return json(200, { deduped: true });

  let text = buildMessage(payload);
  if (key === 'AGENCY') text += ' · UNROUTED: no client owns this campaign or workspace';

  const res = await fetchImpl(hookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return json(502, { error: `slack returned ${res.status}` });

  if (env.DEDUPE) await env.DEDUPE.put(dedupeKey, '1', { expirationTtl: 600 });
  return json(200, { ok: true, routed: key });
}

export default {
  fetch(request, env) {
    return handle(request, env);
  },
};
