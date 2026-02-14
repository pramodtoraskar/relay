import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { teamVelocityDashboard } from "../../flows/orchestration-flows.js";

export function teamVelocityDashboardTool(): Tool {
  return {
    name: "team_velocity_dashboard",
    description: "Show team velocity: completed stories, commits, code churn, and trend analysis.",
    inputSchema: {
      type: "object",
      properties: { project_key: { type: "string", description: "Jira project key" } },
    },
  };
}

export async function runTeamVelocityDashboard(orc: RelayOrchestrator, args: { project_key?: string }): Promise<string> {
  const r = await teamVelocityDashboard(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
