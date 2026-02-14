import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { securityReviewTrigger } from "../../flows/orchestration-flows.js";

export function securityReviewTriggerTool(): Tool {
  return {
    name: "security_review_trigger",
    description: "If MR touches sensitive files (auth, payments), request security review and block merge until approved.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
      required: ["task_id"],
    },
  };
}

export async function runSecurityReviewTrigger(orc: RelayOrchestrator, args: { task_id: string }): Promise<string> {
  const r = await securityReviewTrigger(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
