import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { reviewBottleneckDetector } from "../../flows/orchestration-flows.js";

export function reviewBottleneckDetectorTool(): Tool {
  return {
    name: "review_bottleneck_detector",
    description: "Find MRs waiting more than 3 days for review. Creates visibility for follow-up and unblocking.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runReviewBottleneckDetector(orc: RelayOrchestrator): Promise<string> {
  const r = await reviewBottleneckDetector(orc);
  const lines = [r.summary];
  if (r.overdue_mrs.length) lines.push("", "Overdue MRs:", ...r.overdue_mrs.map((m) => `- !${m.iid} ${m.title} (${m.days_waiting}d)`));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
