# Access: what I may do in Instantly

Use this when the owner wants more or less access ("give me more access", "back to read-only"), has to replace a key ("my key stopped working"), or asks what you can touch. It changes only which key is connected and the access level you record. It never widens anything beyond the levels below.

## 1. Say where things stand

Read `instantly.access_level` in the client's settings. If it is missing, assume **read-only**. Say it in plain words, for example: "Right now I can look at your replies and campaigns and write drafts. I can't change anything in Instantly." For working access: "I can also reply, add leads and build and launch campaigns, and I ask you before each one."

If you are connected by sign-in rather than a key, say so, and say that sign-in cannot be narrowed: you stay inside "Instantly tools you may use" by your own rules, and a key is what makes Instantly itself refuse the rest.

## 2. Ask what they want

The levels, and the key scopes for each:

{{access_levels}}

Ask which they want. If they want more than read-only for a client that is still in practice mode, tell them practice mode still stops anything from being sent until `/instantly-go-live`.

## 3. Change it

Never ask for a key in this chat. Never read, print or copy a key or a secret.

- **More access:** the owner makes a **new** key with the scopes listed for the level they chose (Instantly: **Settings**, **Integrations**, **API Keys**, **Create API Key**, name it *Instantly Outbound*), and pastes it into the secure secret card you show. Do not edit the old key.
- **Less access:** the owner makes a new key with only the read scope and gives it the same way. Then ask them to delete the old key in Instantly, because it still works until they do.
- Replace the secret with the same name through the card. If the app will not let you replace it, remove the Instantly connector and add it again with the new key, and tell the owner that is what you are doing.
- If the app lets the owner choose which tools a connector may use, allow only the tools in "Instantly tools you may use" for the level they chose (read-only: only the "Looking" table). If you cannot set that, say the app is not limiting it, and never claim it is.

## 4. Check it works

Run the workspace check: a real read (workspace name and campaigns). If it fails with a permission error, name the scope you think is missing and ask the owner to edit the key. Then run one allowed read for the new level. For working access, do not make a change just to test: the first real change will show whether it works, and you ask before it anyway.
If the owner chose read-only, offer the check "Want me to check that your key really can't change anything?" once: with their yes, try to create an empty list called 'access check'. Instantly should refuse. If it does not, say the key is broader than read-only, that an empty list called 'access check' now exists to delete, and that they should replace the key.

## 5. Record it

Write `instantly.access_level` (`read`, `working` or `scale`) in the client's `workspace.yaml`, and one line in `clients/<client>/logs/runs.md`: the date, the old and new level. Change nothing else.

If you cannot create a key for them because their Instantly plan has no API access, say so plainly and stop: "Your Instantly plan doesn't include API keys. You can upgrade, or use sign-in once it is available."
