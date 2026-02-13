import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { WorkflowManager } from "../workflow-manager.js";

export function morningCheckinTool(_wm: WorkflowManager): Tool {
  return {
    name: "morning_checkin",
    description:
      "Run a morning check-in: list pending handoffs (from overnight), assigned Jira issues, current Git branch, and recent commits. Recommends priority order.",
    inputSchema: {
      type: "object",
      properties: {
        developer_id: {
          type: "string",
          description: "Optional developer id (defaults to RELAY_DEVELOPER_ID or current user)",
        },
      },
    },
  };
}

export async function runMorningCheckin(
  wm: WorkflowManager,
  args: { developer_id?: string }
): Promise<string> {
  const result = await wm.morningCheckin(args.developer_id);
  const lines: string[] = [
    "## Morning check-in",
    "",
    "### Pending handoffs",
    result.pendingHandoffs.length
      ? result.pendingHandoffs
          .map(
            (h) => `- **${h.title}** (from ${h.from})${h.summary ? ` — ${h.summary}` : ""}`
          )
          .join("\n")
      : "None.",
    "",
    "### Assigned Jira issues",
    result.assignedIssues.length
      ? result.assignedIssues.map((i) => `- ${i.key}: ${i.summary}`).join("\n")
      : "None (or Jira not configured).",
    "",
    "### Git",
    `- Branch: ${result.currentBranch || "N/A"}`,
    result.recentCommits.length
      ? "Recent commits:\n" +
        result.recentCommits.map((c) => `  - ${c.sha.slice(0, 7)} ${c.message}`).join("\n")
      : "",
    "",
  ];
  if (result.activeSession) {
    lines.push(
      `**Active session:** ${result.activeSession.id} (${result.activeSession.jiraKey ?? "no Jira key"}). Consider continuing or creating a handoff.`
    );
    const status = await wm.getTaskStatus(args.developer_id);
    if (status.microTasks.length > 0) {
      const doneCount = status.microTasks.filter((t) => t.status === "done").length;
      lines.push("", "### Current task progress", `Micro-tasks: ${doneCount}/${status.microTasks.length} done`);
      status.microTasks.forEach((t) =>
        lines.push(`- ${t.status === "done" ? "✓" : "○"} ${t.title}`)
      );
      if (status.progressLogs.length > 0) {
        lines.push("", "Recent progress:");
        status.progressLogs.slice(0, 3).forEach((l) => {
          const note = l.note ? ` ${l.note}` : "";
          const mins = l.minutes_logged ? ` (${l.minutes_logged}m)` : "";
          lines.push(`- ${l.created_at}${mins}${note}`);
        });
      }
    }
  }
  return lines.join("\n").trim();
}
