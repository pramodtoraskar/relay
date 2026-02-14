/**
 * Jira state awareness: query current state, validate transitions, sync local state.
 * Every orchestration tool MUST use this before taking action (CRITICAL requirement).
 */

import type { McpClientsManager } from "../mcp-clients.js";
import type { IRelayDb } from "../db-adapter.js";
import type { JiraIssueState, ResolvedTaskContext, StateValidationResult, JiraTransitionIntent } from "../types/orchestration-tools.js";

const DEFAULT_DEV = (): string => process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";

/** Parse Jira get_issue response into JiraIssueState. */
export function parseJiraIssueState(content: string): JiraIssueState | null {
  if (!content?.trim()) return null;
  try {
    const data = JSON.parse(content);
    const key = data.key ?? data.id ?? "";
    const fields = data.fields ?? data;
    const status = fields.status ?? data.status;
    const statusName = status?.name ?? status?.id ?? "Unknown";
    const statusCategory = status?.statusCategory?.key ?? status?.statusCategory?.name ?? statusName;
    const assignee = fields.assignee ?? data.assignee;
    const assigneeId = assignee?.accountId ?? assignee?.key ?? assignee?.name ?? null;
    const assigneeName = assignee?.displayName ?? assignee?.name ?? null;
    const rawSubtasks = fields.subtasks ?? data.subtasks ?? [];
    const subtasks = rawSubtasks.map((s: any) => {
      const f = s.fields ?? s;
      const st = f.status ?? s.status;
      return {
        key: s.key ?? s.id ?? "",
        statusName: st?.name ?? "Unknown",
        statusCategory: st?.statusCategory?.key ?? st?.statusCategory?.name ?? "Unknown",
      };
    });
    return {
      key,
      summary: fields.summary ?? data.summary ?? null,
      statusName,
      statusCategory,
      assigneeId,
      assigneeName,
      subtasks,
      updated: fields.updated ?? data.updated,
    };
  } catch {
    return null;
  }
}

/** Query Jira for current issue state. Returns null if issue not found or Jira unavailable. */
export async function getJiraState(mcp: McpClientsManager, issueKey: string): Promise<JiraIssueState | null> {
  const getTool = await mcp.getJiraGetIssueTool();
  const res = await mcp.callJiraTool(getTool, { issue_key: issueKey, issueKey, key: issueKey });
  if (res.isError || !res.content) return null;
  return parseJiraIssueState(res.content);
}

/**
 * Resolve task context: use task_id if provided, else auto-detect from developer's active session.
 * Every tool should call this so we don't rely on user memory.
 */
export async function resolveTaskContext(
  mcp: McpClientsManager,
  db: IRelayDb,
  developerId: string,
  taskId?: string
): Promise<ResolvedTaskContext | null> {
  const devId = developerId || DEFAULT_DEV();
  const activeSession = await db.getActiveSession(devId);
  const issueKey = (taskId ?? activeSession?.jira_issue_key ?? "").trim();
  if (!issueKey) return null;

  const state = await getJiraState(mcp, issueKey);
  if (!state) return null;

  const fromSession = !taskId && activeSession?.jira_issue_key === issueKey;
  return {
    issueKey,
    state,
    fromSession,
    sessionId: fromSession ? activeSession?.id ?? null : null,
  };
}

/**
 * Validate that a state transition is legal before performing it.
 * Uses common workflow rules; Jira workflow may vary by project.
 */
export function validateTransition(
  currentState: JiraIssueState,
  intent: JiraTransitionIntent,
  _targetStatus?: string
): StateValidationResult {
  const cat = (currentState.statusCategory || "").toLowerCase();
  const name = (currentState.statusName || "").toLowerCase();

  switch (intent) {
    case "start":
      if (cat === "done" || name === "done") {
        return { valid: false, error: "Issue is already Done.", suggestion: "Reopen or create a new task." };
      }
      return { valid: true };

    case "complete":
      if (cat === "done" || name === "done") {
        return { valid: false, error: "Issue is already Done.", suggestion: "No transition needed." };
      }
      return { valid: true };

    case "code_review":
      if (cat === "done") {
        return { valid: false, error: "Issue is Done; cannot move to Code Review." };
      }
      return { valid: true };

    case "block":
    case "unblock":
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Sync local state with Jira: e.g. if Jira is Done but we have an active session for that issue,
 * we can end the session or surface a warning. Call after taking Jira actions.
 */
export async function syncLocalStateWithJira(
  db: IRelayDb,
  issueKey: string,
  jiraState: JiraIssueState,
  developerId: string
): Promise<{ synced: boolean; message?: string }> {
  const devId = developerId || DEFAULT_DEV();
  const activeSession = await db.getActiveSession(devId);
  if (!activeSession || activeSession.jira_issue_key !== issueKey) return { synced: true };

  const cat = (jiraState.statusCategory || "").toLowerCase();
  const name = (jiraState.statusName || "").toLowerCase();
  if (cat === "done" || name === "done") {
    return {
      synced: false,
      message: `Jira ${issueKey} is Done but you have an active session for it. Consider complete_task or end_session to sync.`,
    };
  }
  return { synced: true };
}
