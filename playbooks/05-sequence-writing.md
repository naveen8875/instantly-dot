# 05 · Writing a sequence

Wake: a human asks for a new campaign, a digest finds a weak step, or a segment in `icp.yaml` has no campaign yet.
You write copy. You do not create, edit or send anything in Instantly here. That is playbook 06, behind a card.

## Inputs

`workspace.yaml` (offer, proof points, sender), `icp.yaml` (segment, structure, personalization), `voice.md`, `examples.md`, `learnings.md`, `voice/tone.md`.
Ask the human only for gaps. Never invent a result, customer or claim: use `offer.proof_points` or leave it out.

## Pick a structure

| | Steps | Use when |
|---|---|---|
| **A** (default) | 1 intro, wait 3 days · 2 bump with a new angle or proof point, shorter, wait 3 to 4 days · 3 break-up | Fastest to ship |
| **B** value ladder | 1 problem (3d) · 2 proof (3-4d) · 3 new angle (4d) · 4 break-up | Considered buyers |
| **C** trigger | Open with the signal (funding, hiring, launch), tie it to the outcome, soft CTA; follow-ups as in A | The segment targets a news or signal filter |

More than 4 steps: push back, then comply if the human insists.

## Personalization, best to acceptable

1. Signal: the actual trigger ("saw you're hiring 5 SDRs").
2. Role pain from the segment.
3. Company or industry context.
4. Generic but relevant. Never "I came across your website."

Put the sharpest hook in the first line.

## Copy rules

- One idea and one ask per email. Email 1 under 100 words. Follow-ups shorter.
- Plain text feel. No links, images or attachments in email 1.
- Subject: lowercase, specific, under about 60 characters, no hype. Follow-ups: leave the subject empty so they thread. Confirm that behaviour on a test campaign in Phase 0.
- Ask something the reader can answer in one line.
- The last step is a clean break-up, no guilt.
- Run the hype and formatting scan in `voice/tone.md`. Rewrite flagged lines plainer.

## Variables must resolve

Use only variables that exist on the leads of the list you will attach: first name, last name, company name, job title,
`rp_opener` or other custom variables you confirmed on the list. An unknown variable is a failure: replace it with static text and tell the human.

## Output (post as a Sequence card)

A human-readable rendering plus this JSON shape, which is what playbook 06 puts into the campaign:

```json
{
  "steps": [
    { "type": "email", "delay": 3, "delay_unit": "days",
      "variants": [ { "subject": "quick question about {{companyName}}", "body": "Hi {{firstName}},\n\n..." } ] },
    { "type": "email", "delay": 3, "delay_unit": "days",
      "variants": [ { "subject": "", "body": "..." } ] },
    { "type": "email", "delay": 0, "delay_unit": "days",
      "variants": [ { "subject": "", "body": "..." } ] }
  ]
}
```

`delay` is the wait after this email before the next. Every variant needs a subject and a body.

## Self-check before posting

- [ ] Every variable resolves
- [ ] Email 1 under 100 words, subject under about 60 characters
- [ ] One ask per email
- [ ] No banned phrase, hype word, link or image (email 1)
- [ ] Every claim comes from `proof_points`
- [ ] Reads in the client's voice and follows `learnings.md`

## After the card

`Approve` or `Edit <text>`: save the approved version to `logs/sequences/<campaign-name>.md`, and if it was edited run `10-learning-loop.md` with "sequence copy" as the scope.
Then offer playbook 06. Writing a rewritten variant for a weak step follows the same rules, but a human pastes it into Instantly. You never edit a live sequence (approval: edit_live_campaign_sequence).
