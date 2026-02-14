import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function createHandoffTool(_wm: WorkflowManager): Tool {
  return {
    name: "handoff_task",
    description:
      "Handoff task / Transfer to. Create a handoff to another developer: capture context, what's done, what's next, branch and file list. Marks current work session as handed off. Before handover: if merge_request_url (and jira_issue_key or active session) is provided, adds a Jira comment with the MR link so reviewers see it.",
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
        merge_request_url: { type: "string", description: "If set, add this MR link as a comment on the Jira issue (use with active session or jira_issue_key)" },
        jira_issue_key: { type: "string", description: "Jira issue to add MR comment to (default: from active session)" },
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
    merge_request_url?: string;
    jira_issue_key?: string;
  }
): Promise<string> {
  const fromId = args.from_developer_id ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
  let jiraIssueKey = args.jira_issue_key;
  if (args.merge_request_url && !jiraIssueKey) {
    const session = await wm.getActiveSession(fromId);
    if (session?.jiraKey) jiraIssueKey = session.jiraKey;
  }
  const handoffId = await wm.createHandoff({
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
    mergeRequestUrl: args.merge_request_url,
    jiraIssueKey: jiraIssueKey ?? undefined,
  });
  const mrNote =
    args.merge_request_url && jiraIssueKey
      ? " Jira comment added with MR link."
      : "";
  return `Handoff created: **${handoffId}** — "${args.title}" to ${args.to_developer_id}.${mrNote}`;
}
