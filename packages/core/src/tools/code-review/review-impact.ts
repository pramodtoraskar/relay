import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { reviewImpactAnalyzer } from "../../flows/orchestration-flows.js";

export function reviewImpactAnalyzerTool(): Tool {
  return {
    name: "review_impact_analyzer",
    description: "Analyze review comments for a task, estimate effort, and suggest story point updates if significant.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key" },
        project_id: { type: "string", description: "GitLab project ID" },
        mr_iid: { type: "number", description: "Merge request IID" },
      },
      required: ["task_id"],
    },
  };
}

export async function runReviewImpactAnalyzer(orc: RelayOrchestrator, args: { task_id: string; project_id?: string; mr_iid?: number }): Promise<string> {
  const r = await reviewImpactAnalyzer(orc, args);
  const lines = [r.summary, "", `Comments: ${r.total_comments}, Est. minutes: ${r.estimated_minutes}`];
  if (r.suggested_story_points) lines.push("Suggested story points: " + r.suggested_story_points);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
