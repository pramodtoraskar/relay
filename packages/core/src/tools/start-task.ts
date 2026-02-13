import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function startTaskTool(_wm: WorkflowManager): Tool {
  return {
    name: "start_task",
    description:
      "Start working on a Jira issue: fetch details, create work session, optionally break into micro-tasks. Suggests Git branch name. Updates Jira to In Progress.",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key (e.g. PROJ-42)",
        },
        micro_tasks: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of micro-task titles (e.g. ['Write tests', 'Implement API'])",
        },
        developer_id: { type: "string", description: "Optional developer id" },
      },
      required: ["issue_key"],
    },
  };
}

export async function runStartTask(
  wm: WorkflowManager,
  args: { issue_key: string; micro_tasks?: string[]; developer_id?: string }
): Promise<string> {
  const result = await wm.startTask(
    args.issue_key,
    args.micro_tasks ?? [],
    args.developer_id
  );
  return [
    `Started work session **${result.sessionId}** for **${result.issueKey}**: ${result.summary}.`,
    `Suggested branch: \`${result.suggestedBranch}\``,
    "Micro-tasks:",
    ...result.microTasks.map((t) => `- ${t.title}`),
  ].join("\n");
}
