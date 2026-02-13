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
| **JetBrains** | 🔜 Planned | Plugin |
| **Web dashboard** | 🔜 Planned | React app |

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

**In Cursor**: Add the Relay MCP server to `.cursor/mcp.json` and ask the AI to “run my morning check-in” or “start task PROJ-42.” See [Cursor setup](docs/cursor-setup.md).

---

## Quick start (3 commands)

```bash
npm install && npm run build && npm run setup
export RELAY_JIRA_BASE_URL=https://your.atlassian.net
export RELAY_JIRA_EMAIL=you@example.com
export RELAY_JIRA_API_TOKEN=your-jira-personal-access-token   # Jira PAT
export RELAY_DEVELOPER_ID=your-id   # random ID or handle
npx relay checkin
```

Configure Jira (optional) and set `RELAY_DEVELOPER_ID` (e.g. random ID or handle) for handoffs. Full guide: [Getting started](docs/getting-started.md).

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

- **Research-backed**: Structured handoffs and micro-tasks reduce context-switching cost and improve coordination (see [Scientific backing](docs/scientific-backing.md)).
- **Non-invasive**: Works alongside your existing Git and Jira workflow; no mandatory process change.
- **IDE-agnostic**: Same workflow in Cursor, VS Code, Claude Desktop, or terminal.
- **Team-ready**: Handoffs and shared Jira make async and cross-timezone collaboration easier.

---

## Installation by IDE

| IDE | Guide |
|-----|-------|
| **Cursor** | [cursor-setup.md](docs/cursor-setup.md) — MCP config + prompts |
| **VS Code** | [vscode-setup.md](docs/vscode-setup.md) — Extension or CLI |
| **Claude Desktop** | [claude-desktop-setup.md](docs/claude-desktop-setup.md) — MCP config |
| **CLI only** | [cli-setup.md](docs/cli-setup.md) |

---

## Documentation

- [Getting started](docs/getting-started.md) — 5-minute setup
- [Architecture](docs/architecture.md) — Three layers (Official, Local, Code)
- [User guide](docs/user-guide.md) — Daily workflows
- [Team setup](docs/team-setup.md) — Multi-developer configuration
- [API reference](docs/api-reference.md) — MCP tools and resources
- [Troubleshooting](docs/troubleshooting.md)
- [Testing (step-by-step)](docs/testing.md)

---

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the branch convention: `main`, `feature/*`, `release/*`, `hotfix/*`.

---

## License

MIT. See [LICENSE](LICENSE).
