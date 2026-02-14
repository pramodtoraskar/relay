import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";
import {
  getRoleGuidance,
  listRoles,
  ROLE_GUIDANCE,
  type RelayRoleId,
} from "../roles.js";
import { runMorningCheckin } from "./morning-checkin.js";

const ROLE_IDS_DESC = "engineer | analyst | scientist | manager | product_process";

export function getRoleGuidanceTool(): Tool {
  return {
    name: "get_guidance",
    description:
      "Get guidance for your role (Engineer, Analyst, Scientist, Manager, Product/Process). Use when the user says they are an engineer/analyst/scientist/manager/product manager to understand their needs and which Relay + MCP tools to use.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: `Role id: ${ROLE_IDS_DESC}`,
          enum: ["engineer", "analyst", "scientist", "manager", "product_process"],
        },
      },
      required: ["role"],
    },
  };
}

export async function runGetRoleGuidance(args: { role: string }): Promise<string> {
  const guidance = getRoleGuidance(args.role);
  if (!guidance) {
    const roles = listRoles();
    return `Unknown role: "${args.role}". Use one of: ${roles.map((r) => r.id).join(", ")}.`;
  }
  const lines = [
    `# ${guidance.label}`,
    "",
    guidance.description,
    "",
    "## What this role typically needs",
    ...guidance.needs.map((n) => `- ${n}`),
    "",
    "## Relay tools to use",
    guidance.relayTools.join(", "),
    "",
    "## Jira MCP",
    guidance.jiraUsage,
    "",
    "## GitLab MCP",
    guidance.gitlabUsage,
    "",
    "## Example prompts to handle",
    ...guidance.examplePrompts.map((p) => `- "${p}"`),
  ];
  return lines.join("\n");
}

export function roleAwareCheckinTool(_wm: WorkflowManager): Tool {
  return {
    name: "role_aware_checkin",
    description:
      "Status check tailored to the user's role (Engineer, Analyst, Scientist, Manager, Product/Process). Same data as whats_up/status_check but with role-specific emphasis. Use with get_guidance when assisting an engineer/analyst/scientist/manager/product manager.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: `Role id: ${ROLE_IDS_DESC}`,
          enum: ["engineer", "analyst", "scientist", "manager", "product_process"],
        },
        dev_name: {
          type: "string",
          description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)",
        },
      },
      required: ["role"],
    },
  };
}

export async function runRoleAwareCheckin(
  wm: WorkflowManager,
  args: { role: string; developer_id?: string; dev_name?: string }
): Promise<string> {
  const roleId = args.role?.toLowerCase() as RelayRoleId;
  const devId = args.developer_id ?? args.dev_name;
  const guidance = getRoleGuidance(roleId);
  const checkinText = await runMorningCheckin(wm, { developer_id: devId });

  if (!guidance) {
    return checkinText;
  }

  const focusByRole: Record<RelayRoleId, string> = {
    engineer: "Focus: assigned issues, branch, and active session. Use start_task, log_work, complete_task, and GitLab MRs.",
    analyst: "Focus: assigned Jira issues and handoffs. Use start_task and Jira for acceptance criteria; Git is optional.",
    scientist: "Focus: branch/commits for reproducibility, Jira for experiment tracking, handoffs with run/notebook context.",
    manager: "Focus: pending handoffs and team status. Use query_jira for board/sprint; minimal Git detail.",
    product_process: "Focus: backlog and issue details. Use query_jira; query_gitlab for MRs linked to stories.",
  };
  const focus = focusByRole[roleId];
  const header = [
    "## Role-aware check-in",
    "",
    `**Role:** ${guidance.label}`,
    "",
    `**Suggested focus:** ${focus}`,
    "",
    "---",
    "",
  ].join("\n");

  return header + checkinText;
}

export function suggestActionsForRoleTool(): Tool {
  return {
    name: "suggest_next",
    description:
      "Suggest next actions for the given role using Relay and MCP. Use after role_aware_checkin or when the user asks 'what should I do next'. Combines role guidance with handoffs/issues/active session to recommend concrete steps.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: `Role id: ${ROLE_IDS_DESC}`,
          enum: ["engineer", "analyst", "scientist", "manager", "product_process"],
        },
        context: {
          type: "string",
          description:
            "Optional: e.g. 'just finished a task', 'no active session', 'has pending handoffs'. Improves suggestions.",
        },
        dev_name: {
          type: "string",
          description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)",
        },
      },
    },
  };
}

export async function runSuggestActionsForRole(
  wm: WorkflowManager,
  args: { role: string; context?: string; developer_id?: string; dev_name?: string }
): Promise<string> {
  const roleId = args.role?.toLowerCase() as RelayRoleId;
  const devId = args.developer_id ?? args.dev_name;
  const guidance = getRoleGuidance(roleId);
  if (!guidance) {
    const roles = listRoles();
    return `Unknown role: "${args.role}". Use one of: ${roles.map((r) => r.id).join(", ")}.`;
  }

  const checkin = await wm.morningCheckin(devId);
  const hasHandoffs = checkin.pendingHandoffs.length > 0;
  const hasIssues = checkin.assignedIssues.length > 0;
  const hasActiveSession = checkin.activeSession != null;
  const ctx = (args.context ?? "").toLowerCase();

  const suggestions: string[] = [];

  if (guidance.id === "manager" || guidance.id === "product_process") {
    if (hasHandoffs) {
      suggestions.push("1. **Review pending handoffs** — Check relay:///pending-handoffs or whats_up/status_check output and follow up with owners.");
    }
      suggestions.push("2. **Get team/sprint view** — Use query_jira with search_issues (JQL by assignee or sprint) for standup or status.");
    if (guidance.id === "product_process") {
      suggestions.push("3. **Check backlog** — Use query_jira (search_issues) with JQL for open/sprint issues.");
    }
  } else {
    if (hasHandoffs) {
      suggestions.push("1. **Address pending handoffs** — Use whats_up/status_check to see details; handoff_task if you're passing work.");
    }
    if (!hasActiveSession && hasIssues) {
      suggestions.push(
        "2. **Start a task** — Use start_task with an issue key (e.g. from assigned issues) to create a session and get a suggested branch."
      );
    }
    if (hasActiveSession) {
      suggestions.push("2. **Continue current task** — Use log_work to log time/notes/commits; complete_task when done with optional MR link.");
    }
    if ((guidance.id === "engineer" || guidance.id === "scientist") && !suggestions.some((s) => s.includes("GitLab"))) {
      suggestions.push("3. **Check GitLab** — Use query_gitlab (or list_gitlab_mcp_tools) for MRs, pipelines, or recent commits.");
    }
  }

  if (ctx.includes("finished") || ctx.includes("done")) {
    suggestions.unshift("**You mentioned you just finished.** Consider: complete_task (with session_id and optional merge_request_url), then start_task for the next issue or suggest_next to reprioritize.");
  }

  const lines = [
    `# Suggested actions (${guidance.label})`,
    "",
    ...(args.context ? [`Context: ${args.context}`, ""] : []),
    "## Recommended next steps",
    "",
    ...suggestions,
    "",
    "## Tools to use",
    guidance.relayTools.slice(0, 6).join(", ") + (guidance.relayTools.length > 6 ? ", …" : ""),
  ].filter(Boolean);

  return lines.join("\n");
}

export function listRolesTool(): Tool {
  return {
    name: "show_roles",
    description:
      "Show roles. List Relay persona roles (Engineer, Analyst, Scientist, Manager, Product/Process Manager). Use before get_guidance or role_aware_checkin when the user's role is unclear.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runListRoles(): Promise<string> {
  const roles = listRoles();
  const lines = [
    "Relay roles (use with get_guidance, role_aware_checkin, suggest_next):",
    "",
    ...roles.map((r) => {
      const g = ROLE_GUIDANCE[r.id];
      return `- **${r.id}** — ${g.description}`;
    }),
  ];
  return lines.join("\n");
}
