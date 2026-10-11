# Changelog

The Dot reads this when you say `Update yourself`. One line per change, newest first. Anything that changes the shape of your data (a new required field) is marked **DATA**.

## Unreleased

- **Grok Bot version** in `grok/`: 14 skills generated from the playbooks (one source of truth, so the Dot and the Bot do not drift), the Bot's name and lasting rules, a one-message bootstrap, install steps and a Cursor-format plugin. `npm run build:grok` regenerates it, and `npm test` fails if it is out of date or a skill mentions something a Bot does not have. Not yet run in a real Grok Bot.
- **Access rules for the Bot** (`grok/access.yaml`): an allowlist of about 40 of Instantly's 199 tools, in two levels (read-only, working). The operating rules, the key scope checklist and the plugin's `enabledTools` are generated from it, and tests fail if a delete, purchase, mailbox, webhook, billing or key tool is allowed, or if a rule in `config/approvals.yaml` stops matching. `setup/scoped-keys.md` now lists `workspaces:read` and `background_jobs:read`.
- **The Bot's full skill set** (19 skills, all generated): added `/instantly-access` (read-only, working and scale levels, key replacement, a check that a limit holds), `/instantly-go-live` (readiness checks, the owner's exact words, an instant way back), `/instantly-copy-help` (improve or write any email in the owner's voice, never sends), `/instantly-schedule` (opt-in routines that only read and draft), `/instantly-sending-infrastructure` (capacity, browsing domains, and, at scale access only, buying after a simulation and the exact words `place it`). Also: a first-run greeting for a new, returning or half-finished owner, a list grade with a clear go / fix-first / no-go, referral leads, a second client with its own connection, deliverability watch and inbox placement tests, a glanceable brief, batch approval of not-now and referral drafts, and a pointer to Instantly's AI Agents.
- New approval actions in `config/approvals.yaml`: `take_client_live`, `add_referred_lead` and `run_inbox_placement_test` (all `ask`, pinned in the validator). Buying stays `never` for the Dot; the Bot overrides it to `ask` behind the scale level.
- `instantly.access_level` is an optional setting in a client's `workspace.yaml` (`read`, `working` or `scale`).
- `interface: chat` for a Bot that approves in the conversation, and `agency.repo` is now optional.

## 0.1.0

- First release: reply triage, mailbox safety, slot offers, lead sourcing with SuperSearch, sequences, campaign launch, digests, radar, briefs, learning loop, reports.
- Guided setup: paste one message into a blank Dot. The Dot fetches this repo, checks its connections, asks one form and creates your files in `instantly-dot-data/`.
- Every client starts in `dry_run`: nothing is sent, and SuperSearch enrichment builds a list that is attached to no campaign.
- A validator (`npm run validate`) and tests guard the approval rules.
- Setup starts from your website: the Dot reads it, shows what it understood and who it would email, and you say "looks good". No questionnaire, no file names or IDs. A new `profile.md` per client holds the result.
- Replies are signed with the name set on the sending mailbox by default (`{sending_account_name}`). Set a fixed name in `workspace.yaml` to override.
