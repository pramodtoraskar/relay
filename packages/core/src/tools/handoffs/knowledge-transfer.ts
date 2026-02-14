import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { knowledgeTransfer } from "../../flows/orchestration-flows.js";

export function knowledgeTransferTool(): Tool {
  return {
    name: "knowledge_transfer",
    description: "Create a knowledge transfer package for a task: related past tasks, handoff history, and context for onboarding.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key (e.g. PROJ-42)" },
        dev_name: { type: "string", description: "Developer id" },
      },
      required: ["task_id"],
    },
  };
}

export async function runKnowledgeTransfer(orc: RelayOrchestrator, args: { task_id: string; dev_name?: string }): Promise<string> {
  const r = await knowledgeTransfer(orc, args);
  const lines = [r.summary];
  if (r.related_tasks.length) lines.push("", "Related tasks:", ...r.related_tasks.map((t) => "- " + t));
  if (r.handoff_history.length) lines.push("", "Handoff history:", ...r.handoff_history.map((h) => "- " + h));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
