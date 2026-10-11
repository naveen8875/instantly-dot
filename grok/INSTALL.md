# Install: how a Grok Bot becomes the Instantly Bot

This file is for the Bot (and for a person doing it by hand). Do these in order. Do not skip ahead to setup.

## 1. Set your own profile

- **Name:** Instantly Outbound. **Label:** Outbound teammate.
- **Description:** the "Full description" text in `grok/bot/profile.md`, exactly. If the app rejects it for length, use the "Short description" and keep the rules in the operating-rules skill.
- If you cannot edit your own profile, tell the owner exactly what to paste into **Edit Profile**, and wait.

## 2. Install the skills

Count the folders in `grok/plugin/skills/` (call the number N). **Do this yourself, in this conversation.** Do not hand it to a background helper or another agent: it may not be allowed to save skills, and then it saves nothing and may not tell you.

For each folder:

1. Read its `SKILL.md`.
2. Save it as a skill whose **name** is the folder name (for example `instantly-inbox`), whose **description** is the `description` line at the top, and whose **instructions** are everything after the first block between `---` lines. Copy the text exactly. Do not summarise, shorten or "improve" it.
3. **Read it back** and compare it with the original. A skill only counts as installed once what you read back matches.
4. If saving fails, try the next way, in this order: save it with your own skill-saving ability; write the file into your skills folder; or create it from the text (say "Save this as a skill called `<name>`:" and paste the instructions). Note which way worked and use it for the rest.

Install `instantly-operating-rules` and `instantly-voice-rules` first.

When all N match, **do not say you are done yet**. Your own skill list may not refresh until later, so you cannot check it yourself. Ask the owner: "Please type `/instantly` and tell me how many skills you see. There should be N." If fewer show, say which are missing, and install those again.
If any failed, tell the owner which ones, in plain words, and why.

## 3. Do not do these yet

If the owner said **install only**, stop after step 2: do not greet, do not connect anything, do not run setup, and tell them the skills are installed.

- Do not create any routine.
- Do not connect anything. `/instantly-setup` tells the owner what to connect.
- Do not read replies, campaigns or the owner's inbox.

## 4. Start

Greet the owner the way the operating rules say ("First conversation"), then run `/instantly-setup`.

## By hand (no repo access)

1. Open each `grok/plugin/skills/<name>/SKILL.md` on GitHub and copy the whole file.
2. In the Bot, type: `Save this as a skill called <name>:` and paste it. Repeat for every folder. Start with the two rules skills.
3. Paste the profile fields from `grok/bot/profile.md` into **Edit Profile**.
4. Type `/instantly` and count: you should see one for every folder in `grok/plugin/skills/`.
5. Type `/instantly-setup`.

## Keeping it current

Skills are generated from this repo's playbooks. Installed copies do not update by themselves. To update, install the newest skills again from the latest release.
