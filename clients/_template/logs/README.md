# logs/

The Dot appends here. Humans read it; the Dot reads it on the next run to avoid repeating itself.

| File | What goes in it |
|---|---|
| `runs.md` | One header per run: timestamp, canary, mode, what woke it, what it did |
| `replies.md` | One line per reply handled: email_id, category, confidence, card Ref ID, outcome |
| `pending.md` | Open cards waiting on a human (Ref ID, type, posted at) |
| `batches.md` | Lead batches proposed, approved, enriched, attached, with verify counts and credits |
| `experiments.md` | Campaign experiments: hypothesis, variable changed, result |
| `sequences/<campaign>.md` | The approved version of each sequence the Dot wrote |
| `reports/<YYYY-MM>.md` | Monthly report copies |

The Dot de-duplicates on `email_id`. If `replies.md` already has it, it does not draft again.
