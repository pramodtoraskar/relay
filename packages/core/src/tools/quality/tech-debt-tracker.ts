import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { technicalDebtTracker } from "../../flows/orchestration-flows.js";

export function technicalDebtTrackerTool(): Tool {
  return {
    name: "technical_debt_tracker",
    description: "Scan codebase for TODO/FIXME/HACK and create Jira tech-debt issues. Use grep or GitLab file search.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runTechnicalDebtTracker(orc: RelayOrchestrator): Promise<string> {
  const r = await technicalDebtTracker(orc);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
