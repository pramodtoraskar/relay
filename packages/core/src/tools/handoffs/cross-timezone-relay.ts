import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { crossTimezoneRelay } from "../../flows/orchestration-flows.js";

export function crossTimezoneRelayTool(): Tool {
  return {
    name: "cross_timezone_relay",
    description: "End your session and relay to the next timezone. Suggests the best next developer (by recent handoffs) and prepares handoff.",
    inputSchema: {
      type: "object",
      properties: {
        dev_name: { type: "string", description: "Developer id" },
        suggest_only: { type: "boolean", description: "Only suggest recipient, do not create handoff" },
      },
    },
  };
}

export async function runCrossTimezoneRelay(orc: RelayOrchestrator, args: { dev_name?: string; suggest_only?: boolean }): Promise<string> {
  const r = await crossTimezoneRelay(orc, args);
  const lines = [r.summary];
  if (r.suggested_handoff_to) lines.push("", "Suggested: " + r.suggested_handoff_to);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
