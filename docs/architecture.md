# Relay architecture

Relay is built around a **three-layer** model that keeps project management, local coordination, and code in sync without replacing your existing tools.

## Three layers

| Layer | Systems | Role |
|-------|--------|------|
| **Official** | Jira, Linear, GitHub Projects | Source of truth for stories, assignments, status |
| **Local** | Relay (SQLite) | Developer coordination: micro-tasks, handoffs, sessions |
| **Code** | Git / GitLab | Branches, commits, MRs/PRs |

- **Official** defines *what* to do (issues, priorities).
- **Local** tracks *how* you’re doing it (sessions, micro-tasks, handoffs).
- **Code** is the actual implementation (branches, commits, MRs).

Relay reads from Official and Code, and writes to Local; it can update Official (e.g. Jira status) when you start or complete a task.

## Components

```
┌─────────────────────────────────────────────────────────────┐
│  IDEs: Cursor (MCP) │ VS Code (extension) │ CLI │ Claude     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  @relay/core                                                 │
│  • MCP server (tools + resources)                            │
│  • WorkflowManager (check-in, start, handoff, complete, EOD) │
│  • Jira client (API token or PAT)                            │
│  • Git client (branch, commits)                              │
└──────────────┬─────────────────────────────┬────────────────┘
               │                               │
┌──────────────▼──────────────┐   ┌───────────▼───────────────┐
│  SQLite (~/.relay/relay.db)  │   │  Jira API / Git (read/write)│
│  work_sessions, micro_tasks, │   │  Issues, transitions       │
│  handoffs, progress_logs     │   │  Branch, commits           │
└─────────────────────────────┘   └────────────────────────────┘
```

## Data flow

- **Morning check-in**: Local DB (handoffs) + Jira (assigned issues) + Git (branch, commits) → single summary.
- **Start task**: Jira (issue details) → Local (session + micro-tasks); Jira status → “In Progress”; Git → suggested branch.
- **Progress**: Local only (progress_logs, micro-task completion); optional commit SHA link.
- **Complete**: Local (session ended); Jira → “Done”; optional MR URL stored.
- **Handoff**: Local (new handoff, session marked handed off); recipient sees it on next check-in.

## Security and privacy

- **Local-first**: All session and handoff data stays in your SQLite DB unless you integrate with a sync service (future).
- **No telemetry**: Relay does not send usage data.
- **Secrets**: Jira tokens and PATs live in environment variables or your shell config; never committed.

## Database schema (summary)

- **developers** — Local identity (id, display_name, optional jira_user_id).
- **work_sessions** — One per “start task” until complete or handoff (jira_issue_key, branch_name, status, total_minutes, merge_request_url).
- **micro_tasks** — Sub-tasks per session (title, status: pending | in_progress | done).
- **handoffs** — Context passed to another developer (from/to, title, what_done, what_next, branch_name, file_list).
- **progress_logs** — Notes and time per session (note, minutes_logged, commit_sha).
- **file_claims** — Optional file ownership to reduce conflicts (future use).

See `packages/core/database/schema.sql` for the full schema.
