import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { mergeConflictPredictor } from "../../flows/orchestration-flows.js";

export function mergeConflictPredictorTool(): Tool {
  return {
    name: "merge_conflict_predictor",
    description: "Predict merge conflicts: check who else is working on same files and suggest coordination or alternative tasks.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key" },
        dev_name: { type: "string", description: "Developer id" },
      },
      required: ["task_id"],
    },
  };
}

export async function runMergeConflictPredictor(orc: RelayOrchestrator, args: { task_id: string; dev_name?: string }): Promise<string> {
  const r = await mergeConflictPredictor(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
