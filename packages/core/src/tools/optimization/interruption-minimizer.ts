import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { interruptionMinimizer } from "../../flows/orchestration-flows.js";

export function interruptionMinimizerTool(): Tool {
  return {
    name: "interruption_minimizer",
    description: "Minimize interruptions: suggest focus time blocks and batch notifications outside focus.",
    inputSchema: {
      type: "object",
      properties: { dev_name: { type: "string", description: "Developer id" } },
    },
  };
}

export async function runInterruptionMinimizer(orc: RelayOrchestrator, args: { dev_name?: string }): Promise<string> {
  const r = await interruptionMinimizer(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
