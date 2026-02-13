# Relay + Cursor setup

Cursor can run Relay as an **MCP (Model Context Protocol) server**, so the AI has access to your tasks, handoffs, and metrics via tools and resources.

## 1. Build Relay

From the repo root:

```bash
npm install && npm run build
```

## 2. Add MCP config

Create or edit **Cursor MCP config**:

- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

Add a Relay server entry:

```json
{
  "mcpServers": {
    "relay": {
      "command": "node",
      "args": ["/path/to/relay/packages/core/dist/run-mcp.js"],
      "env": {
        "RELAY_JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "RELAY_JIRA_EMAIL": "you@example.com",
        "RELAY_JIRA_API_TOKEN": "your-jira-personal-access-token",
        "RELAY_DEVELOPER_ID": "your-id"
      }
    }
  }
}
```

Or use `npx` so you don’t need the repo path:

```json
{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["-y", "@relay/core"],
      "env": {
        "RELAY_JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "RELAY_JIRA_EMAIL": "you@example.com",
        "RELAY_JIRA_API_TOKEN": "your-jira-personal-access-token",
        "RELAY_DEVELOPER_ID": "your-id"
      }
    }
  }
}
```

Replace `/path/to/relay` with your actual clone path, or rely on `npx` and env vars.

## 3. Restart Cursor

Restart Cursor (or reload the window) so it picks up the new MCP server.

## 4. Use in chat

In Cursor chat you can ask the AI to:

- “Run my morning check-in” → uses `morning_checkin` tool
- “Start task PROJ-42” → uses `start_task`
- “Update progress: fixed login bug” → uses `update_progress`
- “Complete the current task with MR link …” → uses `complete_task`
- “Create a handoff to @alice for the auth work” → uses `create_handoff`
- “End of day summary” → uses `end_of_day`

The AI can also read **resources**:

- `relay:///active-tasks` — current work session
- `relay:///pending-handoffs` — handoffs waiting for you
- `relay:///metrics` — active session + handoff count

## 5. Prompts (optional)

You can add pre-built prompts under your project’s `.cursor/prompts/`, for example:

- **Morning check-in** — “Run morning check-in and list my top 3 priorities.”
- **Start task** — “Start task PROJ-42 and break it into 3 micro-tasks.”
- **EOD** — “Run end-of-day and suggest handoffs for any active work.”

## Troubleshooting

- **“Relay server not found”**: Ensure `run-mcp.js` path is correct or use `npx -y @relay/core`.
- **Jira not loading**: Check `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, `RELAY_JIRA_API_TOKEN` (Jira PAT) in `mcp.json`; no trailing slash on base URL.
- **No handoffs**: Handoffs are stored locally; the recipient must run check-in on the same machine (or sync in a future version).
