import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { sprintRiskPredictor } from "../../flows/orchestration-flows.js";

export function sprintRiskPredictorTool(): Tool {
  return {
    name: "sprint_risk_predictor",
    description: "Mid-sprint: predict completion probability and suggest descoping or adding capacity.",
    inputSchema: {
      type: "object",
      properties: { project_key: { type: "string", description: "Jira project key" } },
    },
  };
}

export async function runSprintRiskPredictor(orc: RelayOrchestrator, args: { project_key?: string }): Promise<string> {
  const r = await sprintRiskPredictor(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
