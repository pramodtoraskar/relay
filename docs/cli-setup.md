# Relay CLI setup

The Relay CLI runs in any terminal and works with or without an IDE.

## Install

**From repo (development):**

```bash
git clone https://github.com/relay-dev/relay.git
cd relay
npm install && npm run build
npm run setup
```

Then run via npx from repo root:

```bash
npx relay checkin
```

Or link the CLI globally:

```bash
cd packages/cli && npm link
relay checkin
```

**From npm (when published):**

```bash
npm install -g @relay/cli
relay checkin
```

Or without global install:

```bash
npx @relay/cli checkin
```

## Commands

| Command | Description |
|--------|-------------|
| `relay checkin` | Morning check-in: handoffs, Jira issues, Git, active session |
| `relay start <issue_key>` | Start work on PROJ-42 (creates session, suggests branch) |
| `relay start PROJ-42 --tasks "A,B,C"` | Start with custom micro-tasks |
| `relay update <message>` | Log progress (uses active session) |
| `relay update "Fixed bug" --minutes 30 --commit abc123` | With time and commit |
| `relay complete` | Complete active session |
| `relay complete --url <MR_URL> --minutes 120` | With MR link and time |
| `relay handoff` | Interactive handoff to another developer |
| `relay handoff --to alice --title "Auth work"` | Non-interactive |
| `relay eod` | End-of-day summary |

## Environment variables

| Variable | Description |
|----------|-------------|
| `RELAY_DB_PATH` | SQLite DB path (default: `~/.relay/relay.db`) |
| `RELAY_DEVELOPER_ID` | Your id for handoffs — use a random ID or handle (default: `$USER`) |
| `RELAY_JIRA_BASE_URL` | Jira base URL (e.g. `https://foo.atlassian.net`) |
| `RELAY_JIRA_EMAIL` | Jira email |
| `RELAY_JIRA_API_TOKEN` | Jira Personal Access Token |
| `RELAY_REPO_ROOT` | Git repo root (default: cwd) |

## First run

1. `relay checkin` — confirms DB and shows empty state or Jira issues.
2. `relay start PROJ-42` — creates a session; do work.
3. `relay update "Done with API"` — logs progress.
4. `relay complete --url https://gitlab.com/.../merge_requests/1` — closes session and optionally links MR.

No Jira? You can still use `relay start PROJ-42`; the session will have that key and a generic summary. Configure Jira later for status updates and issue fetch.
