import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { taskSwitcher } from "../../flows/orchestration-flows.js";

export function taskSwitcherTool(): Tool {
  return {
    name: "task_switcher",
    description: "Switch to another task: save current context, load new task context, track switch cost.",
    inputSchema: {
      type: "object",
      properties: {
        new_task_id: { type: "string", description: "Jira issue key to switch to" },
        dev_name: { type: "string", description: "Developer id" },
      },
      required: ["new_task_id"],
    },
  };
}

export async function runTaskSwitcher(orc: RelayOrchestrator, args: { new_task_id: string; dev_name?: string }): Promise<string> {
  const r = await taskSwitcher(orc, args);
  const lines = [r.summary];
  if (r.previous_task) lines.push("", "Previous: " + r.previous_task);
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
