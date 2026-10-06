# 11 · Weekly and monthly reports

Both are read-only. They use the same fetch recipe as `07-performance-digest.md`. Post in the client's reports channel. Totals only go to the agency channels.
The weekly report is written so the agency can forward it to the client as it is: no internal notes, no other client's data, no Slack drama.

## Weekly (Monday 08:30), `templates/weekly-report.md`

1. **Headline:** positive-reply rate this week vs last week and vs `reporting.positive_reply_target`, in one sentence.
2. **Pipeline:** emails sent, replies, positive replies, meetings booked, meetings completed.
3. **Campaigns:** each with its positive-reply rate, bounce rate and one line on why.
4. **What we changed and what we learned:** experiments finished from `logs/experiments.md`, with the result.
5. **Inbox work:** replies handled, median minutes from reply to card, cards approved unchanged vs edited.
6. **Mailbox health:** counts by state, anything fixed, anything still open.
7. **Next week:** the proposed lead batches and experiments, as asks.

Then post the **learnings summary** separately for the internal team: lessons added or bumped this week, contradictions to settle, the edit rate
(`10-learning-loop.md`).

## Monthly (first working day, 09:00), `templates/weekly-report.md` with the monthly block

1. Month vs the previous month on the same headline metrics.
2. **List refresh:** segments whose pool is nearly exhausted, segments to retire, new segments worth testing.
3. **Experiment review:** what you actually learned this month, in one line each. Write the winners as lessons if a human agrees.
4. **Capacity:** healthy mailboxes vs the volume the client wants. A real shortfall is a sentence and a suggestion, never a purchase.
5. **Cost:** credits used on enrichment per positive reply.

Save a copy to `clients/<c>/logs/reports/<YYYY-MM>.md` and post the link. If the client has a ChatGPT Space for reports, put a copy there too.

## Rules

Never invent a number. If analytics returned nothing, say there is no data. Never compare one client with another.
