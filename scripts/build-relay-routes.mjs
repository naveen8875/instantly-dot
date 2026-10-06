#!/usr/bin/env node
// Builds the ROUTES value for the relay from the client folders, and lists the Slack webhook secrets you must create.
// Usage: npm run relay:routes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export function clientKey(folder) {
  return folder.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function buildRoutes(root) {
  const agency = YAML.parse(fs.readFileSync(path.join(root, 'config', 'agency.yaml'), 'utf8'));
  const routes = { campaigns: {}, workspaces: {} };
  const secrets = new Set(['SLACK_WEBHOOK_AGENCY', 'RELAY_SECRET']);
  const workspaceOwners = new Map();
  const warnings = [];

  for (const entry of agency.clients ?? []) {
    if (entry.active === false) continue;
    const ws = YAML.parse(fs.readFileSync(path.join(root, 'clients', entry.folder, 'workspace.yaml'), 'utf8'));
    const key = clientKey(entry.folder);
    secrets.add(`SLACK_WEBHOOK_${key}`);
    for (const c of ws.instantly.campaigns) routes.campaigns[c.id] = key;
    const wid = ws.instantly.workspace_id;
    if (!workspaceOwners.has(wid)) workspaceOwners.set(wid, new Set());
    workspaceOwners.get(wid).add(key);
  }
  for (const [wid, keys] of workspaceOwners) {
    if (keys.size === 1) routes.workspaces[wid] = [...keys][0];
    else warnings.push(`workspace ${wid} is shared by ${[...keys].join(', ')}: events without a campaign id (account_error) go to the agency channel`);
  }
  return { routes, secrets: [...secrets].sort(), warnings };
}

export const WEBHOOK_EVENTS = ['reply_received', 'lead_meeting_booked', 'account_error'];

// One webhook per campaign per event type, so the relay only ever sees the client's own campaigns.
// Prints curl commands. Each client's Instantly API key comes from INSTANTLY_API_KEY_<CLIENT> in your shell.
export function webhookCommands(root, relayUrl) {
  const agency = YAML.parse(fs.readFileSync(path.join(root, 'config', 'agency.yaml'), 'utf8'));
  const cmds = [];
  for (const entry of agency.clients ?? []) {
    if (entry.active === false) continue;
    const ws = YAML.parse(fs.readFileSync(path.join(root, 'clients', entry.folder, 'workspace.yaml'), 'utf8'));
    const key = clientKey(entry.folder);
    for (const c of ws.instantly.campaigns) {
      for (const event of WEBHOOK_EVENTS) {
        const body = { name: `instantly-dot ${entry.folder} ${event}`, target_hook_url: relayUrl, event_type: event, campaign: c.id, headers: { 'x-relay-secret': '__RELAY_SECRET__' } };
        cmds.push(
          `curl -sS -X POST https://api.instantly.ai/api/v2/webhooks \\\n  -H "Authorization: Bearer $INSTANTLY_API_KEY_${key}" -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body).replace('"__RELAY_SECRET__"', '"\'"$RELAY_SECRET"\'"')}'`,
        );
      }
    }
  }
  return cmds;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === '--webhooks') {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const url = process.argv[3];
  if (!url || !/^https:\/\//.test(url)) {
    console.error('usage: node scripts/build-relay-routes.mjs --webhooks https://your-relay.example.workers.dev/');
    process.exit(1);
  }
  console.log('# Run after exporting RELAY_SECRET and one INSTANTLY_API_KEY_<CLIENT> per client.\n');
  console.log(webhookCommands(root, url).join('\n\n'));
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { routes, secrets, warnings } = buildRoutes(root);
  warnings.forEach((w) => console.error(`warning: ${w}`));
  console.log('ROUTES=' + JSON.stringify(routes));
  console.log('\nSecrets to create (one Slack incoming webhook per client, pointed at that client\'s events channel):');
  secrets.forEach((s) => console.log(`  ${s}`));
}
