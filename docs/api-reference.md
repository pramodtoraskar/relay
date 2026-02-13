# Relay API reference

Reference for the MCP server tools and resources, and programmatic use of `@relay/core`.

## MCP server (relay-mcp)

When Relay runs as an MCP server (Cursor, Claude Desktop), it exposes the following.

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

| URI | Description | Content |
|-----|-------------|--------|
| `relay:///active-tasks` | Current work session | JSON: `{ sessionId?, jiraKey? }` or “No active session” |
| `relay:///pending-handoffs` | Handoffs for current developer | JSON array: `{ id, title, from, summary }` |
| `relay:///metrics` | Summary counts | JSON: `{ activeSession, sessionId?, pendingHandoffsCount }` |

Current developer is taken from `RELAY_DEVELOPER_ID` or `USER`.

---

## @relay/core (programmatic)

For building custom tools or the CLI:

```ts
import {
  DatabaseManager,
  JiraClient,
  GitClient,
  WorkflowManager,
} from "@relay/core";
```

### DatabaseManager

- **Constructor**: `new DatabaseManager(dbPath?: string)` — default DB: `~/.relay/relay.db` or `RELAY_DB_PATH`.
- **Methods**: `ensureDeveloper`, `getActiveSession`, `getPendingHandoffs`, `createWorkSession`, `addMicroTasks`, `completeMicroTask`, `endWorkSession`, `createHandoff`, `addProgressLog`, `getMicroTasks`, `getSession`, `close`.

### JiraClient

- **configure(config?)**: Set base URL and auth (env: `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, `RELAY_JIRA_API_TOKEN` = Jira Personal Access Token).
- **getIssue(issueKey)**: Returns `JiraIssue | null`.
- **transitionIssue(issueKey, transitionName)**: e.g. `"In Progress"`, `"Done"`.
- **getAssignedIssues(jqlOverride?)**: Returns `JiraIssue[]`.

### GitClient

- **getCurrentBranch()**, **getRecentCommits(count?)**, **suggestBranchName(issueKey, slug?)**, **isRepository()**.

### WorkflowManager

- **morningCheckin(developerId?)**: Returns `MorningCheckinResult`.
- **startTask(issueKey, microTaskTitles[], developerId?)**: Returns `StartTaskResult`.
- **updateProgress(sessionId, note?, minutes?, commitSha?, microTaskId?)**: void.
- **completeTask(sessionId, mergeRequestUrl?, totalMinutes?)**: void.
- **createHandoff(input)**: Returns handoff id.
- **endOfDay(developerId?)**: Returns check-in result + message.
- **getActiveSession(developerId?)**, **getMicroTasks(sessionId)**.

See TypeScript types in `packages/core/src` for full signatures.
