import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { autoReviewAssignment } from "../../flows/orchestration-flows.js";

export function autoReviewAssignmentTool(): Tool {
  return {
    name: "auto_review_assignment",
    description: "Suggest and assign the best reviewers for your MR based on recent handoffs and context. Auto-detects current task if not provided.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key (optional; uses active session if omitted)" },
        dev_name: { type: "string", description: "Developer id" },
      },
    },
  };
}

export async function runAutoReviewAssignment(orc: RelayOrchestrator, args: { task_id?: string; dev_name?: string }): Promise<string> {
  const r = await autoReviewAssignment(orc, args);
  const lines = [r.summary];
  if (r.suggested_reviewers.length) lines.push("", "Suggested reviewers: " + r.suggested_reviewers.join(", "));
  if (r.mr_url) lines.push("", "MR: " + r.mr_url);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
