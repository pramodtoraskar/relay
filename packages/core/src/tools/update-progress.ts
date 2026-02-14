import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function updateProgressTool(_wm: WorkflowManager): Tool {
  return {
    name: "log_work",
    description:
      "Log work / Update status. Add a note, log time, link a commit, or mark a micro-task done on the current work session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Work session id" },
        note: { type: "string", description: "Progress note" },
        minutes_logged: { type: "number", description: "Minutes to log" },
        commit_sha: { type: "string", description: "Git commit SHA to link" },
        complete_micro_task_id: {
          type: "string",
          description: "Micro-task id to mark done",
        },
        developer_id: { type: "string" },
      },
      required: ["session_id"],
    },
  };
}

export async function runUpdateProgress(
  wm: WorkflowManager,
  args: {
    session_id: string;
    note?: string;
    minutes_logged?: number;
    commit_sha?: string;
    complete_micro_task_id?: string;
    developer_id?: string;
  }
): Promise<string> {
  await wm.updateProgress(
    args.session_id,
    args.note,
    args.minutes_logged,
    args.commit_sha,
    args.complete_micro_task_id
  );
  const tasks = await wm.getMicroTasks(args.session_id);
  const done = tasks.filter((t) => t.status === "done").length;
  return `Progress updated. Micro-tasks: ${done}/${tasks.length} done.`;
}
