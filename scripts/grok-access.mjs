import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

// grok/access.yaml says which Instantly tools the Bot may call. This file checks it and turns it into:
//   - the "Instantly tools you may use" table in the operating-rules skill
//   - the scope checklist the Bot shows when the owner makes a key
//   - grok/plugin/mcp*.json, whose `enabledTools` is the allowlist the Grok Bot app enforces on its own side
// Every tool that is not listed is blocked.
//
// Three access levels, each including the one before: read (looks and drafts), working (acts, asking first),
// scale (also buys pre-warmed mailboxes and domains, asking first). A few tools sit behind a feature switch in
// access.yaml (`optional`), off until the matching risk is proven safe.

export const ACCESS = 'grok/access.yaml';
export const MCP_FILES = {
  working: 'grok/plugin/mcp.json',
  read: 'grok/plugin/mcp.read-only.json',
  scale: 'grok/plugin/mcp.scale.json',
  oauth: 'grok/plugin/mcp.oauth.example.json',
};
const RANK = { read: 0, working: 1, scale: 2 };

// Tools that must never be allowed, whatever access.yaml says. The test suite carries its own, separate list as a second check.
// (accounts_pause and accounts_resume are not here: they are `optional`, behind a switch that is off until the app-side allowlist is proven.)
export const DANGEROUS =
  /delete|^dfy_orders_cancel$|^workspace_(billing|members|group_members|update|whitelabel)|^webhooks_|^accounts_(warmup|mark)|^manage_account_state$|^create_account$|^update_account$|^email_forward$|^email_update$|^update_lead$|^update_lead_list$|^leads_(merge|bulk)|^lead_finder_agent_(create|update|resume)$|^integrations_run$|^company_list_create$|^enrichment_(create|run|ai|update_settings)$/;

export function loadAccess(root) {
  return YAML.parse(fs.readFileSync(path.join(root, ACCESS), 'utf8'));
}

export function snapshotTools(root, access) {
  const text = fs.readFileSync(path.join(root, access.snapshot), 'utf8');
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

// The Dot's approvals, with the few levels the Bot changes on purpose (grok/skills.yaml `approvals_overrides`).
// The Dot keeps its own file untouched: buying stays `never` there.
export function approvalLevels(root) {
  const base = YAML.parse(fs.readFileSync(path.join(root, 'config/approvals.yaml'), 'utf8')).actions;
  const manifest = YAML.parse(fs.readFileSync(path.join(root, 'grok/skills.yaml'), 'utf8'));
  return { base, levels: { ...base, ...(manifest.approvals_overrides ?? {}) }, overrides: manifest.approvals_overrides ?? {} };
}

// 'read' is the reading tools; 'working' adds the tools that act; 'scale' adds buying. Optional tools join only when their switch is on.
export function toolsOf(access, tier) {
  const rank = RANK[tier];
  const optional = (access.optional ?? []).filter((t) => access.features?.[t.feature] === true && RANK[t.tier ?? 'working'] <= rank);
  const lists = [access.read.tools];
  if (rank >= 1) lists.push(access.working.tools);
  if (rank >= 2) lists.push(access.scale?.tools ?? []);
  return [...lists.flat(), ...optional];
}

export function checkAccess(root, access = loadAccess(root)) {
  const errors = [];
  const snapshot = new Set(snapshotTools(root, access));
  const { base, levels, overrides } = approvalLevels(root);
  const seen = new Map();

  const everyTool = [
    ...access.read.tools.map((t) => ['read', t]),
    ...access.working.tools.map((t) => ['working', t]),
    ...(access.scale?.tools ?? []).map((t) => ['scale', t]),
    ...(access.optional ?? []).map((t) => [`optional (${t.feature})`, t]),
  ];
  for (const [tierName, t] of everyTool) {
    const where = `access.yaml ${tierName}/${t.tool}`;
    if (!snapshot.has(t.tool)) errors.push(`${where}: not in ${access.snapshot}, so the Instantly connection does not expose it`);
    if (seen.has(t.tool)) errors.push(`${where}: listed twice (also in ${seen.get(t.tool)})`);
    seen.set(t.tool, tierName);
    if (typeof t.scope !== 'string' || !t.scope) errors.push(`${where}: needs a scope`);
    if (typeof t.for !== 'string' || t.for.length < 8) errors.push(`${where}: needs a plain-words "for"`);
    if (typeof t.ask !== 'boolean') errors.push(`${where}: "ask" must be true or false`);
    if (tierName === 'read' && t.ask) errors.push(`${where}: a reading tool cannot need a yes`);
    if (tierName === 'scale' && t.ask !== true) errors.push(`${where}: every tool that buys must ask for a yes every time`);
    if (DANGEROUS.test(t.tool)) errors.push(`${where}: this tool is on the never-allow list`);
    if (t.tool === 'dfy_orders_create' && tierName !== 'scale') errors.push(`${where}: placing an order is only ever allowed at the scale level`);
    if (tierName.startsWith('optional')) {
      if (access.features?.[t.feature] === undefined) errors.push(`${where}: its feature "${t.feature}" is not defined under features`);
      if (t.ask !== true) errors.push(`${where}: an optional tool must ask for a yes every time`);
    }
    for (const a of t.actions ?? []) {
      const level = levels[a];
      if (level === undefined) errors.push(`${where}: action "${a}" is not in config/approvals.yaml`);
      else if (level === 'never') errors.push(`${where}: action "${a}" is "never" in config/approvals.yaml`);
      else if (t.ask === true && level !== 'ask') errors.push(`${where}: asks for a yes, but action "${a}" is "${level}" in config/approvals.yaml`);
      else if (t.ask === false && level !== 'auto') errors.push(`${where}: runs without a yes, but action "${a}" is "${level}" in config/approvals.yaml`);
    }
  }

  // The Bot may relax a `never` to `ask` (buying). It may never make anything `auto`, and it may only name real actions.
  for (const [action, level] of Object.entries(overrides)) {
    if (base[action] === undefined) errors.push(`grok/skills.yaml approvals_overrides: "${action}" is not in config/approvals.yaml`);
    else if (level !== 'ask') errors.push(`grok/skills.yaml approvals_overrides: "${action}" may only be set to "ask", not "${level}"`);
    else if (!['never', 'ask'].includes(base[action])) errors.push(`grok/skills.yaml approvals_overrides: "${action}" is "${base[action]}" in config/approvals.yaml; only a never or ask action can be overridden`);
  }

  for (const [action, g] of Object.entries(access.blocked ?? {})) {
    const matched = new Set([...(g.tools ?? [])]);
    for (const name of g.tools ?? []) if (!snapshot.has(name)) errors.push(`access.yaml blocked/${action}: ${name} is not in ${access.snapshot}`);
    if (g.match) {
      const re = new RegExp(g.match);
      const hits = [...snapshot].filter((n) => re.test(n));
      if (!hits.length) errors.push(`access.yaml blocked/${action}: the pattern /${g.match}/ matches no tool`);
      hits.forEach((h) => matched.add(h));
    }
    for (const name of matched) if (seen.has(name)) errors.push(`access.yaml blocked/${action}: ${name} is blocked here but allowed in ${seen.get(name)}`);
  }

  const covered = new Set([...Object.keys(access.blocked ?? {}), ...Object.keys(access.rules_only ?? {})]);
  for (const [action, level] of Object.entries(levels)) {
    if (level === 'never' && !covered.has(action)) errors.push(`config/approvals.yaml: "${action}" is never, but access.yaml neither blocks its tools nor says why a tool cannot (blocked / rules_only)`);
  }
  for (const action of Object.keys(access.rules_only ?? {})) {
    if (levels[action] === undefined) errors.push(`access.yaml rules_only/${action}: not an action in config/approvals.yaml`);
  }
  return errors;
}

// The scopes to tick when making a key for a tier: [{ resource, scopes: [..] }], plus what to add if Instantly refuses a step.
export function keyScopes(access, tier) {
  if (tier === 'read') return { scopes: access.read.key_scopes, groups: [], ifRefused: [] };
  const all = [...new Set(toolsOf(access, tier).map((t) => t.scope).filter((s) => s !== 'none'))].sort();
  const byResource = new Map();
  for (const s of all) {
    const [resource] = s.split(':');
    byResource.set(resource, [...(byResource.get(resource) ?? []), s]);
  }
  return { scopes: all, groups: [...byResource].map(([resource, scopes]) => ({ resource, scopes })), ifRefused: access.working.if_refused_add ?? [] };
}

const yesText = (t) => (t.ask ? 'Yes, every time' : 'No (it tells you what it did)');

export function renderTools(access) {
  const row = (t, withYes) => `| \`${t.tool}\` | ${t.for} |${withYes ? ` ${yesText(t)} |` : ''}`;
  const changing = toolsOf(access, 'working').filter((t) => !access.read.tools.includes(t));
  const buying = toolsOf(access, 'scale').filter((t) => !toolsOf(access, 'working').includes(t));
  const out = [
    '**Looking (any access level):**',
    '',
    '| Tool | Use it to |',
    '|---|---|',
    ...access.read.tools.map((t) => row(t, false)),
    '',
    '**Changing (working access, and scale):**',
    '',
    '| Tool | Use it to | Your yes first? |',
    '|---|---|---|',
    ...changing.map((t) => row(t, true)),
  ];
  if (buying.length) {
    out.push('', '**Buying (scale access only):**', '', '| Tool | Use it to | Your yes first? |', '|---|---|---|', ...buying.map((t) => row(t, true)));
  }
  return out.join('\n');
}

export function renderKeyScopes(access) {
  const k = keyScopes(access, 'working');
  return [
    ...k.groups.map((g) => `- ${g.scopes.map((s) => `\`${s}\``).join(', ')}`),
    '',
    "If a scope in this list is not in Instantly's list, skip it and tell the owner which one, so it can be corrected.",
    ...(k.ifRefused.length ? ['', `If Instantly refuses a step, add: ${k.ifRefused.map((s) => `\`${s}\``).join(', ')}.`] : []),
  ].join('\n');
}

export function renderAccessLevels(access) {
  const r = keyScopes(access, 'read');
  const w = keyScopes(access, 'working');
  const extra = keyScopes(access, 'scale').scopes.filter((s) => !w.scopes.includes(s));
  const lines = [
    `- **${access.read.title}** (the default for a first try): ${access.read.summary} Key scope: ${r.scopes.map((s) => `\`${s}\``).join(', ')}.`,
    `- **${access.working.title}**: ${access.working.summary} Tick exactly these scopes, and nothing else:`,
    '',
    renderKeyScopes(access).split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'),
  ];
  if (access.scale) {
    lines.push('', `- **${access.scale.title}**: ${access.scale.summary} Tick the working scopes above, and also ${extra.map((s) => `\`${s}\``).join(', ')}. Offer this level only when the owner asks about buying mailboxes or domains.`);
  }
  return lines.join('\n');
}

// What the Bot says about pausing a mailbox: the owner does it, unless the switch is on.
export function renderMailboxPauseNote(access) {
  const on = (access.optional ?? []).some((t) => t.tool === 'accounts_pause' && access.features?.[t.feature] === true);
  return on
    ? 'You may pause or resume one mailbox, only after the owner says yes to that exact mailbox and you have shown the numbers behind it. Never turn warmup off or change any other account setting.'
    : 'Pausing or resuming a mailbox is the same: tell the owner which mailbox and why, and let them do it in Instantly.';
}

export function buildMcpFiles(access) {
  const s = access.server;
  const config = (tier, withKey) => ({
    mcpServers: {
      [s.name]: {
        url: s.url,
        ...(withKey ? { headers: { Authorization: `Bearer \${${s.key_variable}}` } } : {}),
        enabledTools: toolsOf(access, tier).map((t) => t.tool),
      },
    },
  });
  const out = (o) => JSON.stringify(o, null, 2) + '\n';
  return {
    [MCP_FILES.working]: out(config('working', true)),
    [MCP_FILES.read]: out(config('read', true)),
    [MCP_FILES.scale]: out(config('scale', true)),
    [MCP_FILES.oauth]: out(config('working', false)),
  };
}
