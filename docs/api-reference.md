# Relay API reference

## MCP server (Relay as MCP)

When Relay runs as an MCP server (Cursor, Claude Desktop), it exposes:

### Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `morning_checkin` | Pending handoffs, assigned issues, Git, active session | `developer_id?` |
| `start_task` | Start work on Jira issue; create session and micro-tasks | `issue_key`, `micro_tasks?`, `developer_id?` |
| `update_progress` | Log note, time, commit; optionally mark micro-task done | `session_id`, `note?`, `minutes_logged?`, `commit_sha?`, `complete_micro_task_id?` |
| `complete_task` | End session, optional MR URL and total minutes; update Jira to Done | `session_id`, `merge_request_url?`, `total_minutes?` |
| `create_handoff` | Create handoff to another developer | `to_developer_id`, `title`, `context_summary?`, `what_done?`, `what_next?`, `branch_name?`, `file_list?`, `blockers_notes?`, `work_session_id?`, `from_developer_id?` |
| `end_of_day` | EOD summary and reminder to create handoffs | `developer_id?` |

### Resources

| URI | Description |
|-----|-------------|
| `relay:///active-tasks` | Current work session (JSON: sessionId, jiraKey or “No active session”) |
| `relay:///pending-handoffs` | Handoffs for current developer (JSON array) |
| `relay:///metrics` | Summary counts (activeSession, pendingHandoffsCount) |

Current developer is taken from `RELAY_DEVELOPER_ID` or `USER`.

---

For programmatic use, see `packages/core/src` (WorkflowManager, McpClientsManager, McpDbAdapter) and TypeScript types.
