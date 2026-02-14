import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { smartTaskRecommender } from "../../flows/orchestration-flows.js";

export function smartTaskRecommenderTool(): Tool {
  return {
    name: "smart_task_recommender",
    description: "Recommend next task based on your skills and interests. Matches you to backlog items.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runSmartTaskRecommender(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await smartTaskRecommender(orc, args);
  const lines = [r.summary];
  if (r.suggested_tasks.length) lines.push("", "Suggested: " + r.suggested_tasks.join(", "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
