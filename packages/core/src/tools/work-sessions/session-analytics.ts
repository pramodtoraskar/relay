import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { workSessionAnalytics } from "../../flows/orchestration-flows.js";

export function workSessionAnalyticsTool(): Tool {
  return {
    name: "work_session_analytics",
    description: "Show your work patterns: session count, total minutes, and status breakdown. Suggests productive schedule.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runWorkSessionAnalytics(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await workSessionAnalytics(orc, args);
  const lines = [r.summary, "", "By status: " + JSON.stringify(r.by_status), "", "Next: " + r.next_steps.join("; ")];
  return lines.join("\n");
}
