/**
 * Shared types for Relay intelligent orchestration tools.
 * Used across handoffs, code-review, work-sessions, and other categories.
 */

// --- Jira state awareness (used by BaseOrchestrationTool and all 38 tools) ---

/** Current state of a Jira issue from Jira MCP get_issue. */
export interface JiraIssueState {
  key: string;
  summary: string | null;
  statusName: string;
  /** e.g. "To Do", "In Progress", "Done" — from statusCategory.key or name */
  statusCategory: string;
  assigneeId: string | null;
  assigneeName: string | null;
  /** Sub-task keys with their status for validation */
  subtasks: Array<{ key: string; statusName: string; statusCategory: string }>;
  /** Raw updated date if needed */
  updated?: string;
}

/** Result of resolving task context (auto-detect from session or use provided task_id). */
export interface ResolvedTaskContext {
  issueKey: string;
  state: JiraIssueState;
  /** Whether issueKey came from active session (auto-detected) */
  fromSession: boolean;
  /** Active session id if any for this issue */
  sessionId: string | null;
}

/** Result of validating a state transition before performing it. */
export interface StateValidationResult {
  valid: boolean;
  error?: string;
  /** Suggested action when invalid (e.g. "Transition to In Progress first") */
  suggestion?: string;
}

/** Common transitions we care about; workflow may vary by project. */
export type JiraTransitionIntent = "start" | "complete" | "block" | "unblock" | "code_review";

export interface OrchestrationResultBase {
  summary: string;
  actions_taken: string[];
  next_steps: string[];
  warnings?: string[];
}

export interface ReadinessData {
  all_subtasks_complete?: boolean;
  tests_passing?: boolean;
  no_conflicts?: boolean;
  session_complete?: boolean;
}

export interface BlockerItem {
  type: string;
  task?: string;
  test?: string;
  file?: string;
  message?: string;
}

export interface ReviewReadinessResult extends OrchestrationResultBase {
  data: {
    readiness: ReadinessData;
    blockers?: BlockerItem[];
    reviewers_assigned?: string[];
    mr_url?: string;
  };
}

export interface ContextResurrectionResult extends OrchestrationResultBase {
  data: {
    last_session?: {
      task: string | null;
      ended_at: string;
      progress: string;
      branch_name: string | null;
    };
    changes_while_away?: {
      jira_updates: Array<{ task: string; change: string }>;
      gitlab_updates: Array<{ mr?: number; change: string }>;
      conflicts: Array<{ file?: string; reason: string }>;
    };
    resume_context?: {
      where_you_left_off: string;
      next_micro_task?: string;
      estimated_time_remaining?: string;
    };
  };
  estimated_effort_minutes?: number;
}

export interface SmartHandoffResult extends OrchestrationResultBase {
  data: {
    handoff_id: string;
    task_id: string;
    merge_request?: {
      iid: number;
      url: string;
      state: string;
      has_conflicts?: boolean;
      source_branch?: string;
      target_branch?: string;
    };
    review_status?: {
      changes_requested: boolean;
      unresolved_threads: number;
      total_comments: number;
    };
    sub_tasks_created: Array<{ key: string; summary: string; priority?: string }>;
  };
  estimated_effort_minutes?: number;
}

/** Parsed review change from MR notes (rule-based extraction). */
export interface RequiredChange {
  summary: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  reviewerUsername?: string;
}

export interface ReviewCommentsAnalysis {
  changesRequested: boolean;
  requiredChanges: RequiredChange[];
  unresolvedThreads: number;
  totalComments: number;
}
