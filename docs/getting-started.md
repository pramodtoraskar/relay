# Getting started with Relay

Get from zero to your first task in about 5 minutes.

## Prerequisites

- **Node.js** 18, 20, or 24 (LTS). `better-sqlite3` v12+ provides prebuilt binaries for these versions.
- **Git** (optional; for branch suggestions and commit linking)
- **Jira** (optional; for issue fetch and status updates)

## 1. Install

From the repo:

```bash
git clone https://github.com/relay-dev/relay.git
cd relay
npm install
npm run build
npm run setup
```

Or with the install script (Unix):

```bash
./scripts/setup.sh
```

This creates `~/.relay/` and an example env file. Your local SQLite DB will be at `~/.relay/relay.db`.

## 2. Configure (optional)

For **Jira** (recommended): Set these four variables. `RELAY_JIRA_API_TOKEN` is your **Jira Personal Access Token** (same as in Jira Cloud).

- `RELAY_JIRA_BASE_URL` — e.g. `https://your-domain.atlassian.net`
- `RELAY_JIRA_EMAIL` — your Jira email
- `RELAY_JIRA_API_TOKEN` — Jira Personal Access Token
- `RELAY_DEVELOPER_ID` — a random ID or handle (for handoffs). Generate one: `node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"`. Defaults to `$USER` if unset.

Copy from `~/.relay/env.example` and export in your shell or use a `.env` in your project.

## 3. Run your first check-in

```bash
npx relay checkin
```

You’ll see:

- Pending handoffs (none yet)
- Assigned Jira issues (if configured)
- Current Git branch and recent commits
- Active session (if any)

## 4. Start a task

```bash
npx relay start PROJ-42
```

Replace `PROJ-42` with a real Jira issue key. Relay will:

- Fetch the issue summary (if Jira is configured)
- Create a work session and suggest a branch name
- Create a default micro-task (or use `--tasks "Task A,Task B"`)

Then:

- `npx relay update "Implemented API"` — log progress (uses active session)
- `npx relay complete --url <MR_URL>` — complete the task and optionally link the MR

## 5. Use Relay in your IDE

- **Cursor**: See [Cursor setup](cursor-setup.md) — add the MCP server for tools and resources inside the AI chat.
- **VS Code**: Install the Relay extension and use the command palette, or run `relay` in the integrated terminal.
- **CLI only**: Use `relay` commands from any terminal.

## Next steps

- [User guide](user-guide.md) — daily workflows (check-in, handoffs, EOD).
- [Team setup](team-setup.md) — small team and handoff conventions.
- [Architecture](architecture.md) — how the three layers (Official, Local, Code) fit together.
