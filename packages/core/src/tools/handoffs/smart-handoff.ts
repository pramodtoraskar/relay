/**
 * Smart Handoff — Intelligent handoffs with MR analysis and Jira sub-tasks.
 * Category: Handoffs. MCPs: Jira + GitLab + SQLite.
 *
 * Orchestrates: find MR for task, analyze review comments, create Jira sub-tasks,
 * add handoff comment to Jira, create handoff record.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";

export function smartHandoffTool(): Tool {
  return {
    name: "smart_handoff",
    description: `Hand off your work to another developer with complete context.

I'll automatically:
- Find your GitLab MR and analyze review comments
- Create Jira sub-tasks for any requested changes
- Add a comprehensive handoff comment to Jira
- Package everything for the next developer

They'll get exactly what they need to continue your work.`,
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "Jira task ID (e.g. PROJ-42)",
        },
        from_dev: {
          type: "string",
          description: "Your developer id (creating the handoff)",
        },
        to_dev: {
          type: "string",
          description: "Developer id receiving the handoff",
        },
        auto_analyze: {
          type: "boolean",
          description: "Analyze MR and create sub-tasks from review comments (default: true)",
          default: true,
        },
        custom_notes: {
          type: "string",
          description: "Additional context for the handoff",
        },
        project_id: {
          type: "string",
          description: "GitLab project ID or path (to find MR); optional if RELAY_GITLAB_PROJECT is set",
        },
        project_name: {
          type: "string",
          description: "GitLab project name (alternative to project_id)",
        },
        merge_request_url: {
          type: "string",
          description: "MR URL if you already have it (skips MR discovery)",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID when project_id is set",
        },
      },
      required: ["task_id", "from_dev", "to_dev"],
    },
  };
}

export async function runSmartHandoff(
  orchestrator: RelayOrchestrator,
  args: {
    task_id: string;
    from_dev: string;
    to_dev: string;
    auto_analyze?: boolean;
    custom_notes?: string;
    project_id?: string;
    project_name?: string;
    merge_request_url?: string;
    mr_iid?: number;
  }
): Promise<string> {
  const wm = orchestrator.getWorkflowManager();
  const result = await wm.smartHandoff({
    task_id: args.task_id,
    from_dev: args.from_dev,
    to_dev: args.to_dev,
    auto_analyze: args.auto_analyze,
    custom_notes: args.custom_notes,
    project_id: args.project_id,
    project_name: args.project_name,
    merge_request_url: args.merge_request_url,
    mr_iid: args.mr_iid,
  });

  const lines: string[] = [
    `**${result.summary}**`,
    "",
    "**Actions:**",
    ...result.actions_taken.map((a) => `- ${a}`),
    "",
    "**Next steps:**",
    ...result.next_steps.map((s) => `- ${s}`),
  ];
  if (result.warnings?.length) {
    lines.push("", "**Warnings:**", ...result.warnings.map((w) => `- ${w}`));
  }
  if (result.data.sub_tasks_created?.length) {
    lines.push("", "**Sub-tasks created:**", ...result.data.sub_tasks_created.map((s) => `- ${s.key}: ${s.summary}`));
  }
  if (result.estimated_effort_minutes) {
    lines.push("", `Estimated effort: ${result.estimated_effort_minutes} minutes`);
  }
  return lines.join("\n");
}
