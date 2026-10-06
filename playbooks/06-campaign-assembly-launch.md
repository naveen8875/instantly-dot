# 06 · Assemble a campaign as a draft, then launch it

A campaign is created inactive, so nothing sends until a human says `Launch` and every gate passes.

## A. Assemble (all of this is a draft)

1. **Pick senders.** Only mailboxes in `workspace.yaml` that are HEALTHY or WATCH (`01-mailbox-safety.md`). Never offer a RED one.
2. **Schedule.** Default Monday to Friday, `calendar.working_hours`. Instantly's timezone field is a closed list that is missing common zones
   (for example New York, Los Angeles, London). Map to a same-offset zone that is on the list (US Eastern → `America/Detroit`, US Central → `America/Chicago`).
   If you cannot map it with confidence, ask the human. Never guess.
3. **Create the campaign** (approval: create_campaign_draft) with the approved sequence in `sequences[0]`, the sender list, the schedule, and conservative defaults:
   stop on reply on, unsubscribe header on, plain text for email 1, a real gap between sends, slow ramp on,
   `daily_limit` = the smaller of the human's ask and senders × about 25.
   Send only fields that exist. Invented keys are rejected.
4. **Attach leads** from a verified, graded list (`04-lead-sourcing.md`) (approval: add_leads_to_campaign).
5. **Assert it is a draft.** Read it back. Status must be 0. If not, alert and do not offer launch.
6. Post the **Launch card**: name, leads attached with the skip and duplicate accounting, sequence preview, schedule, senders with their health verdict,
   daily limit. State plainly: "Created as a DRAFT. Nothing sends until you reply Launch."

Editing the draft later: show the exact field changes first (approval: update_campaign_settings).
Editing a live campaign's sequence is never yours (approval: edit_live_campaign_sequence).

## B. Launch (in this order, none skippable)

1. Read the campaign back: status 0, leads attached, a sequence present.
2. Mailbox preflight: every attached mailbox through `01-mailbox-safety.md`.
   Any RED: refuse and name the mailbox and the reason. All cold: full stop plus warmup guidance.
   Options for the human: drop that sender, wait for warmup, fix it in Instantly.
3. Verify re-check: verification stats on the source list. Any unverified row in the send set: stop.
4. Spam scan of every subject and body (`voice/tone.md`). Surface anything flagged on the card.
5. Post the confirm. It must show all four: number of leads, sequence summary (steps and subjects), daily ramp, sending domains with health verdicts.
6. Only on an explicit `Launch` from an approver (approval: activate_campaign): activate. This is never `auto`.
7. Read the campaign back. Active (1) is good. Anything else: read the sending status, explain it (table in `01-mailbox-safety.md`), do not retry in a loop.
   Statuses: -99 suspended, -1 accounts unhealthy, -2 bounce protect.
8. "Just launch, skip the checks": run them anyway, show the results, then honour an informed yes unless a refusal condition holds.

## After launch

The next hourly run reads the sending status and posts a one-line result. The next 08:00 digest includes the campaign.
Pause and resume are cards (approval: pause_campaign, resume_campaign).
