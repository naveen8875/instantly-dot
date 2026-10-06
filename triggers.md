# Triggers: what wakes the Dot

Times are in the agency timezone from `config/agency.yaml`. Nothing is posted or sent in quiet hours.

## On demand (works in every setup)

The owner can ask in chat at any time: "check the inbox", "morning routine", "propose leads for acme-co", "digest", "weekly report".
Run the matching playbook (`START_HERE.md` section 2). With `interface: chatgpt` and no schedules this is the whole wake story, and it is the easiest way to try the Dot.

## Event wake (`interface: slack` only, and only after Phase 0 test 3 passes)

Instantly webhook → the relay (`relay/`) → a post in the client's events channel → an event trigger on that channel.

The relay only forwards three event types, and it never forwards reply text:

| Instantly event | Why it wakes the Dot |
|---|---|
| `reply_received` | A lead answered. Playbook 02. |
| `lead_meeting_booked` | A meeting exists. Playbook 09. |
| `account_error` | A mailbox is broken. Playbook 01. |

`supersearch_enrichment_completed` can also be forwarded if you want lead batches to continue the moment enrichment ends,
instead of on the next hourly check. It has no campaign id, so the relay routes it by workspace.

Not forwarded on purpose: `email_sent`, `email_opened`, `email_bounced`, `auto_reply_received`, `lead_unsubscribed`, link clicks.
They are high volume, or Instantly already handles them, or the 07:30 and 08:00 jobs read them from analytics.

The event wake can batch several replies into one run. Handle every `reply_received` post since the last logged run.
Never assume one event per run.

Message format the relay posts:

```
Instantly event: reply_received · campaign <campaign_id> · <lead_email> · account <email_account> · email <email_id>
```

## Schedules

| When | What | Playbook |
|---|---|---|
| Hourly | Backup inbox check; meeting briefs due in the next hour | 02, 09 |
| 07:30 daily | Mailbox health for every client; briefs for today's meetings | 01, 09 |
| 08:00 weekdays | Each client's digest: replies, meetings, rates vs targets, a rewritten variant for each weak step | 07 |
| 10:00 weekdays | Lead batch proposals per client, approved with one reply | 04 |
| 14:00 weekdays | Radar: warm leads going quiet. Reply `Go 1, 3` | 08 |
| Monday 08:30 | Weekly report per client, plus the learnings summary and edit rate | 11, 10 |
| 1st working day 09:00 | Monthly review per client | 11 |

If Phase 0 test 3 fails, drop `wake` to `schedule_only` in `config/agency.yaml`. The hourly check carries the replies.

## How the hourly check reads the inbox

One list call per client: received, unread, latest message of each thread, preview only, newest first,
filtered to that client's campaigns. Skip threads whose latest message is ours and threads whose
`email_id` is already in `logs/replies.md`. Fetch full bodies only for the threads you will work.
The list endpoint is limited to about 20 requests a minute workspace-wide, so never loop one call per thread.
