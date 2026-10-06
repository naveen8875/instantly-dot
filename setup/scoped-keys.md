# Scoped API keys: letting Instantly itself refuse dangerous calls

## Two ways to connect Instantly

| | Sign in with Instantly (OAuth) | API key in a custom connector |
|---|---|---|
| Effort | One click, nothing to copy | Create a key in Instantly, paste it once (developer mode) |
| Access | **Full access to the workspace.** The connection requests no narrower scope | Exactly the scopes you tick |
| Safety rests on | Dry run, approvals and the Dot's rules | The same, **plus Instantly refusing** calls the key cannot make |
| Several clients | One workspace per connection | One custom connector per client workspace, each with its own key |
| Best for | A first try on a test workspace | Agencies running real clients |

The quickstart uses the first. For real clients use the second, with one key per client workspace and the scopes below.

## Create the key

1. Open <https://app.instantly.ai/app/settings/integrations> and choose **API Keys**.
2. **Create API Key**, name it `Dot: <client>`, tick only the scopes below.
3. Copy it once. Instantly never shows it again.
4. In ChatGPT, add a custom connector (developer mode) at `https://mcp.instantly.ai/mcp`. Instantly accepts the key as an `Authorization` header, as an `x-instantly-api-key` header,
   or inside the URL as `https://mcp.instantly.ai/mcp/<key>`. Use a header if ChatGPT's form offers one. A key in a URL can end up in logs, so rotate it if it is ever exposed.
   See <https://developer.instantly.ai/mcp/authentication>.
5. Never type the key into the chat. The Dot must never ask for it.

Note that a wrong or revoked key can still say "connected", because the server only checks it on the first real call. The Dot's workspace check is the real test.

## Scopes to grant

| Grant | Why |
|---|---|
| `emails:read`, `emails:create`, `emails:update` | Read threads, reply, mark read |
| `leads:read`, `leads:create` | Read leads, add verified leads |
| `lead_lists:read`, `lead_lists:create` | Create the list for a batch |
| `lead-labels:read`, `lead-labels:create` | Labels (Instantly's docs write `lead-labels`, with a hyphen) |
| `campaigns:read`, `campaigns:create`, `campaigns:update` | Create drafts, activate, pause. `update` also permits sequence edits |
| `accounts:read` | Mailbox health. **Withhold `accounts:update`** so the Dot cannot pause, resume or change warmup |
| `block_list_entries:read`, `block_list_entries:create` | Stop unsubscribers |
| `email_verifications:read`, `email_verifications:create` | Verification |
| `supersearch_enrichments:read`, `supersearch_enrichments:create` | Count, preview, enrich |
| `webhook_events:read` | Read event types |
| `audit_logs:read` | Compare Instantly's record with the Dot's own logs |

For a **read-only** trial of everything except SuperSearch enrichment, tick only `all:read`.

## Scopes to withhold

| Withhold | Effect |
|---|---|
| Every `:delete`, and `all:*` | The Dot **cannot** delete anything |
| `dfy_email_account_orders:*` | The Dot **cannot** buy domains or mailboxes |
| `api_keys:*`, `workspace_billing:*`, `workspace_members:*`, `workspace_group_members:*`, `workspaces:update` | The Dot **cannot** touch keys, billing, members or groups |
| `accounts:create`, `accounts:update` | The Dot **cannot** add mailboxes, change warmup, or pause and resume mailboxes. The pause card becomes a message to a human |
| `webhooks:create`, `webhooks:update`, `webhooks:delete` | A human sets up webhooks once, with a different key |

## What scopes can and cannot enforce

| Rule in `config/approvals.yaml` | Enforced by the key? |
|---|---|
| `delete_anything`, `buy_domains_or_mailboxes`, `change_passwords_billing_or_keys` | Yes |
| `change_warmup_settings`, `connect_or_remove_mailbox`, mailbox pause and resume | Yes, if `accounts:update` and `accounts:create` are withheld |
| `edit_live_campaign_sequence` | **No.** `campaigns:update` is needed to launch and also edits sequences. The Dot's rules carry it |
| `forward_email` | **No.** Forward and reply share `emails:create` |
| `update_lead_or_account_fields` | Accounts yes. Leads: Instantly does not state which scope setting an interest status needs, so test it |
| `reply_to_sensitive`, `reply_to_no_reply_categories`, `send_via_other_mail_plugin` | No. Rules and the validator only |

Scopes make the destructive and financial actions impossible. The judgment calls stay with the Dot's rules and your approval cards.

## Workspace groups

An agency admin workspace can control sub workspaces with one key and an `x-as-workspace` header. **Do not give the Dot that key**: it would reach every client.
Give each client's connection that client's own scoped key.

## Test it

Connect the Dot with the scoped key, then ask it to run its normal jobs, then ask it to delete a test lead. Instantly should refuse the delete (401 or 403), not only the Dot.
Note any endpoint that needed a scope not listed here, and add it.
