/**
 * Context Resurrection — Recover context after time away.
 * Category: Work Sessions. MCPs: Jira + GitLab + SQLite.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";

export function contextResurrectionTool(): Tool {
  return {
    name: "context_resurrection",
    description: `Get your context back after time away.

I'll look at:
- Your last work session (what you were doing)
- Jira: Any updates on your task since then
- GitLab: Branch status and any conflicts

You'll get a short summary of where you left off and what changed while you were away.`,
    inputSchema: {
      type: "object",
      properties: {
        dev_name: {
          type: "string",
          description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)",
        },
        days_away: {
          type: "number",
          description: "Optional: number of days away (used for messaging)",
        },
      },
    },
  };
}

export async function runContextResurrection(
  orchestrator: RelayOrchestrator,
  args: { dev_name?: string; days_away?: number }
): Promise<string> {
  const devId = args.dev_name ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
  const wm = orchestrator.getWorkflowManager();
  const result = await wm.contextResurrection(devId);

  if (!result.lastSession) {
    return "No previous work sessions found. Start with **start_task** or **whats_up** to see your current context.";
  }

  const last = result.lastSession;
  const microTasks = await wm.getMicroTasks(last.id);
  const doneCount = microTasks.filter((t) => t.status === "done").length;
  const totalCount = microTasks.length;
  const progress = totalCount ? `${doneCount}/${totalCount} micro-tasks complete` : "No micro-tasks";

  const lines: string[] = [
    "**Welcome back.** Here's what happened while you were away.",
    "",
    "**Last session**",
    `- Task: ${last.jira_issue_key ?? "—"} ${last.jira_issue_summary ? `— ${last.jira_issue_summary}` : ""}`,
    `- Ended: ${last.ended_at ?? "—"}`,
    `- Progress: ${progress}`,
    `- Branch: ${last.branch_name ?? "—"}`,
    "",
    "**Where you left off**",
    `- ${last.jira_issue_summary ?? last.jira_issue_key ?? "Previous task"}`,
  ];
  if (result.nextMicroTask) lines.push(`- Next micro-task: ${result.nextMicroTask}`);
  if (result.jiraUpdates.length) {
    lines.push("", "**Jira updates**", ...result.jiraUpdates.map((u) => `- ${u.task}: ${u.change}`));
  }
  if (result.conflicts.length) {
    lines.push("", "**Conflicts**", ...result.conflicts.map((c) => `- ${c.reason}`));
  }
  if (result.activeSession) {
    lines.push("", "You have an active session; consider **handoff_task** or **complete_task** if switching context.");
  }
  lines.push("", "**Next steps**", "- Run **whats_up** for full status", "- Run **start_task** to continue with the same or a new task");
  return lines.join("\n");
}
