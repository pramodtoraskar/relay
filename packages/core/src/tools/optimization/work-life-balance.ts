import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { workLifeBalanceMonitor } from "../../flows/orchestration-flows.js";

export function workLifeBalanceMonitorTool(): Tool {
  return {
    name: "work_life_balance_monitor",
    description: "Track work hours; detect >50hr weeks or weekend work and alert.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runWorkLifeBalanceMonitor(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await workLifeBalanceMonitor(orc, args);
  const lines = [r.summary];
  if (r.alert) lines.push("", "Alert: " + r.alert);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
