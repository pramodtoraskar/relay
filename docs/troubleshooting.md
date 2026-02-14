# Troubleshooting

## CLI / MCP

### 404 Not Found and “Access token expired” when running check-in

- **@red-hat/jira-mcp** and **@modelcontextprotocol/server-git** are not on the public npm registry (Jira MCP is Red Hat internal; Git MCP may be under a different name or registry). So `npx relay checkin` can show 404s and “Access token expired” while it tries to start those MCPs. Check-in still completes; Jira and Git sections are just empty.
- **Quiet check-in (no 404s):** disable the optional MCPs. In the project root create or edit **`.env`** and add:
  ```bash
  RELAY_JIRA_MCP_DISABLED=1
  RELAY_GIT_MCP_DISABLED=1
  ```
  Or run: `RELAY_JIRA_MCP_DISABLED=1 RELAY_GIT_MCP_DISABLED=1 npx relay checkin`
- **“Access token expired”** is from npm (e.g. a revoked or expired registry token). It doesn’t block check-in; fix with `npm login` or by removing any custom `npm config set //registry.npmjs.org/:_authToken` if you don’t need it.

### “No active session” when running update or complete

- You must run **`relay start PROJ-42`** first (or have an active session from a previous start). Only one active session per developer is tracked.
- To complete a specific session: **`relay complete <session_id>`** (session id is shown when you run `relay start`).

### Jira MCP: 404 Not Found / Connection closed (`@red-hat/jira-mcp`)

- Relay starts a Jira MCP server via **`npx -y @red-hat/jira-mcp`** unless you point it at an already-running server. If that package is not on the registry you use (e.g. private npm) or you want to run without Jira:
  - **Connect to a Jira MCP by URL (recommended):** set **`RELAY_JIRA_MCP_URL`** to the server’s Streamable HTTP URL. Can be **local** (e.g. `http://localhost:4001`) or **hosted** (e.g. `https://mcp.your-company.com/jira`). Relay connects with `Accept: application/json, text/event-stream` to avoid **406 Not Acceptable** from strict MCP servers. No 404, no fetch.
  - **Disable Jira MCP:** set **`RELAY_JIRA_MCP_DISABLED=1`**. Check-in and start/complete will work; assigned issues will be empty and Jira won’t be updated.
  - **Use a local or different Jira MCP (spawn):** set **`RELAY_JIRA_MCP_COMMAND`** and **`RELAY_JIRA_MCP_ARGS`**. Examples: `node` + `/path/to/run.js`, or Python: `/path/to/venv/bin/python` + `/path/to/jira-mcp/server.py`. Relay passes **JIRA_URL**, **JIRA_TOKEN**, and **JIRA_API_TOKEN** (same value) to the subprocess so MCPs that expect **JIRA_API_TOKEN** work. Put these in `.env` in the project; the CLI loads `.env` from the current directory.
  - If Jira MCP fails to start (e.g. package missing, network error), Relay now treats it as **non-fatal**: check-in still runs with “Assigned Jira issues: None (or Jira not configured).” You no longer get “Connection closed” from the Relay MCP for Jira failures.

### Git MCP: 404 Not Found (`@modelcontextprotocol/server-git`)

- Relay starts a Git MCP server via **`npx -y @modelcontextprotocol/server-git`** unless you point it at an already-running server. If that package is not in your registry or you want to run without it:
  - **Connect to a Git/GitLab MCP by URL:** set **`RELAY_GIT_MCP_URL`** (or **`RELAY_GITLAB_MCP_URL`**) to the server’s Streamable HTTP URL. Can be local or hosted.
  - **Run a local stdio Git/GitLab MCP (e.g. podman container):** set **`RELAY_GIT_MCP_COMMAND`** and **`RELAY_GIT_MCP_ARGS`** (comma-separated). Example for RH-GITLAB-MCP: `RELAY_GIT_MCP_COMMAND=podman`, `RELAY_GIT_MCP_ARGS=run,-i,--rm,--env-file,/path/to/.rh-gitlab-mcp.env,localhost/rh-gitlab-mcp:latest`. Relay will spawn that process and talk over stdio.
  - **Disable Git MCP:** set **`RELAY_GIT_MCP_DISABLED=1`**. Check-in and start/complete will work; branch and recent commits will not be shown.

### Relay not connecting to Jira or GitLab MCP (workflow / orchestration)

If your Jira and GitLab MCP servers work when used directly but Relay check-in shows "None" for issues and Git:

1. **Cursor / IDE:** Relay runs as a separate process started by Cursor. It only receives environment variables from the **Relay MCP server’s `env`** in `~/.cursor/mcp.json`. Your shell `export` or project `.env` are **not** passed. So you must set **`RELAY_JIRA_MCP_URL`** and **`RELAY_GIT_MCP_URL`** (or **`RELAY_GITLAB_MCP_URL`**) in the **`relay`** server’s `env` in `mcp.json`. Example:
   ```json
   "relay": {
     "command": "npx",
     "args": ["-y", "@relay/core"],
     "env": {
       "RELAY_DB_PATH": "${workspaceFolder}/.relay/work-tracker.db",
       "RELAY_JIRA_MCP_URL": "http://localhost:4001",
       "RELAY_GIT_MCP_URL": "http://localhost:4002"
     }
   }
   ```
   Use your actual URLs (and ports) where the Jira and GitLab MCP servers listen (Streamable HTTP).
2. **CLI:** For `npx relay checkin`, Relay loads `.env` from the current directory. Put `RELAY_JIRA_MCP_URL` and `RELAY_GIT_MCP_URL` in that `.env`, or `export` them in the shell before running.
3. **Protocol:** Relay connects via **Streamable HTTP** (MCP SDK `StreamableHTTPClientTransport`). Your Jira and GitLab MCP servers must expose that endpoint (not only stdio). If they use a different path (e.g. `/sse`), include it in the URL (e.g. `http://localhost:4001/sse`).
4. **Restart:** After changing `mcp.json`, fully quit and restart Cursor so the Relay MCP process is restarted with the new env.

### Jira issues not showing in check-in

- Confirm **RELAY_JIRA_BASE_URL** has no trailing slash (e.g. `https://your.atlassian.net`).
- Set **RELAY_JIRA_EMAIL** and **RELAY_JIRA_API_TOKEN** (Jira Personal Access Token).
- Check network and Jira permissions (read issues, transitions).
- If Jira MCP is disabled (see above), issues will not show; that is expected.

### Handoffs not visible to recipient

- Handoffs are stored in the **sender’s** SQLite DB. The **recipient** sees them only when they run Relay (e.g. `relay checkin`) and their `RELAY_DEVELOPER_ID` matches the **to_developer_id** of the handoff.
- Ensure both use the same convention for developer id (e.g. Slack handle). There is no central server; “delivery” is the recipient’s next check-in on their machine.
- **Solo developer:** If you hand off to yourself but don’t see it at check-in, the handoff was created with a different id (e.g. `"me"`). Create handoffs with **To** = your actual `RELAY_DEVELOPER_ID` so they show under “Pending handoffs.”

### “Connection closed” when calling Relay MCP (e.g. morning check-in)

- This usually means the Relay MCP process exited or lost its stdio connection. Relay now keeps running if Jira or Git MCP fail to start; only SQLite MCP is required.
- If you see **“SQLite MCP failed to start”** in the tool error, install **mcp-sqlite** (`npx -y mcp-sqlite` should work) and ensure **RELAY_DB_PATH** (or **DATABASE_PATH** in MCP `env`) points to a writable path; the parent directory is created if missing.
- Ensure only one Relay MCP process uses the same DB path. Restart Cursor after changing MCP config.

### MCP server not loading in Cursor / Claude

- **Path**: In `mcp.json`, the `args` path to `run-mcp.js` must be absolute and correct. Prefer **`npx -y @relay/core`** so you don’t depend on a local path.
- **Env**: Jira and developer id must be in the MCP server’s `env` block; they are not inherited from your shell.
- **Restart**: Fully quit and restart the IDE / Claude Desktop after changing MCP config.

### Database locked or permission denied

- **RELAY_DB_PATH** must point to a path where you can create and write a file (e.g. `~/.relay/relay.db`). Default is `.relay/work-tracker.db` in the current directory; Relay creates the directory if missing. On locked-down machines, set **RELAY_DB_PATH** to an allowed directory.
- Only one process should write to the same DB at a time; avoid running multiple Relay CLI/MCP instances with the same **RELAY_DB_PATH** if they write concurrently.

## VS Code extension

- Commands open a terminal and run **relay**; ensure **relay** or **npx relay** is in the terminal PATH.
- If the extension doesn’t appear, build it from `packages/vscode` (**npm run build**) and install or run via F5.

## Build / develop

- **Node**: Relay requires Node 18+.
- **Workspaces**: From repo root, **npm install** and **npm run build** build all packages. **packages/cli** depends on **@relay/core** via workspace; linking or running from repo uses the local core.
