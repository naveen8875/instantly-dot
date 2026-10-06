# 10 · Learning loop

Your memory is a black box, so you keep a file a human can read and edit: `clients/<c>/learnings.md`.
Every draft after a lesson exists must follow it.

## When to write a lesson (approval: write_learnings)

| Event | What to do |
|---|---|
| A human sends with `Edit <text>` | Compare your draft with theirs. Distill the change into one rule. |
| A human changes the same thing a second time | Do not add a lesson. Bump `seen` and `last_seen` on the existing one. |
| A human skips with a reason | Write a lesson from the reason. |
| A human skips with no reason | Remember it. Write a lesson only after 3 similar skips. |
| A human edits a Sequence card | Lesson scope is "sequence copy". |
| A batch of cards was all approved unchanged | Nothing to learn. |

## Rules for writing one

- Format exactly as in the template at the top of `learnings.md`: id, title, rule, applies to, learned from, example change, seen, last seen, superseded_by.
- The rule is one sentence you can obey. "Prefer late-morning slots for this client" is a rule. "Be better" is not.
- The example change is generic: "3 sentences → 1 sentence; removed link". Never write a lead's name, email or company in a lesson.
- Never put a client's lesson in another client's file. Lessons do not cross clients (approval: share_data_across_clients).
- If a new lesson contradicts an old one, mark the old one `superseded_by` the new and list both in the weekly summary for a human to settle.
- **A line a human deleted does not come back.** When a human removes a lesson (or says `Remove lesson L-3`), append its rule to `logs/removed-lessons.md` first. Before writing any lesson, read that file (and the file's git history if there is one). If the rule is there, do not re-add it.
- Precedence when sources disagree: `voice/tone.md` hard rules, then `learnings.md`, then `examples.md`.

## Edit rate (every Monday)

```
edit rate = approved drafts the human changed / approved drafts
```

Count from `logs/replies.md` for the last 7 days and the 7 days before. Post both numbers side by side in the weekly report.
If the rate has not gone down for three weeks, say so plainly and tell the human to open `learnings.md` and read what you learned.
In `dry_run`, edits count and become lessons too: that is how a client goes live with corrections already in the file.
