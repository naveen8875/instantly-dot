# Tool map: what the playbooks need from Instantly

The playbooks say what to do in plain verbs. This table says which Instantly call each verb is, so you can check the Dot's connection exposes it.
Paths come from Instantly's OpenAPI file. Instantly's `llms.txt` index
lists a few of these differently (see "Docs disagree" below). The MCP server and the ChatGPT plugin hide the path, but give you the tool name.

**Fill the last column during Phase 0 test 1** by asking the Dot: "List every tool the Instantly connection exposes, name and one-line description, no summary."
Anything in the table with no tool is a gap: the playbook that needs it cannot run until it is closed.

Base URL `https://api.instantly.ai/api/v2`. Workspace-wide limits: 100 requests a second, 6,000 a minute. Listing emails: about 20 a minute.

| Verb | Used by | REST | Access | Tool name in your connection |
|---|---|---|---|---|
| whoami (workspace check) | every run | `GET /workspaces/current` | read | |
| list_accounts / account_detail | 01 | `GET /accounts`, `GET /accounts/{email}` | read | |
| warmup_analytics | 01, 06 | `POST /accounts/warmup-analytics` (100 per call) | read | |
| account_daily | 01 | `GET /accounts/analytics/daily` | read | |
| test_vitals | 01 | `POST /accounts/test/vitals` | read | |
| sending_status | 01, 06, 07 | `GET /campaigns/{id}/sending-status` | read | |
| list_campaigns / get_campaign | 01, 04, 06, 07 | `GET /campaigns`, `GET /campaigns/{id}` | read | |
| analytics, overview, steps, daily | 07, 11 | `/campaigns/analytics`, `/overview`, `/steps`, `/daily` | read | |
| count_unread | 02 | `GET /emails/unread/count` | read | |
| list_replies | 02 | `GET /emails` (filters: received, unread, latest of thread, campaign, preview only, limit) | read | |
| get_reply (read thread) | 02, 03 | `GET /emails/{id}` | read | |
| send_reply | 02, 03, 08 | `POST /emails/reply` with `eaccount`, `reply_to_uuid`, `subject`, `body.text` | `emails:create` | |
| mark_read | 02 | thread mark-as-read | write | |
| set_interest | 02, 03, 09 | update a lead's interest status (async, returns 202) | write | |
| get_background_job | 04, 02 | `GET /background-jobs/{id}` | read | |
| block_list_create | 02 (unsubscribe) | create a block-list entry, `bl_value` = the email address | write | |
| block_list_list | 04 | list block-list entries | read | |
| lead_label_create / list | 02 | custom lead labels (`rp:sensitive` and similar) | write | |
| find_count / find_preview | 04 | SuperSearch count and preview (free) | read | |
| enrich | 04 | SuperSearch enrich-leads (spends credits) | write | |
| verify_stats | 04 | `GET /lead-lists/{id}/verification-stats` | read | |
| add_leads | 04, 06 | `POST /leads/add` (up to 1,000 per call, skip if in campaign) | write | |
| list_leads / get_lead | 08, 09 | `POST /leads/list`, `GET /leads/{id}` | read | |
| create_campaign | 06 | `POST /campaigns` (always created as a draft) | write | |
| update_campaign | 06 | `PATCH /campaigns/{id}` | write | |
| activate | 06 | `POST /campaigns/{id}/activate` | write | |
| account_pause / account_resume | 01 (card only) | `POST /accounts/{email}/pause`, `/resume` | write | |
| webhooks (create, list, test) | setup/relay.md | `POST /webhooks`, `GET /webhooks`, `POST /webhooks/{id}/test` | admin | |

## Calls the Dot must not have, or must refuse

Delete anything, forward an email, edit an email, update a lead or account, buy done-for-you domains or mailboxes, change warmup, workspace or billing writes, API key management.
If the connection exposes them, the Dot's Custom Rules must hand them off (`setup/dot-custom-rules.md`). `config/approvals.yaml` lists them as `never`.

## Things to know before trusting a call

- `reply_to_uuid` is the **Instantly `id`** of the message you answer. Not `message_id`, not `thread_id`. Webhook payloads call it `email_id`.
- `eaccount` is the mailbox that **received** the message.
- You add `Re:` to the subject yourself.
- Setting an interest status is queued. It can also fire any automation the client has on `lead_interested` and similar events. That is why `workspace.yaml` has `dot_sets_interest_status`.
- Instantly tags (`custom-tags`) apply to **accounts and campaigns only**, not to leads. Lead-level marks are custom lead labels, and the client log.
- A custom lead label is sent as an event type to any webhook subscribed to all events. Our relay forwards only three types, so labels do not wake the Dot.
- Webhooks have no signature. The only authentication is a custom header you set when creating the webhook (`x-relay-secret`). Keep the relay URL private.
- The webhook payload carries `email_id`, `lead_email`, `email_account`, `campaign_id`, `unibox_url` and the reply text. The relay drops the reply text on purpose.
- Campaign `timezone` is a closed list that lacks some common zones (see playbook 06).
- Trial or free workspaces cannot send replies (402) and may not get webhooks.

## Docs disagree (check the OpenAPI file if you fall back to raw REST)

| Call | OpenAPI file or create-webhook enum | llms.txt index or events guide |
|---|---|---|
| Block-list create | `POST /block-lists-entries` (OpenAPI path in the local docs) | `POST /block-list-entries` |
| Interest status | `POST /leads/update-interest-status` | `PATCH /leads/:id/interest-status` |
| Mark thread read | `POST /emails/threads/{thread_id}/mark-as-read` | `POST /emails/threads/mark-read` |
| Campaign analytics | `GET /campaigns/analytics` | `POST /campaigns/analytics` |
| Webhook event names | create-webhook enum: `email_link_clicked`, no `auto_reply_received` | events guide: `link_clicked`, `auto_reply_received` |

The authoritative file is `https://api.instantly.ai/openapi/api_v2.json`.
