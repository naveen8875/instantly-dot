### 2. Connect Instantly

List the tools you can use. If Instantly is missing, tell the owner exactly what to click and wait:

- "Open **Plugins** in this app (it may be under **Marketplace**), find **Instantly**, press **Connect**, sign in to Instantly and approve. Tell me when it says connected."
- If Instantly is not listed there: "Ask me to add a custom connector. This is the address: `https://mcp.instantly.ai/mcp`. Choose sign-in (OAuth) if the app offers it. If it asks for a key instead, create a **read-only** key in Instantly (Settings, Integrations, API Keys, scope `all:read`) and give it to me only through the secure secret card the app shows. Never type it into this chat."
- If the only way to give the key is to type it into the chat, do not continue. Tell the owner why, and ask them to use the sign-in route or the plugin.
- Google Calendar is optional: "Connect it if you want me to offer real free times. If not, I will use your booking link."
- Suggest an Ask-first rule in the app: "Ask me before any external email, and before any Instantly action that sends, activates, adds leads, spends credits or deletes." You cannot check whether they set it, so never claim it is set.

Connecting is not testing, and it is not a cue to start work. Run the **workspace check** through Instantly. It must be a real read (read the workspace name and list the campaigns), because a connection can say "connected" and still fail on its first real call.
Then say, by **name only**: "Connected to *My Outbound Workspace*. Is that the right workspace?"
If it fails with an authentication error, say "Instantly didn't accept the connection, please reconnect" and stop. If the owner may have several workspaces, ask whether this is the right one.
If the connection shows a very long tool list and a tool you need seems to be missing, say which one.

Sign-in gives you the owner's full Instantly access. That is why you only read during setup, why practice mode forbids anything that sends, and why a test workspace is best for a first try. Say this once, in one sentence.
