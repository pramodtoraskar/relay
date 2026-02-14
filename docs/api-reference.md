# Relay API reference

## MCP server (Relay as MCP)

When Relay runs as an MCP server (Cursor, Claude Desktop), it exposes **65 tools** (including aliases such as `status_check` / `whats_up` and `begin_work` / `start_task`). The sections below group them by purpose. Required parameters are listed first; optional parameters are suffixed with `?`.

### Core workflow tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `whats_up`, `status_check`, `get_context` | What's up? / Status check / Get context. Pending handoffs, assigned Jira issues, Git branch/commits, active session. | `dev_name?` |
| `start_task`, `begin_work` | Start task / Begin work on a Jira issue; create work session and optional micro-tasks; suggest branch name; update Jira to In Progress. | `task_id`, `dev_name`, `micro_tasks?` |
| `log_work`, `update_status` | Log work / Update status. Add note, log time, link commit SHA, or mark a micro-task done on the current session. | `session_id`, `note?`, `minutes_logged?`, `commit_sha?`, `complete_micro_task_id?`, `developer_id?` |
| `complete_task`, `finish_task` | Complete / finish task. End work session; optionally link MR/PR URL and total minutes. Updates Jira to Done. | `session_id`, `merge_request_url?`, `total_minutes?` |
| `handoff_task`, `transfer_to` | Handoff task / Transfer to. Create handoff to another developer. If `merge_request_url` is set (and active session or `jira_issue_key`), adds a Jira comment with the MR link. Marks session as handed off. | `to_developer_id`, `title`, `context_summary?`, `what_done?`, `what_next?`, `branch_name?`, `file_list?`, `blockers_notes?`, `work_session_id?`, `from_developer_id?`, `merge_request_url?`, `jira_issue_key?` |
| `end_session`, `pause_session`, `resume_session`, `session_summary` | End session / Pause / Resume / Session summary. EOD-style summary and handoff reminders. | `dev_name?` |

### Jira + GitLab combined tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_subtask_from_mr_review` | **Jira + GitLab:** If the MR has review comments requiring changes, create a Jira sub-task under the parent issue. Relay checks GitLab MR notes/discussions and creates the sub-task via Jira MCP. | `jira_issue_key`, `merge_request_url?`, `project_id?`, `project_name?`, `mr_iid?`, `merge_request_id?` |
| `smart_handoff` | **Smart handoff:** Find GitLab MR for the task, analyze review comments, create Jira sub-tasks per change, add handoff comment to Jira, create handoff record. | `task_id`, `from_dev`, `to_dev`, `auto_analyze?`, `custom_notes?`, `project_id?`, `project_name?`, `merge_request_url?`, `mr_iid?` |
| `review_readiness_check` | **Ready for review?** Check Jira sub-tasks complete, GitLab pipeline and conflicts, work session state; return blockers or “ready” with next steps (e.g. request reviewers). | `task_id`, `dev_name?` |
| `context_resurrection` | **Return from time away:** Summarize last work session, Jira updates on your task, GitLab branch/conflicts; “where you left off” and next steps. | `dev_name?`, `days_away?` |

### Jira / GitLab passthrough and discovery

| Tool | Description | Parameters |
|------|-------------|------------|
| `query_jira` | Call any Jira MCP tool by name (e.g. `search_issues`, `get_issue`, `transition_issue`). Use `list_jira_mcp_tools` to discover tool names. | `tool_name`, `arguments?` (object) |
| `query_gitlab` | Call any GitLab MCP tool by name. Use `list_gitlab_mcp_tools` to discover tool names. | `tool_name`, `arguments?` (object) |
| `list_jira_mcp_tools` | List all tools exposed by the Jira MCP. | — |
| `list_gitlab_mcp_tools` | List all tools exposed by the GitLab MCP. | — |

### Role-aware tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `show_roles` | List Relay persona roles (Engineer, Analyst, Scientist, Manager, Product/Process). | — |
| `get_guidance` | Get guidance for a role: needs, suggested Relay + MCP tools, example prompts. | `role` (engineer \| analyst \| scientist \| manager \| product_process) |
| `role_aware_checkin` | Status check with role-specific emphasis and suggested focus. | `role`, `dev_name?` |
| `suggest_next` | Suggest next actions for the role (handoffs, start task, GitLab, etc.) using Relay and MCP. | `role`, `context?`, `dev_name?` |

### Session and handoff queries

| Tool | Description | Parameters |
|------|-------------|------------|
| `active_tasks` | Return current work session for the developer. | `dev_name?` |
| `pending_handoffs` | Return handoffs waiting for the developer. | `dev_name?` |
| `show_metrics` | Session and handoff counts for the developer. | `dev_name?` |

### Intelligent orchestration tools

These tools use Jira, GitLab, and/or SQLite MCPs to support handoffs, code review, sprint planning, quality, deployment, metrics, onboarding, and security. Parameters are typically `dev_name?` or tool-specific; see the MCP server schema for full input definitions.

| Category | Tools |
|----------|--------|
| **Handoffs** | `cross_timezone_relay`, `knowledge_transfer` |
| **Code review** | `auto_review_assignment`, `review_bottleneck_detector`, `review_impact_analyzer` |
| **Work sessions** | `work_session_analytics`, `focus_time_protector` |
| **Sprint planning** | `sprint_auto_planning`, `capacity_forecasting`, `story_breakdown_assistant` |
| **Quality** | `technical_debt_tracker`, `code_quality_gate`, `flaky_test_detective` |
| **Coordination** | `merge_conflict_predictor`, `pair_programming_matcher`, `blockers_resolver` |
| **Deployment** | `pre_deploy_checklist`, `deploy_impact_analyzer`, `rollback_recommender` |
| **Metrics** | `developer_happiness_tracker`, `story_cycle_time_analyzer`, `team_velocity_dashboard` |
| **Onboarding** | `new_developer_guide`, `code_area_mapper`, `best_practices_enforcer` |
| **Optimization** | `interruption_minimizer`, `task_switcher`, `work_life_balance_monitor` |
| **AI-driven** | `smart_task_recommender`, `code_pattern_learner`, `sprint_risk_predictor`, `automated_retrospective` |
| **Security** | `security_review_trigger`, `compliance_checker`, `dependency_vulnerability_scanner` |

Use `list_jira_mcp_tools` and `list_gitlab_mcp_tools` to discover Jira/GitLab tool names, then call them via `query_jira` or `query_gitlab`.

### Combined Jira + GitLab workflows

Relay combines both MCPs in two flows:

1. **Before handover — MR link in Jira:** When creating a handoff (`handoff_task` / `transfer_to`), pass `merge_request_url` (and optionally `jira_issue_key`; otherwise the active session’s Jira issue is used). Relay adds a comment on the Jira issue with the MR link and “Handoff: …” text, then creates the handoff so reviewers see the MR in Jira.
2. **Review comments → sub-task:** Use `create_subtask_from_mr_review` with the parent Jira issue key and GitLab MR identifiers (`project_id`/`project_name`, `mr_iid`). Relay checks the MR for notes/discussions via GitLab MCP; if there are review comments, it creates a Jira sub-task (e.g. “Address MR review feedback”) under the parent so the assignee can track follow-up work. If no comments are found, no sub-task is created.
3. **Smart handoff:** `smart_handoff` combines the above: it finds the GitLab MR for the task (optional `project_id` or `RELAY_GITLAB_PROJECT`), analyzes MR notes with a rule-based extractor, creates one Jira sub-task per required change, adds a handoff comment to Jira, and creates the handoff record. Use when handing off with full review context.
4. **Review readiness:** `review_readiness_check` gates “ready for review” by checking Jira sub-tasks complete, GitLab pipeline and conflicts, and work session state; it returns a clear list of blockers or suggests requesting reviewers.
5. **Context resurrection:** `context_resurrection` helps after time away by summarizing the last ended work session, Jira updates, and GitLab conflicts, with “where you left off” and next steps.

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
