import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { codeAreaMapper } from "../../flows/orchestration-flows.js";

export function codeAreaMapperTool(): Tool {
  return {
    name: "code_area_mapper",
    description: "For unfamiliar code: who wrote it, related past stories, and suggest pairing with owner.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Jira issue key" },
        area: { type: "string", description: "Code area or module name" },
      },
      required: ["task_id"],
    },
  };
}

export async function runCodeAreaMapper(orc: RelayOrchestrator, args: { task_id: string; area?: string }): Promise<string> {
  const r = await codeAreaMapper(orc, args);
  const lines = [r.summary];
  if (r.related_stories?.length) lines.push("", "Related: " + r.related_stories.join(", "));
  lines.push("", "Next: " + r.next_steps.join("; "));
  return lines.join("\n");
}
