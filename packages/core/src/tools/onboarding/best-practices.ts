import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { bestPracticesEnforcer } from "../../flows/orchestration-flows.js";

export function bestPracticesEnforcerTool(): Tool {
  return {
    name: "best_practices_enforcer",
    description: "Check MR for missing tests or docs. Create sub-tasks if standards not met. Use before or on MR.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
      required: ["task_id"],
    },
  };
}

export async function runBestPracticesEnforcer(orc: RelayOrchestrator, args: { task_id: string }): Promise<string> {
  const r = await bestPracticesEnforcer(orc, args);
  const lines = [r.summary];
  if (r.gaps?.length) lines.push("", "Gaps: " + r.gaps.join("; "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
