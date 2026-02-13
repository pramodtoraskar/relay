import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function endOfDayTool(wm: WorkflowManager): Tool {
  return {
    name: "end_of_day",
    description:
      "End-of-day summary: show completed work, pending handoffs, and suggest creating handoffs for any active session.",
    inputSchema: {
      type: "object",
      properties: {
        developer_id: { type: "string", description: "Optional developer id" },
      },
    },
  };
}

export async function runEndOfDay(
  wm: WorkflowManager,
  args: { developer_id?: string }
): Promise<string> {
  const result = await wm.endOfDay(args.developer_id);
  const lines: string[] = [
    "## End of day",
    "",
    result.message,
    "",
    "### Pending handoffs (for you)",
    result.pendingHandoffs.length
      ? result.pendingHandoffs.map((h) => `- ${h.title} (from ${h.from})`).join("\n")
      : "None.",
    "",
    "### Assigned issues (tomorrow)",
    result.assignedIssues.length
      ? result.assignedIssues.map((i) => `- ${i.key}: ${i.summary}`).join("\n")
      : "None.",
  ];
  return lines.join("\n").trim();
}
