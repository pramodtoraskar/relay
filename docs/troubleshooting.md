# Troubleshooting

## CLI / MCP

### “No active session” when running update or complete

- You must run **`relay start PROJ-42`** first (or have an active session from a previous start). Only one active session per developer is tracked.
- To complete a specific session: **`relay complete <session_id>`** (session id is shown when you run `relay start`).

### Jira issues not showing in check-in

- Confirm **RELAY_JIRA_BASE_URL** has no trailing slash (e.g. `https://your.atlassian.net`).
- Set **RELAY_JIRA_EMAIL** and **RELAY_JIRA_API_TOKEN** (Jira Personal Access Token).
- Check network and Jira permissions (read issues, transitions).

### Handoffs not visible to recipient

- Handoffs are stored in the **sender’s** SQLite DB. The **recipient** sees them only when they run Relay (e.g. `relay checkin`) and their `RELAY_DEVELOPER_ID` matches the **to_developer_id** of the handoff.
- Ensure both use the same convention for developer id (e.g. Slack handle). There is no central server; “delivery” is the recipient’s next check-in on their machine.
- **Solo developer:** If you hand off to yourself but don’t see it at check-in, the handoff was created with a different id (e.g. `"me"`). Create handoffs with **To** = your actual `RELAY_DEVELOPER_ID` so they show under “Pending handoffs.”

### MCP server not loading in Cursor / Claude

- **Path**: In `mcp.json`, the `args` path to `run-mcp.js` must be absolute and correct. Prefer **`npx -y @relay/core`** so you don’t depend on a local path.
- **Env**: Jira and developer id must be in the MCP server’s `env` block; they are not inherited from your shell.
- **Restart**: Fully quit and restart the IDE / Claude Desktop after changing MCP config.

### Database locked or permission denied

- **RELAY_DB_PATH** must point to a path where you can create and write a file (e.g. `~/.relay/relay.db`). On locked-down machines, set it to an allowed directory.
- Only one process should write to the same DB at a time; avoid running multiple Relay CLI/MCP instances with the same **RELAY_DB_PATH** if they write concurrently.

## VS Code extension

- Commands open a terminal and run **relay**; ensure **relay** or **npx relay** is in the terminal PATH.
- If the extension doesn’t appear, build it from `packages/vscode` (**npm run build**) and install or run via F5.

## Build / develop

- **Node**: Relay requires Node 18+.
- **Workspaces**: From repo root, **npm install** and **npm run build** build all packages. **packages/cli** depends on **@relay/core** via workspace; linking or running from repo uses the local core.
