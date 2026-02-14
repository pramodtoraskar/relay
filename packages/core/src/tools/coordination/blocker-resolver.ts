import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { blockersResolver } from "../../flows/orchestration-flows.js";

export function blockersResolverTool(): Tool {
  return {
    name: "blockers_resolver",
    description: "Resolve a blocker: analyze type, find who can unblock, and create an unblocking task in Jira.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key (blocked)" },
        blocker_reason: { type: "string", description: "Description of blocker" },
      },
      required: ["task_id"],
    },
  };
}

export async function runBlockersResolver(orc: RelayOrchestrator, args: { task_id: string; blocker_reason?: string }): Promise<string> {
  const r = await blockersResolver(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
