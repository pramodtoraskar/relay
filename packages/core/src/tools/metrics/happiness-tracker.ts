import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { developerHappinessTracker } from "../../flows/orchestration-flows.js";

export function developerHappinessTrackerTool(): Tool {
  return {
    name: "developer_happiness_tracker",
    description: "Detect burnout signals: long sessions, interruptions, rework. Alert lead for check-in.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runDeveloperHappinessTracker(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await developerHappinessTracker(orc, args);
  const lines = [r.summary];
  if (r.signals.length) lines.push("", "Signals: " + r.signals.join("; "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
