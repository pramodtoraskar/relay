import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { storyBreakdownAssistant } from "../../flows/orchestration-flows.js";

export function storyBreakdownAssistantTool(): Tool {
  return {
    name: "story_breakdown_assistant",
    description: "For large stories (13+ pts), suggest a breakdown into sub-tasks based on similar past work.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "Jira issue key" } },
      required: ["task_id"],
    },
  };
}

export async function runStoryBreakdownAssistant(orc: RelayOrchestrator, args: { task_id: string }): Promise<string> {
  const r = await storyBreakdownAssistant(orc, args);
  const lines = [r.summary];
  if (r.suggested_subtasks.length) lines.push("", "Suggested sub-tasks:", ...r.suggested_subtasks.map((s) => "- " + s));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
