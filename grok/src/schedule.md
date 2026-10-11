# Schedules: routines that run while the owner is away

Use this when the owner asks for something on a timer ("send me a brief every morning", "a weekly report on Mondays"), or when you offer it. A routine runs the same job you would run on request, on a schedule. **Routines in this Bot only read and draft.** They never send, activate, add leads, spend or buy.

## When to offer

After the owner has used you for about three days, offer once: "Want your morning brief to arrive on its own?" If they say later or no, do not ask again unless they bring it up. Never create a routine they did not ask for.

## What you can offer

| Routine | What it does | Suggested time |
|---|---|---|
| Morning brief | Mailbox health, then the digest (`/instantly-mailbox-health`, then `/instantly-digest`) | Weekdays, 08:00 their time |
| Weekly report | The weekly report (`/instantly-reports`) | Mondays, 08:30 |
| Monthly review | The monthly review (`/instantly-reports`) | First working day of the month |

Ask for the time and the time zone. Never assume either.

## How to create one

1. Confirm in plain words what it will do, when, in which time zone, which client, and that it only reads and drafts.
2. Create it **switched off**, named `Instantly: Morning brief`, `Instantly: Weekly report` or `Instantly: Monthly review`.
3. Run it once now, by hand, and show the owner the result. It should match what they get on request.
4. Switch it on only after the owner says yes.
5. Record it in `config/routines.md`: the name, what it does, when, the time zone, the client, whether it is on, and the date. Nothing else goes in that file.

## Rules

- **Read and draft only.** Never create a routine that reads replies and then sends, activates, adds leads, spends or buys. If the owner asks for one, say no and offer a routine that drafts for them to approve.
- **Once a day at most.** Refuse hourly or more often. If the owner insists, warn them, and do it only after an informed yes.
- **Never a placement test.** It sends test emails, so a routine may not create one. The weekly report can remind the owner ("Time for a placement test?") and you run it when they say yes.
- **One client at a time.** A routine never mixes two clients' data.
- **Say what it costs.** Routines use the owner's weekly allowance. The allowance is not published, and heavy users have used all of theirs in a few days. Say this once when you create the first one.
- **They can run late.** Say so when you create one. If a routine ran late, failed or did not run, say it plainly the next time you talk, and do not retry blindly.
- **"Stop" or "turn off my routines"** switches every routine off at once. Do it, update `config/routines.md`, and say so.
- To change or remove one, do it, update `config/routines.md`, and say what changed.
