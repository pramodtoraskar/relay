/**
 * Base class for all 38 orchestration tools.
 * CRITICAL: Every tool MUST be Jira state aware.
 *
 * Principle: Query Jira for current state before taking action, validate transitions,
 * auto-detect context from session, and sync local + Jira state.
 */

import type { WorkflowManager } from "../workflow-manager.js";
import type { JiraIssueState, ResolvedTaskContext, StateValidationResult, JiraTransitionIntent, OrchestrationResultBase } from "../types/orchestration-tools.js";

export abstract class BaseOrchestrationTool<TPayload, TResult extends OrchestrationResultBase> {
  constructor(protected wm: WorkflowManager) {}

  /**
   * Query Jira for current issue state. Call before any action.
   * Returns null if issue not found or Jira unavailable (graceful degradation).
   */
  protected async getJiraState(issueKey: string): Promise<JiraIssueState | null> {
    return this.wm.getJiraState(issueKey);
  }

  /**
   * Resolve task context: use task_id if provided, else auto-detect from developer's active session.
   * Do not rely on user memory — always resolve context.
   */
  protected async resolveContext(developerId: string, taskId?: string): Promise<ResolvedTaskContext | null> {
    return this.wm.resolveTaskContext(developerId, taskId);
  }

  /**
   * Validate that a state transition is legal before performing it.
   * Returns { valid, error?, suggestion? }.
   */
  protected validateTransition(
    currentState: JiraIssueState,
    intent: JiraTransitionIntent,
    targetStatus?: string
  ): StateValidationResult {
    return this.wm.validateTransition(currentState, intent, targetStatus);
  }

  /**
   * Sync local state with Jira after actions.
   * E.g. if Jira is Done but active session exists, returns message to suggest complete_task.
   */
  protected async syncLocalState(
    issueKey: string,
    jiraState: JiraIssueState,
    developerId: string
  ): Promise<{ synced: boolean; message?: string }> {
    return this.wm.syncLocalStateWithJira(issueKey, jiraState, developerId);
  }

  /**
   * Ensure we have Jira state for the issue; throw with clear message if not.
   */
  protected async ensureJiraState(issueKey: string): Promise<JiraIssueState> {
    const state = await this.getJiraState(issueKey);
    if (!state) {
      throw new Error(`Jira issue ${issueKey} not found or Jira unavailable. Check the issue key and Jira MCP connection.`);
    }
    return state;
  }

  /**
   * Ensure we have resolved context (issue + state). Prefer taskId if provided, else from session.
   */
  protected async ensureContext(developerId: string, taskId?: string): Promise<ResolvedTaskContext> {
    const ctx = await this.resolveContext(developerId, taskId);
    if (!ctx) {
      if (taskId) {
        throw new Error(`Could not resolve context for ${taskId}. Issue not found or no active session.`);
      }
      throw new Error("No task in progress. Provide task_id or start_task first.");
    }
    return ctx;
  }

  /**
   * Validate transition; if invalid, append error to warnings and return false, else return true.
   */
  protected validateOrAppendWarning(
    currentState: JiraIssueState,
    intent: JiraTransitionIntent,
    warnings: string[],
    targetStatus?: string
  ): boolean {
    const result = this.validateTransition(currentState, intent, targetStatus);
    if (!result.valid) {
      warnings.push(result.error ?? "Invalid transition");
      if (result.suggestion) warnings.push(result.suggestion);
      return false;
    }
    return true;
  }

  /** Subclasses implement the orchestration. Must use getJiraState / resolveContext / validateTransition / syncLocalState as appropriate. */
  abstract execute(params: TPayload): Promise<TResult>;
}
