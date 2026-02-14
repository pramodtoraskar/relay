import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { codePatternLearner } from "../../flows/orchestration-flows.js";

export function codePatternLearnerTool(): Tool {
  return {
    name: "code_pattern_learner",
    description: "Learn your coding patterns and suggest improvements before review. Use before submitting MR.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
    },
  };
}

export async function runCodePatternLearner(orc: RelayOrchestrator, args: { task_id?: string }): Promise<string> {
  const r = await codePatternLearner(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
