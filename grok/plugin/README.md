# Instantly Bot plugin (Cursor format)

The Instantly skills plus a connection to Instantly's MCP server, in the layout Cursor's plugin marketplace expects:

```
.cursor-plugin/plugin.json   the manifest (name, version, the API key variable)
mcp.json                     Instantly's MCP server, working access: the key comes from INSTANTLY_API_KEY
mcp.read-only.json           the same with only the reading tools (use with an `all:read` key)
mcp.scale.json                working access plus buying (use only with a scale key)
mcp.oauth.example.json       sign-in instead of a key, working access
skills/<name>/SKILL.md       generated: do not edit (run `npm run build:grok` in the repo root)
```

## What the user enters

One value: an **Instantly API key** (`INSTANTLY_API_KEY`), entered under the plugin's **Configure** screen, never in a chat.
For a first try use a read-only key (scope `all:read`): create it at app.instantly.ai/app/settings/integrations, API Keys.

If Instantly's sign-in works for the app (see `../README.md`), use `mcp.oauth.example.json` instead of `mcp.json` and remove the key variable. That gives one-click sign-in and no key at all.

All three configs carry an `enabledTools` allowlist, generated from `../access.yaml` (do not edit them by hand: run `npm run build:grok`). Whether the Grok Bot app honors `enabledTools` is not yet tested: see `../README.md`, test 7.

## Before submitting to Cursor's marketplace

Cursor's terms say a plugin must be **free to users and under a permissive open-source license**, and it reviews every submission by hand with no published timeline.

- [ ] Choose a license and add it (both a `LICENSE` file and `"license"` in `plugin.json`). This repo has none yet. That is a decision for the Instantly team.
- [ ] Change `author` in `plugin.json` to the real publisher, and add a logo if wanted.
- [ ] The plugin has to live in a public repo that Cursor can read. Either submit this repo with a root `.cursor-plugin/marketplace.json` (the format is in Cursor's docs, not included here), or copy this folder into its own repository.
- [ ] Submit at cursor.com/marketplace/publish. Cursor staff also point to cursor.directory, which has a separate queue.
- [ ] Reconfirm that a plugin from Cursor's marketplace shows up inside Grok Bot's Plugins list. Documentation implies it but never states it.

No license is set on purpose.
