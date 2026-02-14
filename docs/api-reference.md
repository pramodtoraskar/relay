# Relay API reference

## MCP server (Relay as MCP)

When Relay runs as an MCP server (Cursor, Claude Desktop), it exposes:

### Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `whats_up`, `status_check`, `get_context` | What's up? / Status check / Get context. Pending handoffs, assigned issues, Git, active session | `dev_name?` |
| `start_task`, `begin_work` | Start task / Begin work on Jira issue; create session and micro-tasks | `task_id`, `dev_name`, `micro_tasks?` |
| `log_work`, `update_status` | Log work / Update status. Note, time, commit; optionally mark micro-task done | `session_id`, `note?`, `minutes_logged?`, `commit_sha?`, `complete_micro_task_id?` |
| `complete_task`, `finish_task` | Complete / finish task; end session, optional MR URL and total minutes; update Jira to Done | `session_id`, `merge_request_url?`, `total_minutes?` |
| `handoff_task`, `transfer_to` | Handoff task / Transfer to. Create handoff to another developer | `to_developer_id`, `title`, `context_summary?`, `what_done?`, `what_next?`, `branch_name?`, `file_list?`, `blockers_notes?`, `work_session_id?`, `from_developer_id?` |
| `end_session`, `pause_session`, `resume_session`, `session_summary` | End session / Pause / Resume / Session summary. EOD-style summary and handoff reminders | `dev_name?` |
| `query_jira` | Query Jira. Call any Jira MCP (jiraMcp) tool by name | `tool_name`, `arguments?` (object) |
| `query_gitlab` | Query GitLab. Call any GitLab MCP (RH-GITLAB-MCP) tool by name | `tool_name`, `arguments?` (object) |
| `list_jira_mcp_tools` | List tools exposed by the Jira MCP | — |
| `list_gitlab_mcp_tools` | List tools exposed by the GitLab MCP | — |
| `show_roles` | Show roles. List persona roles (Engineer, Analyst, Scientist, Manager, Product/Process) | — |
| `get_guidance` | Get guidance for a role so the coding model can tailor help (needs, Relay + MCP tools, example prompts) | `role` (engineer \| analyst \| scientist \| manager \| product_process) |
| `role_aware_checkin` | Status check with role-specific emphasis and suggested focus | `role`, `dev_name?` |
| `suggest_next` | Suggest next actions for the role using Relay and MCP (handoffs, start task, GitLab, etc.) | `role`, `context?`, `dev_name?` |
| `active_tasks` | Show active tasks (current work session) | `dev_name?` |
| `pending_handoffs` | Show pending handoffs | `dev_name?` |
| `show_metrics` | Show metrics (session and handoff counts) | `dev_name?` |

Use `list_jira_mcp_tools` and `list_gitlab_mcp_tools` to discover available tool names, then call them with `query_jira` or `query_gitlab` to utilise all tools from those MCPs.

### Role-aware workflows

Relay defines five **persona roles** so the coding-assistance model can tailor workflows and MCP usage:

| Role id | Persona | Typical focus |
|---------|---------|----------------|
| `engineer` | Engineer | Jira + Git/GitLab (branch, MRs, pipelines); start/complete task, handoffs |
| `analyst` | Analyst | Jira issues and acceptance criteria; handoffs; optional Git |
| `scientist` | Scientist | Experiments, reproducibility (branch/commits), Jira for tracking |
| `manager` | Manager | Pending handoffs, team/sprint status; Jira board/search by assignee |
| `product_process` | Product / Process Manager | Backlog, issue details, MRs linked to stories |

**Suggested flow for the coding model:** When the user indicates their role (e.g. “I’m an analyst” or “as a manager”), call `get_guidance` with that role, then use `role_aware_checkin` for a tailored check-in and `suggest_next` to recommend next steps. Use the suggested Relay and MCP tools from the guidance to make tasks easier for that persona.

### Resources

| URI | Description |
|-----|-------------|
| `relay:///active-tasks` | Current work session (JSON: sessionId, jiraKey or “No active session”) |
| `relay:///pending-handoffs` | Handoffs for current developer (JSON array) |
| `relay:///metrics` | Summary counts (activeSession, pendingHandoffsCount) |

Current developer is taken from `RELAY_DEVELOPER_ID` or `USER`.

---

For programmatic use, see `packages/core/src` (WorkflowManager, McpClientsManager, McpDbAdapter) and TypeScript types.
