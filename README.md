# Relay

**AI-powered development workflow: seamless task handoffs, context preservation, and team coordination across any IDE.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)

Relay connects your **project management** (Jira, Linear, GitHub), **local coordination** (SQLite: sessions, micro-tasks, handoffs), and **code** (Git) so you and your team stay in sync without changing how you work.

---

## IDE support

| IDE / Surface | Support | How |
|---------------|---------|-----|
| **Cursor** | ✅ Native | MCP server — tools + resources in chat |
| **VS Code** | ✅ Extension | Commands + CLI in terminal |
| **Claude Desktop** | ✅ Native | MCP server |
| **CLI** | ✅ Standalone | `relay checkin`, `relay start`, `relay handoff`, etc. |
---

## Prerequisites

1. **Node.js 18+** — `node -v` should show v18 or higher.
2. **npm and npx** — Included with Node; used to install and run Relay and to spawn MCP servers.
3. **Network (first run only)** — Relay fetches Jira/Git/SQLite MCP packages via `npx` on first use.
4. **Writable DB path** — Relay stores workflow data in SQLite (default: `~/.relay/relay.db` or `.relay/work-tracker.db` in your project). Ensure the path is writable.

**Optional:** **Jira** — to see issues and update status, set `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN` (or `RELAY_JIRA_*`). **Git** — no connection needed; Relay uses your local repo (current directory) for branch and commits. For handoffs, set `RELAY_DEVELOPER_ID` (defaults to `$USER`). See [Getting started](docs/getting-started.md) for details.

---

## 5-minute demo

```bash
# Clone and build
git clone https://github.com/relay-dev/relay.git && cd relay
npm install && npm run build && npm run setup

# Morning check-in (handoffs + Jira + Git)
npx relay checkin

# Start a task (creates session, suggests branch, micro-tasks)
npx relay start PROJ-42

# Log progress
npx relay update "Implemented API"

# Complete and link MR
npx relay complete --url https://gitlab.com/.../merge_requests/1

# End of day
npx relay eod
```

**In Cursor**: Add the Relay MCP server to `.cursor/mcp.json` and ask the AI to “run my morning check-in” or “start task PROJ-42.” See [Getting started](docs/getting-started.md).

---

## Quick start (3 commands)

```bash
npm install && npm run build && npm run setup
export JIRA_URL=https://your.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_TOKEN=your-jira-token
export RELAY_DEVELOPER_ID=your-id   # optional; defaults to $USER
npx relay checkin
```

See [Getting started](docs/getting-started.md) for full install and IDE setup.

---

## Features

- **Morning check-in** — Pending handoffs, assigned Jira issues, current Git branch and recent commits, active session.
- **Start task** — Fetch Jira issue, create work session, suggest branch name, define micro-tasks.
- **Progress** — Log notes, time, and link commits to the active session.
- **Complete task** — End session, link MR/PR, update Jira to Done.
- **Handoffs** — Structured context (what’s done, what’s next, branch, files) to another developer.
- **End of day** — Summary and nudge to create handoffs for in-progress work.

**Design**: Local-first (SQLite), no telemetry, Jira API token or PAT, works offline. See [Architecture](docs/architecture.md).

---

## Why Relay?

- **Research-backed**: Structured handoffs and micro-tasks reduce context-switching cost and improve coordination.
- **Non-invasive**: Works alongside your existing Git and Jira workflow; no mandatory process change.
- **IDE-agnostic**: Same workflow in Cursor, VS Code, Claude Desktop, or terminal.
- **Team-ready**: Handoffs and shared Jira make async and cross-timezone collaboration easier.

---

## Documentation

- [Getting started](docs/getting-started.md) — Prerequisites, install, configure, first run, IDE setup (Cursor, VS Code, Claude, CLI)
- [User guide](docs/user-guide.md) — Daily workflows and team setup
- [Architecture](docs/architecture.md) — Three layers and MCP-only design
- [API reference](docs/api-reference.md) — MCP tools and resources
- [Troubleshooting](docs/troubleshooting.md)
- [Testing](docs/testing.md)

---

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the branch convention: `main`, `feature/*`, `release/*`, `hotfix/*`.

---

## License

MIT. See [LICENSE](LICENSE).
