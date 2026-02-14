import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { preDeployChecklist } from "../../flows/orchestration-flows.js";

export function preDeployChecklistTool(): Tool {
  return {
    name: "pre_deploy_checklist",
    description: "Pre-deploy check: all stories Done, MRs merged, tests passing. Returns blockers if not ready.",
    inputSchema: {
      type: "object",
      properties: { project_key: { type: "string", description: "Jira project key" } },
    },
  };
}

export async function runPreDeployChecklist(orc: RelayOrchestrator, args: { project_key?: string }): Promise<string> {
  const r = await preDeployChecklist(orc, args);
  const lines = [r.summary];
  if (r.blockers.length) lines.push("", "Blockers:", ...r.blockers.map((b) => "- " + b));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
