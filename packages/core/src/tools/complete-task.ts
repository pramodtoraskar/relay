import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function completeTaskTool(wm: WorkflowManager): Tool {
  return {
    name: "complete_task",
    description:
      "Complete the current work session: set status to done, optionally link MR/PR URL and total time. Updates Jira to Done.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Work session id" },
        merge_request_url: {
          type: "string",
          description: "URL of merge request / pull request",
        },
        total_minutes: { type: "number", description: "Total time spent (minutes)" },
      },
      required: ["session_id"],
    },
  };
}

export async function runCompleteTask(
  wm: WorkflowManager,
  args: {
    session_id: string;
    merge_request_url?: string;
    total_minutes?: number;
  }
): Promise<string> {
  wm.completeTask(
    args.session_id,
    args.merge_request_url,
    args.total_minutes
  );
  return `Session ${args.session_id} completed. Jira updated to Done (if configured).`;
}
