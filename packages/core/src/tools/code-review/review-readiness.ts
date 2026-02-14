/**
 * Review Readiness Check — Is this task ready for code review?
 * Category: Code Review. MCPs: Jira + GitLab + SQLite.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";

export function reviewReadinessTool(): Tool {
  return {
    name: "review_readiness_check",
    description: `Check if a task is ready for code review.

I'll check:
- Jira: Are all sub-tasks complete?
- GitLab: Are tests passing? Any merge conflicts?
- Your work session: Is it complete or handed off?

If ready, I'll suggest next steps (e.g. request reviewers). If not, I'll list exactly what to fix.`,
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "Jira task ID (e.g. PROJ-42)",
        },
        dev_name: {
          type: "string",
          description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)",
        },
      },
      required: ["task_id"],
    },
  };
}

export async function runReviewReadinessCheck(
  orchestrator: RelayOrchestrator,
  args: { task_id: string; dev_name?: string }
): Promise<string> {
  const devId = args.dev_name ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
  const wm = orchestrator.getWorkflowManager();
  const result = await wm.reviewReadinessCheck(args.task_id, devId);

  const lines: string[] = [`**${result.summary}**`, ""];
  if (result.data.blockers?.length) {
    lines.push("**Blockers:**", ...result.data.blockers.map((b) => `- ${b.message ?? b.type}${b.task ? ` (${b.task})` : ""}`), "");
  }
  lines.push(
    "**Checks:**",
    `- Sub-tasks complete: ${result.data.readiness.all_subtasks_complete !== false ? "Yes" : "No"}`,
    `- Session complete: ${result.data.readiness.session_complete !== false ? "Yes" : "No"}`,
    `- No conflicts: ${result.data.readiness.no_conflicts !== false ? "Yes" : "No"}`,
    `- Tests/pipeline: ${result.data.readiness.tests_passing === undefined ? "Unknown" : result.data.readiness.tests_passing ? "Passing" : "Failing"}`
  );
  if (result.data.mr_url) lines.push("", `MR: ${result.data.mr_url}`);
  lines.push("", "**Next steps:**", ...result.next_steps.map((s) => `- ${s}`));
  return lines.join("\n");
}
