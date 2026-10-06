# Add a client (about 20 minutes)

1. **Copy the template.**

   ```bash
   cp -r clients/_template clients/acme-co
   cd clients/acme-co
   mv workspace.example.yaml workspace.yaml
   mv icp.example.yaml icp.yaml
   ```

   The example files must not stay in the folder: the validator fails if they do. Delete the `REPLACE_ME` comment line at the top of every file you fill.
2. **Create the client's 4 Slack channels** (`#acme-co-events`, `-approvals`, `-alerts`, `-reports`). Add `@ChatGPT` to all four. Keep your team out of `-events`: the relay posts there and the Dot reads it.
3. **Fill `workspace.yaml`.**
   - `instantly.connection` is the name of the Dot's Instantly connection for this workspace, and `instantly.workspace_id` is what whoami returns for it.
   - `campaigns` lists every campaign the Dot may read and answer on. `mailboxes` lists only this client's sender addresses.
   - `sender.signature` is appended exactly as written to every reply.
   - `offer.proof_points` is the **only** set of results and claims a message may use. The Dot cannot use a number that is not listed.
   - `dot_sets_interest_status`: set `false` if the client has automations on Instantly status events (webhooks, CRM sync) that you do not want the Dot to trigger.
4. **Fill `icp.yaml`** with the segments the Dot may propose lead batches for. Use the exact SuperSearch values from `playbooks/04-lead-sourcing.md`. Each segment points at one of the campaigns above.
5. **Fill `voice.md`** and **`examples.md`.** Paste 1 to 3 of the client's best real replies into each of the 8 sections. Each reply under 80 words, "they" instead of the lead's name, no company names. The Dot learns the pattern and writes its own words for each lead.
6. **List the client** in `config/agency.yaml`:

   ```yaml
   clients:
     - folder: "acme-co"
       active: true
   ```

   Remove the `REPLACE_ME` placeholder entry.
7. **Validate and push.**

   ```bash
   npm run validate
   ```

   If you copied a folder and forgot to change a channel, a campaign id or a mailbox, the build fails before two clients end up sharing one.
8. **Outside the repo:** share the client's meeting calendar with the Google account the Dot uses. Create a ChatGPT Space for the client's weekly reports if you want one.
9. **Set up the wake** (`setup/relay.md`): the Slack incoming webhook for `-events`, the Instantly webhooks for the client's campaigns, the relay route (`npm run relay:routes`).
10. **Run the self-check:** "Run setup/self-check.md for client acme-co". Expect READY or an exact list of what is missing.
11. **Leave the client in `dry_run` for 2 to 3 days.** Every card says `DRY RUN`, nothing is sent, and every edit you make becomes a lesson.
