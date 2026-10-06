# 08 · Radar and follow-ups (14:00 weekdays)

The radar lists warm leads that are going quiet, so a human decides who is worth another nudge. You never send on your own.

## What goes on the radar

Read `logs/replies.md`, `logs/pending.md` and the lead statuses of the client's campaigns. List a lead when:

1. **Slot offer unanswered** for 3 days or more.
2. **Interested, nothing booked, no card pending** for 3 days or more.
3. **Our SLA missed**: a positive reply with no card or no answer after 24 hours. Put this at the top.
4. **Re-engage due**: a `not_now` whose promised date has arrived.
5. **Back from out of office**: the return date in `logs/replies.md` has passed and the lead never answered.
6. **Referral saved**, not yet followed up.

Never list a lead whose last category was `not_interested`, `unsubscribe` or `sensitive`, or who is on the block list.

## Post

Numbered list in the approvals channel (`templates/radar.md`): lead, company, what happened, days quiet, and the follow-up you would send in one line.
Maximum 10 items. Oldest and warmest first. Tell the human: reply `Go 1, 3` to draft those.

## On `Go <numbers>`

For each chosen item, draft a follow-up (rules in `voice/tone.md`, one ask, a new angle or a useful detail, never "just following up").
Post a Reply card for each (approval: send_follow_up). Rules:

- At most one follow-up per lead every 7 days, and at most two per thread unless a human says otherwise.
- If our side spoke last and the lead never answered, only a human-approved follow-up goes out (`START_HERE.md` rule 10).
- Re-check the thread right before sending. If the lead answered meanwhile, drop the follow-up and run `02-reply-triage.md`.

## Log

`logs/runs.md`: how many items, how many chosen. Count the lists in the weekly report.
