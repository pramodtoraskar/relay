import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { storyCycleTimeAnalyzer } from "../../flows/orchestration-flows.js";

export function storyCycleTimeAnalyzerTool(): Tool {
  return {
    name: "story_cycle_time_analyzer",
    description: "Analyze story cycle time: work time vs calendar time. Identify delays from handoffs or interruptions.",
    inputSchema: {
      type: "object",
      properties: { project_key: { type: "string", description: "Jira project key" } },
    },
  };
}

export async function runStoryCycleTimeAnalyzer(orc: RelayOrchestrator, args: { project_key?: string }): Promise<string> {
  const r = await storyCycleTimeAnalyzer(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
