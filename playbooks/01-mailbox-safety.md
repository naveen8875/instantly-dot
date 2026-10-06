# 01 · Mailbox safety (runs first, every run)

A burned domain takes weeks to rebuild. Check every mailbox of the client before doing anything else.
Only the mailboxes listed in `workspace.yaml` count. Ignore every other mailbox in the workspace.

## Steps

1. **Read health** (approval: read_mailbox_health) for each client mailbox: account `status`, `warmup_status`,
   warmup `health_score`, `setup_pending`, daily limit and sent today, and the last 7 days of bounces and spam placement.
   Then read each client campaign's sending status (`diagnostics.status`).
   A mailbox missing from the response is unknown, and unknown is treated as RED.
2. **Classify each mailbox.**

   | State | Rule | Effect today |
   |---|---|---|
   | HEALTHY | `status` 1 (Active), `warmup_status` 1, `setup_pending` false, `health_score` ≥ `health.min_health_score` | Normal use |
   | WATCH | `health_score` 60 to 79, or more than 80% of its daily limit already used | Use only `health.daily_headroom_fraction` of what is left; add fewer leads |
   | RED | `status` -1, -2 or -3; or `warmup_status` 0, -1, -2 or -3; or `setup_pending` true; or unknown | Excluded for the day. Alert. |

3. **Read the campaign diagnostics** and explain any state that is not `healthy`, `out_of_schedule`,
   `daily_limit_met`, `follow_up_delay_not_met` or `campaign_running_subsequences` (those are normal):

   | `diagnostics.status` | Meaning and next action |
   |---|---|
   | `campaign_draft` | Not activated yet. |
   | `campaign_paused` | Paused. A human resumes. |
   | `waiting_for_leads` | No leads ready: propose a batch (playbook 04). |
   | `account_daily_limit_met`, `domain_limit_reached` | Add senders or wait. |
   | `all_accounts_unhealthy`, `campaign_accounts_unhealthy`, `no_accounts_available` | Alert: sender problem, not a copy problem. |
   | `campaign_account_suspended` | A mailbox is suspended. Alert; a human checks it in Instantly. |
   | `campaign_bounce_protect` | Bounce protection tripped. Alert; list needs cleaning. |
   | `waiting_for_esp_match` | Routing waits for a matching mailbox. Alert. |

4. **Bounce and spam gates.** Bounce rate = bounced / sent over 7 days.
   At `health.bounce_warn` post a warning. At `health.bounce_stop`, or spam complaints at `health.spam_complaint_stop`,
   post an URGENT alert recommending a pause and show the numbers. Pausing is a card (approval: pause_campaign). Never pause silently.
5. **Weekly (Monday run):** run the vitals test (SPF, DKIM, DMARC, MX) on each sending domain. Any false is a warning with the failing record.
6. **Post only changes.** Compare with the last `mailbox_state` line in `logs/runs.md`. Post a card in the alerts channel
   (`templates/slack-cards.md`, Mailbox alert) only when a mailbox or campaign changed state. Always log the full state.

## What changes in other playbooks

- A reply must be sent from the mailbox that received it. If that mailbox is RED, the card says `BLOCKED: mailbox <x> needs reconnecting in Instantly`
  and no send is offered. Never send the reply from a different mailbox: the lead would see a different address in the thread.
- Campaign launches and lead batches use only HEALTHY and WATCH mailboxes. All RED means a full stop and a plain explanation.
- Capacity check: a healthy mailbox on a young domain carries about 20 to 30 cold sends a day. If planned volume needs more healthy mailboxes
  than the client has, say so in the digest. Suggest warming more mailboxes, or pre-warmed accounts from Instantly. Never buy (approval: buy_domains_or_mailboxes).

## You never do these

Reconnect, add or remove a mailbox (approval: connect_or_remove_mailbox). Change warmup (approval: change_warmup_settings).
Pause or resume a mailbox without a card (approval: pause_or_resume_mailbox). Delete anything (approval: delete_anything).
