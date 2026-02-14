import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { focusTimeProtector } from "../../flows/orchestration-flows.js";

export function focusTimeProtectorTool(): Tool {
  return {
    name: "focus_time_protector",
    description: "Enable focus mode: detect active session and suggest batching notifications until you complete or hand off.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runFocusTimeProtector(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await focusTimeProtector(orc, args);
  const lines = [r.summary];
  if (r.session_id) lines.push("Session: " + r.session_id);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
