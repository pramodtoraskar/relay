/**
 * Role definitions so Relay and the coding-assistance model can tailor workflows
 * to Engineer, Analyst, Scientist, Manager, and Product/Process Manager needs.
 * Use with get_guidance, role_aware_checkin, and suggest_next.
 */

export const RELAY_ROLE_IDS = [
  "engineer",
  "analyst",
  "scientist",
  "manager",
  "product_process",
] as const;

export type RelayRoleId = (typeof RELAY_ROLE_IDS)[number];

export interface RoleGuidance {
  id: RelayRoleId;
  label: string;
  description: string;
  /** What this role typically needs from tools and context */
  needs: string[];
  /** Relay tools to prioritize when assisting this role */
  relayTools: string[];
  /** How to use Jira MCP (list_jira_mcp_tools / query_jira) for this role */
  jiraUsage: string;
  /** How to use GitLab MCP for this role */
  gitlabUsage: string;
  /** Example user prompts the coding model should handle well */
  examplePrompts: string[];
}

export const ROLE_GUIDANCE: Record<RelayRoleId, RoleGuidance> = {
  engineer: {
    id: "engineer",
    label: "Engineer",
    description: "Software or systems engineer shipping code, PRs/MRs, and Jira-linked work.",
    needs: [
      "Assigned Jira issues and sprint/backlog context",
      "Current Git branch and recent commits",
      "Start/complete tasks with Jira transitions and suggested branch names",
      "Progress logs, micro-tasks, and handoffs",
      "Merge/pull request links and pipeline status",
    ],
    relayTools: [
      "whats_up",
      "status_check",
      "get_context",
      "start_task",
      "begin_work",
      "log_work",
      "update_status",
      "complete_task",
      "finish_task",
      "handoff_task",
      "transfer_to",
      "list_gitlab_mcp_tools",
      "query_gitlab",
    ],
    jiraUsage: "Search assigned issues, get issue details, transition to In Progress/Done. Use list_jira_mcp_tools then query_jira for search_issues, get_jira, transition_issue.",
    gitlabUsage: "Branch status, recent commits, MRs, pipelines, list_merge_requests, list_pipelines. Use list_gitlab_mcp_tools to discover then query_gitlab.",
    examplePrompts: [
      "What's on my plate today?",
      "Start working on PROJ-123",
      "Log 30 minutes and link commit abc123",
      "Mark task done and add MR link",
      "Create a handoff to @alice for the auth refactor",
    ],
  },
  analyst: {
    id: "analyst",
    label: "Analyst",
    description: "Data or business analyst focused on reports, queries, and data quality.",
    needs: [
      "Jira issues for data/reporting requests and acceptance criteria",
      "Context on datasets, pipelines, and dependencies",
      "Links to runbooks, docs, and existing reports",
      "Handoffs and status without deep Git workflow",
    ],
    relayTools: [
      "whats_up",
      "status_check",
      "get_context",
      "start_task",
      "begin_work",
      "log_work",
      "complete_task",
      "handoff_task",
      "list_jira_mcp_tools",
      "query_jira",
    ],
    jiraUsage: "Search issues by project/labels, get issue description and acceptance criteria. Use query_jira with search_issues (jql) or get_jira (issue_key).",
    gitlabUsage: "Optional: list repos, list pipelines for data jobs. Use list_gitlab_mcp_tools then query_gitlab.",
    examplePrompts: [
      "What Jira issues are assigned to me?",
      "Start PROJ-456 and break it into: validate source, build report, document",
      "What handoffs do I have?",
      "Summarize my active task and what's left",
    ],
  },
  scientist: {
    id: "scientist",
    label: "Scientist",
    description: "Research or data scientist running experiments, models, and reproducible workflows.",
    needs: [
      "Jira/epic context for experiments and papers",
      "Reproducibility: branch, commit, and environment context",
      "Links to runs, notebooks, and artifacts",
      "Handoffs and collaboration context",
    ],
    relayTools: [
      "whats_up",
      "start_task",
      "log_work",
      "complete_task",
      "handoff_task",
      "list_gitlab_mcp_tools",
      "query_gitlab",
      "list_jira_mcp_tools",
      "query_jira",
    ],
    jiraUsage: "Get issue details and link experiments to tickets. Use query_jira with get_jira, search_issues for epic/experiment tracking.",
    gitlabUsage: "Branch, commits, and optionally CI for runs. Use query_gitlab for list_commits, branch info, pipelines.",
    examplePrompts: [
      "What am I working on and what branch?",
      "Start experiment ticket EXP-1 with micro-tasks: setup env, run baseline, document results",
      "Log progress and link commit for reproducibility",
      "Hand off to @bob with run ID and notebook path",
    ],
  },
  manager: {
    id: "manager",
    label: "Manager",
    description: "Engineering or team manager focused on status, capacity, and handoffs.",
    needs: [
      "Pending handoffs and who is waiting",
      "Team/sprint visibility (Jira board, issues by assignee)",
      "Active sessions and blockers",
      "Minimal code context; emphasis on status and next actions",
    ],
    relayTools: [
      "whats_up",
      "status_check",
      "end_session",
      "session_summary",
      "handoff_task",
      "list_jira_mcp_tools",
      "query_jira",
    ],
    jiraUsage: "Board/sprint views, search by assignee or team. Use list_jira_mcp_tools then query_jira (e.g. search_issues with JQL by assignee/sprint).",
    gitlabUsage: "Optional: pipeline status, MR list for team. Use list_gitlab_mcp_tools then query_gitlab.",
    examplePrompts: [
      "What handoffs are pending for my team?",
      "Give me a status summary for the standup",
      "Who has active work and what are they on?",
      "End of day summary and handoff reminders",
    ],
  },
  product_process: {
    id: "product_process",
    label: "Product / Process Manager",
    description: "Product or process manager focused on backlogs, flows, and requirements.",
    needs: [
      "Backlog and sprint view (Jira)",
      "Issue details, acceptance criteria, and links to implementation",
      "Handoffs and dependency context",
      "Visibility into MRs/commits linked to stories",
    ],
    relayTools: [
      "whats_up",
      "start_task",
      "handoff_task",
      "list_jira_mcp_tools",
      "query_jira",
      "list_gitlab_mcp_tools",
      "query_gitlab",
    ],
    jiraUsage: "Search backlog, get issue, transition. Use query_jira with search_issues (JQL), get_jira, transition_issue.",
    gitlabUsage: "MRs and pipelines linked to stories. Use query_gitlab with list_merge_requests, list_pipelines.",
    examplePrompts: [
      "What's in the backlog for this sprint?",
      "Get details for PROJ-789",
      "What handoffs are blocking delivery?",
      "Summary of active work and MRs",
    ],
  },
};

export function getRoleGuidance(roleId: string): RoleGuidance | null {
  const id = RELAY_ROLE_IDS.find((r) => r === roleId.toLowerCase());
  return id ? ROLE_GUIDANCE[id] : null;
}

export function listRoles(): Array<{ id: RelayRoleId; label: string }> {
  return RELAY_ROLE_IDS.map((id) => ({ id, label: ROLE_GUIDANCE[id].label }));
}
