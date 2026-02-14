# Jira State Awareness (CRITICAL)

**Principle:** Every orchestration tool MUST be aware of Jira task state.

All 38 intelligent orchestration tools must:

1. **Query Jira for current state** before taking action  
2. **Validate state transitions** are legal  
3. **Auto-detect context** instead of relying on user memory  
4. **Sync local and Jira state** automatically  

---

## Implementation

### 1. Jira state layer (`lib/jira-state.ts`)

- **`getJiraState(mcp, issueKey)`** — Fetch current issue state (status, statusCategory, assignee, subtasks). Returns `null` if issue not found or Jira unavailable.
- **`resolveTaskContext(mcp, db, developerId, taskId?)`** — Resolve task: use `task_id` if provided, else **auto-detect** from developer’s active session. Do not rely on user memory.
- **`validateTransition(currentState, intent, targetStatus?)`** — Check that a transition is legal (e.g. don’t “start” an issue already Done). Intents: `start` | `complete` | `block` | `unblock` | `code_review`.
- **`syncLocalStateWithJira(db, issueKey, jiraState, developerId)`** — After actions, sync local state (e.g. if Jira is Done but active session exists, suggest `complete_task` or `end_session`).

### 2. WorkflowManager (orchestration)

WorkflowManager exposes the same operations for use inside flows:

- **`getJiraState(issueKey)`**
- **`resolveTaskContext(developerId, taskId?)`**
- **`validateTransition(currentState, intent, targetStatus?)`**
- **`syncLocalStateWithJira(issueKey, jiraState, developerId)`**

Existing flows (**smart_handoff**, **review_readiness_check**, **context_resurrection**) use these: they query Jira first, validate where needed, and sync at the end.

### 3. BaseOrchestrationTool (`lib/base-orchestration-tool.ts`)

For **new** tools (e.g. the remaining 35), extend `BaseOrchestrationTool<TPayload, TResult>`:

```typescript
import { BaseOrchestrationTool } from "../../lib/base-orchestration-tool.js";
import type { WorkflowManager } from "../../workflow-manager.js";
import type { JiraIssueState } from "../../types/orchestration-tools.js";

export class MyNewTool extends BaseOrchestrationTool<MyParams, MyResult> {
  constructor(wm: WorkflowManager) {
    super(wm);
  }

  async execute(params: MyParams): Promise<MyResult> {
    // 1. Resolve context (auto-detect task from session if not provided)
    const ctx = await this.ensureContext(params.dev_name, params.task_id);
    const { issueKey, state } = ctx;

    // 2. Validate transition before acting
    const validation = this.validateTransition(state, "start");
    if (!validation.valid) {
      return { summary: validation.error!, actions_taken: [], next_steps: [validation.suggestion!], data: {} };
    }

    // 3. … do work using state …

    // 4. Sync local state with Jira after actions
    await this.syncLocalState(issueKey, state, params.dev_name);

    return { summary: "…", actions_taken: [], next_steps: [], data: {} };
  }
}
```

**Protected helpers on the base:**

- **`getJiraState(issueKey)`** — Query current state  
- **`resolveContext(developerId, taskId?)`** — Resolve task (with auto-detect)  
- **`ensureJiraState(issueKey)`** — Get state or throw  
- **`ensureContext(developerId, taskId?)`** — Get resolved context or throw  
- **`validateTransition(state, intent, targetStatus?)`** — Check transition  
- **`validateOrAppendWarning(state, intent, warnings, targetStatus?)`** — Validate and append to `warnings[]`  
- **`syncLocalState(issueKey, jiraState, developerId)`** — Sync after actions  

### 4. Types (`types/orchestration-tools.ts`)

- **`JiraIssueState`** — `key`, `summary`, `statusName`, `statusCategory`, `assigneeId`, `assigneeName`, `subtasks`, `updated`  
- **`ResolvedTaskContext`** — `issueKey`, `state`, `fromSession`, `sessionId`  
- **`StateValidationResult`** — `valid`, `error?`, `suggestion?`  
- **`JiraTransitionIntent`** — `"start" | "complete" | "block" | "unblock" | "code_review"`  

---

## Current tools using Jira state awareness

| Tool                     | Query Jira first | Validate transition | Sync after |
|--------------------------|------------------|----------------------|------------|
| **smart_handoff**        | ✅ getJiraState  | ✅ (Done → handoff) | ✅ syncLocalStateWithJira |
| **review_readiness_check** | ✅ getJiraState  | ✅ (Done → “no review”) | N/A (read-only) |
| **context_resurrection** | ✅ getJiraState  | N/A                  | N/A (read-only) |

All future orchestration tools should follow the same pattern (query → validate → act → sync).
