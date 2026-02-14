import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { newDeveloperGuide } from "../../flows/orchestration-flows.js";

export function newDeveloperGuideTool(): Tool {
  return {
    name: "new_developer_guide",
    description: "Create onboarding plan: find good-first issues and well-documented areas for new devs.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runNewDeveloperGuide(orc: RelayOrchestrator): Promise<string> {
  const r = await newDeveloperGuide(orc);
  const lines = [r.summary];
  if (r.good_first_issues.length) lines.push("", "Good first issues:", ...r.good_first_issues.map((i) => "- " + i));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
