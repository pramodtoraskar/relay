# Getting started with Relay

Get from zero to your first task in about 5 minutes.

## Prerequisites

- **Required**: Node.js 18+, npm (and npx), network on first run (to fetch MCP packages), writable path for the workflow SQLite DB (default: `~/.relay/relay.db` or `.relay/work-tracker.db` in project).
- **Optional**: **Jira** — set `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN` (or `RELAY_JIRA_*`) for issues and status updates. To use **already-running** Jira/Git MCP servers (no npm fetch): set **`RELAY_JIRA_MCP_URL`** and **`RELAY_GIT_MCP_URL`** (or **`RELAY_GITLAB_MCP_URL`**) to their Streamable HTTP URLs. **Git** — if not using a URL, Relay spawns a Git MCP for your local repo (branch and commits). **Handoffs** — set `RELAY_DEVELOPER_ID` (defaults to `$USER`).

## 1. Install

```bash
git clone https://github.com/relay-dev/relay.git && cd relay
npm install && npm run build && npm run setup
```

Or download ZIP, extract, then the same commands from the extracted folder. This creates `~/.relay/` and an example env file.

## 2. Configure (optional)

For **Jira**: set `JIRA_URL` (or `RELAY_JIRA_BASE_URL`), `JIRA_EMAIL`, `JIRA_TOKEN` (or `RELAY_JIRA_API_TOKEN`). For **handoffs**: set `RELAY_DEVELOPER_ID` to a stable id (e.g. `node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"`). Copy from `~/.relay/env.example` and export in your shell or use a `.env` in your project.

## 3. First run

```bash
npx relay checkin
```

You’ll see pending handoffs, assigned Jira issues (if configured), current branch and recent commits, and active session. Then:

- `npx relay start PROJ-42` — start a task (replace with your issue key)
- `npx relay update "Implemented API"` — log progress
- `npx relay complete --url <MR_URL>` — complete and optionally link the MR
- `npx relay eod` — end-of-day summary

## 4. IDE setup

**Cursor** — Add Relay as an MCP server. Edit `~/.cursor/mcp.json` (macOS) or `%USERPROFILE%\.cursor\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["-y", "@relay/core"],
      "env": {
        "RELAY_DEVELOPER_ID": "your-id",
        "RELAY_JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "RELAY_JIRA_EMAIL": "you@example.com",
        "RELAY_JIRA_API_TOKEN": "your-jira-pat"
      }
    }
  }
}
```

**If using URL-based Jira/GitLab MCP:** Add `RELAY_JIRA_MCP_URL` and `RELAY_GIT_MCP_URL` (or `RELAY_GITLAB_MCP_URL`) to the `relay.env` block above with your MCP server URLs. Cursor only passes this `env` to Relay — not your shell or `.env` — so Relay will not see those variables unless they are in `mcp.json`.

Restart Cursor. In chat you can ask: “Run my morning check-in”, “Start task PROJ-42”, etc. To disable Jira: set `RELAY_JIRA_MCP_DISABLED=1` in `env`.

**VS Code** — Use the Relay extension (Command Palette → “Relay: Morning check-in”, etc.) or run `npx relay checkin` in the integrated terminal. Ensure `relay` or `npx relay` is in PATH.

**Claude Desktop** — Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Add the same `relay` entry under `mcpServers` as for Cursor, then restart Claude.

**CLI only** — From repo root: `npx relay checkin`, `npx relay start PROJ-42`, etc. Or `cd packages/cli && npm link` then run `relay` from any directory.

## Role-aware assistance

Relay exposes **persona roles** (Engineer, Analyst, Scientist, Manager, Product/Process Manager) so the coding-assistance model can tailor help. In Cursor/Claude, say e.g. “I’m an analyst” or “run a check-in for a manager”; the model can call `show_roles`, `get_guidance`, `role_aware_checkin`, and `suggest_next` to adapt workflows and MCP usage to your role. See [API reference – Role-aware workflows](api-reference.md#role-aware-workflows).

## Next steps

- [User guide](user-guide.md) — daily workflows (check-in, handoffs, EOD).
- [Architecture](architecture.md) — three layers and MCP-only design.
- [Troubleshooting](troubleshooting.md) — common issues.
