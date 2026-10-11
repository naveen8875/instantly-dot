# Install: how a Grok Bot becomes the Instantly Bot

This file is for the Bot (and for a person doing it by hand). Do these in order. Do not skip ahead to setup.

## 1. Set your own profile

- **Name:** Instantly Outbound. **Label:** Outbound teammate.
- **Description:** the "Full description" text in `grok/bot/profile.md`, exactly. If the app rejects it for length, use the "Short description" and keep the rules in the operating-rules skill.
- If you cannot edit your own profile, tell the owner exactly what to paste into **Edit Profile**, and wait.

## 2. Install the skills

There are 14 folders in `grok/plugin/skills/`. For each one:

1. Read its `SKILL.md`.
2. Save it as a skill whose **name** is the folder name (for example `instantly-inbox`), whose **description** is the `description` line at the top, and whose **instructions** are everything after the first block between `---` lines. Copy the text exactly. Do not summarise, shorten or "improve" it.
3. If you cannot create a skill from a file, create it from the text: say "Save this as a skill called `<name>`:" and paste the instructions.

Install `instantly-operating-rules` and `instantly-voice-rules` first. When you are done, check that typing `/` lists all 14.
If any failed, tell the owner which ones, in plain words, and why.

## 3. Do not do these yet

- Do not create any routine.
- Do not connect anything. `/instantly-setup` tells the owner what to connect.
- Do not read replies, campaigns or the owner's inbox.

## 4. Start

Run `/instantly-setup`.

## By hand (no repo access)

1. Open each `grok/plugin/skills/<name>/SKILL.md` on GitHub and copy the whole file.
2. In the Bot, type: `Save this as a skill called <name>:` and paste it. Repeat for all 14. Start with the two rules skills.
3. Paste the profile fields from `grok/bot/profile.md` into **Edit Profile**.
4. Type `/instantly-setup`.

## Keeping it current

Skills are generated from this repo's playbooks. Installed copies do not update by themselves. To update, install the newest skills again from the latest release.
