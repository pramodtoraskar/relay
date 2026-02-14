import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../orchestrator.js";

export function createSubtaskFromMrReviewTool(): Tool {
  return {
    name: "create_subtask_from_mr_review",
    description:
      "Combined Jira + GitLab: if the MR has review comments that require changes, create a Jira sub-task under the parent issue so the assignee can address feedback. Use after MR review; Relay checks GitLab MR notes/discussions and creates a sub-task via Jira MCP.",
    inputSchema: {
      type: "object",
      properties: {
        jira_issue_key: {
          type: "string",
          description: "Parent Jira issue key (e.g. PROJ-42)",
        },
        merge_request_url: {
          type: "string",
          description: "MR URL (for sub-task description)",
        },
        project_id: {
          type: "string",
          description: "GitLab project ID or project path/name for listing MR notes",
        },
        project_name: {
          type: "string",
          description: "GitLab project name (alternative to project_id)",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (numeric id in project)",
        },
        merge_request_id: {
          type: "string",
          description: "Merge request ID (alternative to mr_iid)",
        },
      },
      required: ["jira_issue_key"],
    },
  };
}

export async function runCreateSubtaskFromMrReview(
  orchestrator: RelayOrchestrator,
  args: {
    jira_issue_key: string;
    merge_request_url?: string;
    project_id?: string;
    project_name?: string;
    mr_iid?: number;
    merge_request_id?: string;
  }
): Promise<string> {
  const result = await orchestrator.createSubtaskFromMrReview(args.jira_issue_key, {
    mergeRequestUrl: args.merge_request_url,
    projectId: args.project_id,
    projectName: args.project_name,
    mrIid: args.mr_iid,
    mergeRequestId: args.merge_request_id,
  });
  if (result.error) {
    return `Sub-task creation failed: ${result.error}`;
  }
  if (!result.created) {
    return `Sub-task was not created.${result.noteCount != null ? ` (MR had ${result.noteCount} note(s).)` : ""}`;
  }
  const keyPart = result.subtaskKey ? ` **${result.subtaskKey}**` : "";
  const notePart = result.noteCount != null ? ` (${result.noteCount} review note(s) on MR).` : "";
  return `Jira sub-task created${keyPart} under ${args.jira_issue_key} to address MR review feedback.${notePart}`;
}
