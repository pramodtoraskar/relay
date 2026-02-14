import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { deployImpactAnalyzer } from "../../flows/orchestration-flows.js";

export function deployImpactAnalyzerTool(): Tool {
  return {
    name: "deploy_impact_analyzer",
    description: "Analyze deploy impact: commits in release, affected stories, and generate release notes.",
    inputSchema: {
      type: "object",
      properties: {
        version: { type: "string", description: "Release version" },
        project_key: { type: "string", description: "Jira project key" },
      },
    },
  };
}

export async function runDeployImpactAnalyzer(orc: RelayOrchestrator, args: { version?: string; project_key?: string }): Promise<string> {
  const r = await deployImpactAnalyzer(orc, args);
  const lines = [r.summary];
  if (r.issues_in_scope.length) lines.push("", "Issues: " + r.issues_in_scope.join(", "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
