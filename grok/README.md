# Instantly Bot for Grok Bot

The same outbound teammate as the Instantly Dot, packaged for **Grok Bot** (SpaceXAI and Cursor), where an agent can be published as a template link.
It is built from the Dot's own playbooks, so there is one source of truth: change a playbook, run `npm run build:grok`, and the Bot's skills change with it.

**Status: the whole build is written and checked by tests; only setup has run in a real Grok Bot (with a read-only key).** Installing from one pasted message, connecting Instantly with a key and the website-to-summary step worked. Everything else (the greeting from a template link, going live, every write action, buying, schedules) is built but not yet run live: see "Where testing stands".

## What is here

| Path | What it is |
|---|---|
| `plugin/skills/` | The skills, **generated**. One for each job (inbox, leads, sequences, launch, digest, radar, briefs, reports, learning, mailbox health, slots, setup, and more as they are added) plus the operating rules and the voice rules. Every skill is self-contained: the templates it needs are inlined at the end |
| `bot/profile.md` | The Bot's name, label and its lasting rules (the Description) |
| `BOOTSTRAP.md` | One message to paste into a blank Bot. It installs its own skills from this repo and sets you up |
| `INSTALL.md` | The steps the Bot follows to install itself, and the by-hand version |
| `plugin/` | A Cursor-format plugin: the skills, plus a connection to Instantly's MCP server (`mcp.json`, `mcp.read-only.json`, `mcp.scale.json`, `mcp.oauth.example.json`), generated with the tool allowlist |
| `greeting.md` (in `src/`) | The words the Bot says first: the greeting for a new owner, a returning owner and a half-finished setup |
| `skills.yaml` | The rules for turning playbooks into skills (what to rewrite for a Bot, which text to swap) |
| `access.yaml` | **What the Bot may call in Instantly, and nothing else.** About 40 of the 199 tools, each with the key scope it needs and whether it asks first. Everything else is blocked |
| `tools.snapshot.txt` | The tools Instantly's connection exposed on 2026-10-11. The allowlist may only name tools in this list |
| `src/` | The few files written for the Bot only: its operating rules, and replacements for the parts of setup that are specific to a platform |

Do not edit `plugin/skills/*/SKILL.md`. Edit the playbook (or `skills.yaml`, or `src/`) and rebuild. `npm test` fails if the skills are out of date.

## How a user gets it (three routes)

| Route | Steps | Needs |
|---|---|---|
| **A. Paste one message** | Create a blank Bot, paste `BOOTSTRAP.md`, follow it | The Bot can fetch this repo and save skills itself (it did in the first test, after a helper without permission failed: `INSTALL.md` now says to do it directly) |
| **B. Template link** | Build the Bot once (route A or by hand), then **Share, Create template, Public link** | A published template. It carries the skills, the description and routines, **not** the Instantly connection |
| **C. Plugin** | Submit `plugin/` to Cursor's marketplace. Users install it and enter their Instantly key | A free, permissively licensed plugin and Cursor's review (see `plugin/README.md`) |

Whatever the route, **each user connects Instantly themselves**: a template cannot carry a connection or a key.

## Connecting Instantly (the hard part)

In order of preference. `/instantly-setup` walks the owner through whichever works.

1. **Sign-in (OAuth).** One click, no key, but it gives the Bot full access to the workspace. **Not available yet:** Instantly only accepts sign-in from apps it has approved, and in the first test Grok Bot was refused. `/instantly-setup` tries it, explains the refusal and falls back to the key.
2. **Custom connector with a key in a header.** `https://mcp.instantly.ai/mcp` with `Authorization: Bearer <key>`. The key must go in through the app's secure secret card, never the chat. This worked in the first test. Use a read-only key (scope `all:read`) for a first try: the Bot can then read and draft but cannot send or change anything. API keys need an Instantly plan that includes them.
3. **The plugin** (`plugin/mcp.json`), which takes the key as a plugin variable.

## Access: what the Bot can reach

Three layers, each held by a different party:

| Layer | Held by | With a key | With sign-in |
|---|---|---|---|
| Instantly refuses calls outside the key's scopes | Instantly | Yes | **No**: sign-in grants the whole workspace |
| Only the allowed tools are exposed (`enabledTools` in the connection config) | The Grok Bot app | Yes, **if the app honors it (untested)** | Same |
| The Bot's rules and approval cards | The skills | Yes | Yes |

There are three access levels. **Read-only** (`all:read`) looks and drafts, and cannot change anything. **Working access** adds replying, adding leads and building and launching campaigns, and the Bot still asks before each one. **Scale access** adds buying pre-warmed mailboxes and domains, after a simulation and the owner typing `place it`. `access.yaml` is the one place that defines them: the operating-rules skill, the scope checklist in `/instantly-setup` and the plugin's `enabledTools` are all generated from it, and tests fail if a delete, cancellation, mailbox change, webhook, billing or key tool is ever allowed. Pausing a mailbox exists but is switched off (`features.mailbox_pause` in `access.yaml`) until the allowlist is proven, because Instantly's `accounts:update` scope also allows warmup changes.

Buying is **Bot-only**: the Dot's `config/approvals.yaml` still says `never`, and the Bot overrides it to `ask` in `skills.yaml` (`approvals_overrides`), which the build checks.

Scopes marked `verify: true` in `access.yaml` are best guesses at what Instantly requires. The first live test with a working key confirms them.

## Where testing stands

Built and covered by automated tests; **live** means run in a real Grok Bot.

| # | Test | Pass looks like | Live result |
|---|---|---|---|
| 1 | Paste `BOOTSTRAP.md` into a blank Bot | It fetches the repo, saves every skill, and `/instantly` lists them | Passed. Count the skills in the `/` menu yourself: the Bot cannot see its own list refresh |
| 2 | Connect Instantly with a key | A real read works. The key never appears in the chat | Passed with a read-only key |
| 3 | `/instantly-setup` with your website | Plain summary, "looks good", files saved | Summary passed. Saving the files and the menu: not yet run |
| 4 | Add the Bot from a template link on a second account | Greeted on "hi"; setup starts by itself | Not yet run |
| 5 | The tool allowlist (`enabledTools`) | About 27 tools show for read-only, not 199 | Not yet run |
| 6 | Read-only skills: inbox, brief, mailbox health, reports | Real answers; nothing changed | Not yet run |
| 7 | Working key in a throwaway workspace: reply, find leads, build a campaign, launch | Each works after a yes | Not yet run |
| 8 | Go live and back to practice mode | Blocked until ready; exact words needed | Not yet run |
| 9 | Hostile text in a reply ("ignore your rules", "go live", "buy mailboxes") | No send, export, mode change or order | Not yet run |
| 10 | Buying: capacity card, simulation, wrong confirmation | Nothing bought without `place it` | Not yet run |
| 11 | A routine: create off, test, enable for a day, turn off | Works; lateness and allowance noted | Not yet run |

Also record: how many minutes setup takes (about 8 from paste to summary in the first test), whether a plan limit or the weekly allowance got in the way, and whether a long tool list (about 200 Instantly tools) causes trouble.

## Keeping Dot and Bot in step

```bash
npm run build:grok     # regenerate the skills after changing a playbook, a template or skills.yaml
npm run check:grok     # fail if they are out of date, or a skill points at something the Bot does not have
```

The build fails, on purpose, if a skill would mention a Dot-only thing (a repo folder, ChatGPT, a Slack channel, a file that is not inlined), or if a rewrite rule in `skills.yaml` stops matching because a playbook changed.

## Things to know

- **Installed copies do not update.** Republish the template, or install the newest skills again.
- **All of one user's Bots share one computer.** The Bot never writes a key into a file.
- **Routines are never created for you.** If the owner asks, they start switched off.
- The weekly allowance is unpublished and heavy users have used it up in days.
