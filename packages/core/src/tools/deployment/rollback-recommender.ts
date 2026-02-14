import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { rollbackRecommender } from "../../flows/orchestration-flows.js";

export function rollbackRecommenderTool(): Tool {
  return {
    name: "rollback_recommender",
    description: "Recommend rollback when errors spike post-deploy. Use with monitoring to find culprit and suggest revert.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runRollbackRecommender(orc: RelayOrchestrator): Promise<string> {
  const r = await rollbackRecommender(orc);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
