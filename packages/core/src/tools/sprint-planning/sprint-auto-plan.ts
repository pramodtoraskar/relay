import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { sprintAutoPlanning } from "../../flows/orchestration-flows.js";

export function sprintAutoPlanningTool(): Tool {
  return {
    name: "sprint_auto_planning",
    description: "Plan a sprint: analyze backlog and suggest assignments by capacity and expertise.",
    inputSchema: {
      type: "object",
      properties: {
        sprint_id: { type: "string", description: "Sprint identifier" },
        project_key: { type: "string", description: "Jira project key" },
      },
    },
  };
}

export async function runSprintAutoPlanning(orc: RelayOrchestrator, args: { sprint_id?: string; project_key?: string }): Promise<string> {
  const r = await sprintAutoPlanning(orc, args);
  const lines = [r.summary];
  if (r.suggested_assignments.length) lines.push("", "Suggested: " + r.suggested_assignments.join(", "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
