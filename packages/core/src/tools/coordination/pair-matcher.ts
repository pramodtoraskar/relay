import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { pairProgrammingMatcher } from "../../flows/orchestration-flows.js";

export function pairProgrammingMatcherTool(): Tool {
  return {
    name: "pair_programming_matcher",
    description: "Find an expert in the code area who is available for pairing on the task.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
      required: ["task_id"],
    },
  };
}

export async function runPairProgrammingMatcher(orc: RelayOrchestrator, args: { task_id: string }): Promise<string> {
  const r = await pairProgrammingMatcher(orc, args);
  const lines = [r.summary];
  if (r.suggested_pair) lines.push("", "Suggested pair: " + r.suggested_pair);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
