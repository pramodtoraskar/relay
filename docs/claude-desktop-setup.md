# Relay + Claude Desktop setup

Claude Desktop supports MCP servers. You can attach Relay so Claude can run morning check-in, start tasks, create handoffs, and read your active tasks and pending handoffs.

## 1. Build Relay

From the Relay repo:

```bash
npm install && npm run build
```

## 2. Claude Desktop MCP config

Edit the MCP config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add Relay under `mcpServers`:

```json
{
  "mcpServers": {
    "relay": {
      "command": "node",
      "args": ["/absolute/path/to/relay/packages/core/dist/run-mcp.js"],
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

Or with npx (no local path):

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

Use the real path to your Relay clone in place of `/absolute/path/to/relay`.

## 3. Restart Claude Desktop

Quit and reopen Claude Desktop so it loads the Relay MCP server.

## 4. Use with Claude

You can ask Claude to:

- “Run my Relay morning check-in.”
- “Start Relay task PROJ-42.”
- “Create a Relay handoff to alice for the login feature.”
- “What’s my Relay end-of-day summary?”

Claude will call the Relay tools and show you the results. Resources (active tasks, pending handoffs, metrics) are also available if Claude Desktop exposes them in the UI.

## Troubleshooting

- **Server not listed**: Check the config path and that `run-mcp.js` exists (or that `npx @relay/core` runs).
- **Jira/identity**: Ensure env vars are set in the `relay` server’s `env` block; they are not read from your shell when Claude starts the server.
