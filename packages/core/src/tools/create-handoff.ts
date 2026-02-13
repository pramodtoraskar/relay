import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function createHandoffTool(wm: WorkflowManager): Tool {
  return {
    name: "create_handoff",
    description:
      "Create a handoff to another developer: capture context, what's done, what's next, branch and file list. Marks current work session as handed off.",
    inputSchema: {
      type: "object",
      properties: {
        to_developer_id: { type: "string", description: "Recipient developer id" },
        title: { type: "string", description: "Handoff title" },
        context_summary: { type: "string", description: "Brief context summary" },
        what_done: { type: "string", description: "What was completed" },
        what_next: { type: "string", description: "What to do next" },
        branch_name: { type: "string", description: "Current branch" },
        file_list: { type: "string", description: "Relevant files (comma or newline)" },
        blockers_notes: { type: "string", description: "Blockers or notes" },
        work_session_id: { type: "string", description: "Optional session to hand off" },
        from_developer_id: { type: "string" },
      },
      required: ["to_developer_id", "title"],
    },
  };
}

export async function runCreateHandoff(
  wm: WorkflowManager,
  args: {
    to_developer_id: string;
    title: string;
    context_summary?: string;
    what_done?: string;
    what_next?: string;
    branch_name?: string;
    file_list?: string;
    blockers_notes?: string;
    work_session_id?: string;
    from_developer_id?: string;
  }
): Promise<string> {
  const fromId = args.from_developer_id ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
  const handoffId = wm.createHandoff({
    fromDeveloperId: fromId,
    toDeveloperId: args.to_developer_id,
    title: args.title,
    contextSummary: args.context_summary,
    whatDone: args.what_done,
    whatNext: args.what_next,
    branchName: args.branch_name,
    fileList: args.file_list,
    blockersNotes: args.blockers_notes,
    workSessionId: args.work_session_id,
  });
  return `Handoff created: **${handoffId}** — "${args.title}" to ${args.to_developer_id}.`;
}
