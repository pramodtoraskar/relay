import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { capacityForecasting } from "../../flows/orchestration-flows.js";

export function capacityForecastingTool(): Tool {
  return {
    name: "capacity_forecasting",
    description: "Check sprint capacity: assigned work vs available hours. Alerts if overcommitted.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runCapacityForecasting(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await capacityForecasting(orc, args);
  const lines = [r.summary];
  if (r.alert) lines.push("", "Alert: " + r.alert);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
