# The relay: how Instantly wakes the Dot

Instantly sends an HTTP POST when a lead replies. A Dot cannot receive an HTTP POST. A Dot **can** be woken by a new message in a Slack channel it is in.
The relay (`relay/relay.mjs`, about 100 lines) sits between them, so a reply becomes one short line in the client's events channel.

```
lead replies → Instantly webhook → relay → Slack events channel → Dot event trigger → playbook 02
```

Why a relay and not Slack Workflow Builder: it drops event types you do not want, never forwards reply text, de-duplicates Instantly's retries,
validates every field it does forward, and routes by campaign. Whether a message posted by a bot fires the Dot's trigger is **Phase 0 test 3**.
Until it passes, run on schedules.

## What it forwards

`reply_received`, `lead_meeting_booked`, `account_error`. Optionally `supersearch_enrichment_completed` (set `FORWARD_EVENTS`).
Everything else gets a 200 and is dropped. Message format:

```
Instantly event: reply_received · campaign <uuid> · <lead email> · account <mailbox> · email <email_id>
```

The Dot reads the thread from Instantly using `email_id`. No reply text, subject, snippet or campaign name ever leaves the relay.

## Deploy (Cloudflare Worker)

1. `cp relay/wrangler.toml.example relay/wrangler.toml` and set `name`.
2. Create a KV namespace for `DEDUPE` and put its id in `wrangler.toml`. (Optional but recommended: Instantly retries 3 times in about 30 seconds.)
3. In Slack, for each client, create an **incoming webhook** that posts to that client's events channel. Add the Dot (`@ChatGPT`) to that channel. Keep your team out of it.
4. Build the config and list the secrets:

   ```bash
   npm run relay:routes
   ```

   It prints `ROUTES=...` and one `SLACK_WEBHOOK_<CLIENT>` name per client.
5. Set them. `RELAY_SECRET` is a long random string you invent.

   ```bash
   cd relay
   npx wrangler secret put RELAY_SECRET
   npx wrangler secret put SLACK_WEBHOOK_AGENCY
   npx wrangler secret put SLACK_WEBHOOK_ACME_CO      # one per client
   npx wrangler secret put ROUTES                      # paste the ROUTES=... JSON value
   npx wrangler deploy
   ```

Any host that runs `fetch` handlers works. Call `handle(request, env)` from `relay.mjs`.

## Create the Instantly webhooks

One webhook per campaign per event type, so the relay only sees the client's own campaigns:

```bash
export RELAY_SECRET=...                       # same value as above
export INSTANTLY_API_KEY_ACME_CO=...          # one key per client workspace
node scripts/build-relay-routes.mjs --webhooks https://YOUR-RELAY.workers.dev/
```

It prints the `curl` commands. Each creates a webhook with the campaign filter and a custom header `x-relay-secret`.
Instantly documents **no signature**, so that header is the only authentication. Keep the relay URL private and rotate the secret by patching the webhooks.

Then use Instantly's webhook test endpoint (or reply to your own campaign email) and check the line shows up in the events channel.

Webhooks may need a paid Instantly plan above the entry tier. If creation returns 402 or 403, that is why.

## Create the Dot's event trigger

In ChatGPT, for the Dot: an event trigger on Slack, **new messages in the client's events channel**, author filter set to the relay's Slack app if available, thread replies off.
`@ChatGPT` must be a member of the channel. Reactions, edits, deletes and DMs do not trigger it. Several events close together may arrive as one run.
Event triggers are created on the web or mobile app by the Dot's owner. The self-check (`setup/self-check.md`) creates them if Phase 0 test 3 passed.

## If bot posts do not trigger the Dot

1. Keep `wake.primary: schedule_only`. The hourly check carries every reply, up to an hour late. A warm lead hurts at an hour, so try 2.
2. Wake through GitHub instead: have the relay open a comment or issue in a private repo the Dot has a GitHub PR trigger on. It works and it is ugly. Only if the delay matters.
3. Shorten the hourly check for clients with high reply volume. Watch usage.

## Operate it

- Unroutable events go to the agency channel marked `UNROUTED`: a campaign nobody owns, or a shared workspace. Add the campaign to a client's `workspace.yaml` or ignore it.
- A 502 from the relay means Slack refused the post. Instantly retries.
- Run `npm test` after any change to `relay/relay.mjs`.
