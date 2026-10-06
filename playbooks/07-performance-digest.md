# 07 · Performance digest (08:00 weekdays)

Read, chart, flag and suggest. This playbook changes nothing in Instantly (approval: read_campaigns_and_analytics is the only action it uses, plus posting).
A suggestion that changes a campaign goes through its own playbook and its own card.

## Fetch (per client, per campaign)

- One analytics call for all the client's campaigns, without the total-leads count (much faster), for the last 7 days and the last 30.
- Per campaign that looks off: the CRM funnel overview (interested → meeting → closed), step analytics, daily analytics, sending status.
- Date window format is `YYYY-MM-DD`. A 400 about start and end date: fix the range and retry once.

## Headline metric: positive-reply rate

```
positive_reply_rate = positive replies / emails sent
```

Positive = interested + soft positive ("send info", "reach out in Q3") + referral. Read the counts from the funnel overview (interested, meeting booked, meeting completed, closed) and your own classification in `logs/replies.md`.
Exclude out-of-office and bounces from the numerator. Put this above opens and raw replies.
A high raw reply rate that is mostly "no" and "unsubscribe" is a bad sign, not a good one.

Derived numbers, from exact fields, never invented:
- Reply rate = (unique replies - unique automatic replies) / new leads contacted
- Bounce rate = bounced / emails sent
- Open rate = unique opens / contacted. **Flag as unreliable if open tracking is off.**
- Step view: sent, unique opens, unique replies, unique clicks per step and variant (0 is A, 1 is B, 2 is C). A null step: say it could not be determined.

Benchmarks are policy defaults, anchor to the client's own baseline when you have one:
positive-reply rate at or above `reporting.positive_reply_target`, bounce under 3%, over 5% means stop and clean the list.

## Diagnose, then suggest one change

| Symptom | Likely cause | Suggest |
|---|---|---|
| Low replies, decent opens | Copy or ask is weak | Rewrite copy (playbook 05): copy-only experiment |
| Low replies, low or unknown opens | Targeting or deliverability | Tighten ICP (04) or check mailboxes (01): list-only experiment |
| Bounce over 5% | List hygiene | Re-verify, clean, consider pausing (card) |
| Zero sends | Not sending | Read sending status, explain it |
| Big drop after step 1 | Follow-up angle or timing | Rewrite the follow-up |
| One variant clearly wins | | Suggest promoting it. A human applies it. |

Every suggestion is one experiment: a one-sentence hypothesis, one variable changed, the rest held constant, judged on positive-reply rate at a fair sample size.
Record each proposed experiment in `logs/experiments.md`.

For each **weak step**, draft one rewritten variant (playbook 05 rules) and include it in the digest. A human pastes it into Instantly.

## Winners

Rank campaigns by positive-reply rate. For a clear winner, suggest scaling: more leads (a batch card via 04), more healthy mailboxes (a human adds them).

## Include in the digest

Replies handled, meetings booked, median minutes from reply to card, edit rate vs last week (`10-learning-loop.md`), mailbox states (HEALTHY, WATCH, RED counts),
credits used and left, anything blocked. Use `templates/daily-digest.md`. Post in the client's reports channel. Post counts only to the agency digest channel.

## Edge cases

Campaign too young or zero sends: say "no data yet", do not chart noise. A wrong campaign id: look it up by name. A very large portfolio: show the top and bottom three, offer a drill-down.
