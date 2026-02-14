import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { automatedRetrospective } from "../../flows/orchestration-flows.js";

export function automatedRetrospectiveTool(): Tool {
  return {
    name: "automated_retrospective",
    description: "Generate retrospective: gather sprint data and AI-generated 'went well' and 'improve' insights.",
    inputSchema: {
      type: "object",
      properties: {
        sprint_id: { type: "string", description: "Sprint identifier" },
        project_key: { type: "string", description: "Jira project key" },
      },
    },
  };
}

export async function runAutomatedRetrospective(orc: RelayOrchestrator, args: { sprint_id?: string; project_key?: string }): Promise<string> {
  const r = await automatedRetrospective(orc, args);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
