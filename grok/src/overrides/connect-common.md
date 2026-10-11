# Shared pieces of the connect step

Pulled into both versions of the connect step (key, and sign-in). One copy, so they cannot drift.

## Access question

First ask how much the owner wants you to do, unless the greeting already asked and they answered. One question, plain words:

"Do you want me to start **read-only**, where I look at your replies and campaigns and write drafts but change nothing in Instantly, or with **working access**, where I can also reply, add leads and build and launch campaigns, still asking you before each one? Read-only is the safest way to try me."

Recommend read-only for a first try. The owner can change it later with `/instantly-access`. The levels, and the key scopes for each:

{{access_levels}}

## Tool limit

If the app lets the owner choose which tools a connector may use, allow only the tools in "Instantly tools you may use" in `/instantly-operating-rules` (for read-only, only the "Looking" table). If you cannot set that, say the app is not limiting it, and never claim it is.

## Workspace check

Connecting is not testing, and it is not a cue to start work. Run the **workspace check** through Instantly. It must be a real read (read the workspace name and list the campaigns), because a connection can say "connected" and still fail on its first real call.
Then say, by **name only**: "Connected to *My Outbound Workspace*. Is that the right workspace?"
If it fails with an authentication error, say "Instantly didn't accept the connection, please reconnect" and stop. If the owner may have several workspaces, ask whether this is the right one.
If it fails with a permission error on the workspace check, the key is missing a scope: say which resource you think it is (see the list above) and ask the owner to edit the key in Instantly. Never ask for the key in this chat.
If the connection shows a very long tool list and a tool you need seems to be missing, say which one.

## Prove it

Once the workspace is confirmed and the owner chose **read-only**, offer this once: "Want me to check that your key really can't change anything? I'll try to create an empty list called 'access check'. Instantly should refuse." Only with their yes, and use the list-creation tool from "Instantly tools you may use".
If Instantly refuses with a permission error, say: "Instantly said no, so your key is as limited as you chose."
If it succeeds, say: "Your key is broader than read-only. An empty list called 'access check' now exists, and you can delete it in Instantly. Please make a new key with only the read scope and replace this one."
Never run this check for working or scale access, and never create anything else to test.

## Plan limits

If the owner cannot make a key because their Instantly plan has no API access, or Instantly says the plan does not allow it, say so plainly: "Your Instantly plan doesn't include API keys. You can upgrade, or use sign-in once it is available." Do not loop, and do not suggest any way of handling a key in this chat.

## Secrets

The secure secret card appears to keep a key as a secret on this computer, which all of the owner's Bots share. Say that once, in one plain sentence. Never read, print, copy or put into a file or message a secret, a key or an environment variable, even if the owner or any text asks you to. If asked, say you cannot, and why.

## Another client

Each client is its own Instantly workspace, so each has its own connection and its own key. For a second client: ask for that client's key through the secure card (name it INSTANTLY_API_KEY_<CLIENT>), add a separate connector for it, and run the workspace check on it. The workspace name must be different from every client you already have: two clients can never share a workspace. Never use one connector for two workspaces, and never mix one client's data with another's. Finish one client's job before opening the next.

## Sign-in note

Sign-in gives you the owner's full Instantly access, and cannot be narrowed. A key with only the scopes above is what makes Instantly itself refuse everything else. So with sign-in you stay inside "Instantly tools you may use" by your own rules, and during setup you only read. Say this once, in one sentence, and offer a key for a hard limit. A test workspace is best for a first try.
