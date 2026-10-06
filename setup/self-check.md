# Self-check

Run it as: "Run setup/self-check.md for client acme-co". With no client name it runs the agency checks only.
It never messages a lead, never sends an email, never writes to Instantly. It posts READY, or the exact list of what is missing, in the client's alerts channel.

## Agency checks

1. You read `START_HERE.md`, and the canary in `config/agency.yaml` is the one you log.
2. `config/agency.yaml` parses, `mode` is set, at least one client is listed, `config/approvals.yaml` loaded.
3. Slack: you can post in both agency channels.
4. Files: you can read the instructions folder, and read and write the data folder (append a line to `clients/<c>/logs/runs.md`).
5. Google Calendar plugin is connected.
6. The tool list for each Instantly connection is known and written down against `setup/tool-map.md`.

## Client checks (0 to 13)

0. **Folders.** You can read the instructions folder, you can read and write the data folder, and the data folder is the one you used last time (look for `logs/runs.md`). Say where both are.
1. **Files.** `workspace.yaml`, `icp.yaml`, `voice.md`, `examples.md`, `learnings.md` read from the data folder. Empty example sections are listed (a warning in `dry_run`, a blocker when live).
2. **Workspace.** whoami on the client's connection returns the `workspace_id` in `workspace.yaml`.
3. **Campaigns.** Every campaign id resolves. Report each one's status and sending status.
4. **Mailboxes.** Every mailbox in `workspace.yaml` exists in this workspace. Report HEALTHY, WATCH or RED for each, and whether each has a first and last name set (replies are signed with it by default). No other mailbox is touched.
5. **Inbox.** One read-only list call returns the unread count for the client's campaigns.
6. **Thread.** Fetch one recent message by id and show you can see the whole thread. If there is none yet, say so.
7. **Reply tool.** Inspect the reply tool's inputs: it needs the sending mailbox, the id of the message being answered, a subject and a body. Do not call it.
8. **Calendar.** Read the next 7 days and show three sample slots that follow the rules in playbook 03. Do not create an event.
9. **Slack.** You are a member of all four client channels. Post one line in the alerts channel only.
10. **Wake.** If `wake.primary` is `slack_event`: list the Instantly webhooks for this client's campaigns and confirm all three event types point at the relay.
    Trigger Instantly's webhook test. The line must appear in the events channel within 5 minutes, and you must have an event trigger on that channel.
    If Phase 0 test 3 passed, create the event trigger now. Otherwise say the client runs on schedules only.
11. **Block list.** The block-list read works. Do not write.
12. **Lead search.** A SuperSearch count and free preview works for the first active segment. No credits.
13. **Approvals.** List, in your own words, which actions are `auto` and which are `never`. They must match `config/approvals.yaml` exactly.

With `interface: chatgpt`, skip checks 9 and 10: there are no channels and no event wake. Post the result in this conversation instead of an alerts channel.

## Result

Post `READY` only if all 13 pass. Otherwise post `NOT READY` and one line per failed check with what is needed.
In `dry_run` a client can be READY with warnings. A client cannot go live with a blocker.
