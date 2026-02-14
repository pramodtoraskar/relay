import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { complianceChecker } from "../../flows/orchestration-flows.js";

export function complianceCheckerTool(): Tool {
  return {
    name: "compliance_checker",
    description: "Detect PII handling changes and ensure docs updated. Create compliance tasks and block deploy if needed.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
      required: ["task_id"],
    },
  };
}

export async function runComplianceChecker(orc: RelayOrchestrator, args: { task_id: string }): Promise<string> {
  const r = await complianceChecker(orc, args);
  const lines = [r.summary];
  if (r.compliance_tasks?.length) lines.push("", "Tasks: " + r.compliance_tasks.join("; "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
