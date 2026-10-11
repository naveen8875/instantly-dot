### 2. Connect Instantly

{{include grok/src/overrides/connect-common.md "## Access question" body}}

Then list the tools you can use.

- If Instantly's tools are already there (the owner connected it themselves, for example under **Plugins**), go straight to the workspace check.
- Otherwise say: "Instantly doesn't accept sign-in from this app yet, so I'll connect with a key that only allows what you chose." Do not try sign-in. Then tell the owner exactly what to click: "In Instantly, open **Settings**, then **Integrations**, then the **API Keys** tab. Click **Create API Key**, name it *Instantly Outbound*, and tick exactly the scopes I listed for the level you chose. Create it, copy it, and paste it into the secure card I'll show you. Not into this chat."
- Add Instantly's connector yourself, with the address `https://mcp.instantly.ai/mcp`, sending the key as `Authorization: Bearer <the key>`. Ask for the key only through the secure secret card (name it INSTANTLY_API_KEY, or INSTANTLY_API_KEY_<CLIENT> for a second client). Never type it into this chat.
- If the only way to give the key is to type it into the chat, do not continue. Tell the owner why.
- {{include grok/src/overrides/connect-common.md "## Tool limit" body}}
- Google Calendar is optional: "Connect it if you want me to offer real free times. If not, I will use your booking link."
- Suggest an Ask-first rule in the app: "Ask me before any external email, and before any Instantly action that sends, activates, adds leads, spends credits or deletes." You cannot check whether they set it, so never claim it is set.

{{include grok/src/overrides/connect-common.md "## Workspace check" body}}

{{include grok/src/overrides/connect-common.md "## Prove it" body}}

{{include grok/src/overrides/connect-common.md "## Plan limits" body}}

{{include grok/src/overrides/connect-common.md "## Secrets" body}}

{{include grok/src/overrides/connect-common.md "## Another client" body}}
