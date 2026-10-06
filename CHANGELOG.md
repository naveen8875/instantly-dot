# Changelog

The Dot reads this when you say `Update yourself`. One line per change, newest first. Anything that changes the shape of your data (a new required field) is marked **DATA**.

## 0.1.0

- First release: reply triage, mailbox safety, slot offers, lead sourcing with SuperSearch, sequences, campaign launch, digests, radar, briefs, learning loop, reports.
- Guided setup: paste one message into a blank Dot. The Dot fetches this repo, checks its connections, asks one form and creates your files in `instantly-dot-data/`.
- Every client starts in `dry_run`: nothing is sent, and SuperSearch enrichment builds a list that is attached to no campaign.
- A validator (`npm run validate`) and tests guard the approval rules.
- Setup starts from your website: the Dot reads it, shows what it understood and who it would email, and you say "looks good". No questionnaire, no file names or IDs. A new `profile.md` per client holds the result.
- Replies are signed with the name set on the sending mailbox by default (`{sending_account_name}`). Set a fixed name in `workspace.yaml` to override.
