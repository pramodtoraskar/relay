import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { flakyTestDetector } from "../../flows/orchestration-flows.js";

export function flakyTestDetectorTool(): Tool {
  return {
    name: "flaky_test_detective",
    description: "Find flaky tests from CI failure history. Create Jira issues for intermittent failures.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runFlakyTestDetector(orc: RelayOrchestrator): Promise<string> {
  const r = await flakyTestDetector(orc);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
