# Install (about 45 minutes, plus Phase 0)

> Just want to try it? Use **[QUICKSTART.md](../QUICKSTART.md)**: about 15 minutes, you only talk to the Dot, nothing is sent. This file is the full setup for a real agency: a private GitHub copy for history and review, scoped keys, Slack approvals, the relay, Phase 0 and going live.

## You need

- A ChatGPT plan with Dots. **Business Premium** works in every supported region and is the plan to plan around (full write access for custom MCP connectors is reported on Business and above). Pro works outside the EEA, UK and Switzerland, and reportedly limits custom MCP to read.
- Instantly with a paid plan (replies return 402 without one) and webhooks enabled.
- Slack, Google Calendar and GitHub accounts the Dot can use.
- Node 20 or newer, for the validator and the relay tests.
- Optional: Cloudflare account for the relay, n8n or Zapier as a connector fallback.

## Steps

1. **Make your private copy.** Create a private GitHub repo from this one. The Dot reads from it, so it must be yours.
2. **Clone it and install.**

   ```bash
   npm install
   npm test
   ```

3. **Create the agency config.**

   ```bash
   npm run init
   ```

   The wizard asks for the agency, the owner and your first client, writes `config/agency.yaml` and `clients/<client>/`, and prints the bootstrap prompt. Choose `slack` when it asks where you approve things for the full setup
   (you then create the agency's 2 channels and each client's 4 channels in Slack). By hand instead: `cp config/agency.example.yaml config/agency.yaml`, fill it, and delete the `REPLACE_ME` comment on the first line.
   Leave `mode: dry_run` and `wake.primary: schedule_only` until Phase 0 passes.
4. **Read `config/approvals.yaml`.** The defaults make you approve every message, every credit spend and every launch. The only things the Dot does without asking in Instantly are status and label updates, and stopping someone who asked to stop (no reply).
   If you loosen a pinned line, `npm run validate` fails the build. If you set a send action to `auto` it passes with a warning: do not.
5. **Commit and push.** `npm run validate` fails until you add a client. That is expected.
6. **Connect the Dot's plugins:** Instantly, GitHub, Slack, Google Calendar.
   - Instantly: use the ChatGPT directory plugin. If it is missing or does not work in a Dot, turn on developer mode (Settings → Apps → Advanced; on Business only an admin or owner can) and add `https://mcp.instantly.ai` with the workspace API key. One connection **per Instantly workspace**, named so the client's `workspace.yaml` can point at it.
   - Create **one least-privilege API key per client workspace** with only the scopes in `setup/scoped-keys.md`: no `delete`, no `all:*`, no billing, no members, no done-for-you orders, no `accounts:update`. Instantly then refuses destructive calls even if the Dot is tricked into making them. Do **not** give the Dot an agency admin key from a workspace group: it would reach every client.
   - Create the Dot's GitHub token as **fine-grained, this repo only** (`setup/dot-custom-rules.md`).
7. **Paste the Custom Rules** from `setup/dot-custom-rules.md` into the Dot, if your account lets you edit them. If it says "can't be edited right now", ask your workspace admin about Custom rules in Permissions and roles, and set the Instantly plugin to ask before write actions.
8. **Run Phase 0** (`setup/phase0-feasibility.md`). Do not skip it. Fill in `setup/tool-map.md` as you go.
9. **Bootstrap** (`setup/bootstrap-prompt.md`). Read the 10 bullets and correct any that are wrong.
10. **Add your first client** (`setup/add-client.md`), run the self-check, and keep that client in `dry_run` for 2 to 3 days.

## Going live (per client)

1. After 2 to 3 days in `dry_run`, read `learnings.md` and the edit rate in the Monday summary. Fix every draft you did not like.
2. In the client's `workspace.yaml` set `mode: live`.
3. In `config/agency.yaml` set `mode: live` and bump the canary (`v1` to `v2`).
4. Commit and push. Check that the next run's log header shows `v2`: that proves the Dot read the new files.
5. If agency mode and client mode differ, the Dot follows the stricter one. `mode: paused` in `agency.yaml` stops every client at once.
