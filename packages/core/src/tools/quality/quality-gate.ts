import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { codeQualityGate } from "../../flows/orchestration-flows.js";

export function codeQualityGateTool(): Tool {
  return {
    name: "code_quality_gate",
    description: "Run quality gate for a task: sub-tasks done, tests passing, no conflicts. Blocks merge if not passed.",
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

export async function runCodeQualityGate(orc: RelayOrchestrator, args: { task_id: string; dev_name?: string }): Promise<string> {
  const r = await codeQualityGate(orc, args);
  const lines = [r.summary];
  if (r.blockers.length) lines.push("", "Blockers:", ...r.blockers.map((b) => "- " + b));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
