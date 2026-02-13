/**
 * WorkflowManager — Orchestrates workflow using MCP only (Jira MCP, Git MCP, SQLite MCP).
 * No direct API or DB access; all integration goes through McpClientsManager.
 */

import { nanoid } from "nanoid";
import type { IRelayDb } from "./db-adapter.js";
import type { McpClientsManager } from "./mcp-clients.js";

export interface MorningCheckinResult {
  pendingHandoffs: Array<{ id: string; title: string; from: string; summary: string | null }>;
  assignedIssues: Array<{ key: string; summary: string }>;
  currentBranch: string;
  recentCommits: Array<{ sha: string; message: string }>;
  activeSession: { id: string; jiraKey: string | null } | null;
}

export interface StartTaskResult {
  sessionId: string;
  issueKey: string;
  summary: string;
  suggestedBranch: string;
  microTasks: Array<{ id: string; title: string }>;
}

export interface CreateHandoffInput {
  fromDeveloperId: string;
  toDeveloperId: string;
  title: string;
  contextSummary?: string;
  whatDone?: string;
  whatNext?: string;
  branchName?: string;
  fileList?: string;
  blockersNotes?: string;
  workSessionId?: string;
}

function defaultDeveloperId(): string {
  return process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
}

function parseJiraIssues(content: string): Array<{ key: string; summary: string }> {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data.map((i: any) => ({ key: i.key ?? i.id ?? "", summary: i.summary ?? i.fields?.summary ?? "" }));
    if (data?.issues) return data.issues.map((i: any) => ({ key: i.key ?? i.id ?? "", summary: i.fields?.summary ?? i.summary ?? "" }));
    if (data?.key) return [{ key: data.key, summary: data.fields?.summary ?? data.summary ?? "" }];
    return [];
  } catch {
    return [];
  }
}

function parseJiraIssueSummary(content: string): string | null {
  try {
    const data = JSON.parse(content);
    return data?.fields?.summary ?? data?.summary ?? data?.key ?? null;
  } catch {
    return null;
  }
}

function parseGitLog(content: string): Array<{ sha: string; message: string }> {
  const lines = content.trim().split("\n").filter(Boolean);
  return lines.slice(0, 10).map((line) => {
    const firstSpace = line.indexOf(" ");
    const sha = firstSpace > 0 ? line.slice(0, firstSpace).trim() : line.trim();
    const message = firstSpace > 0 ? line.slice(firstSpace + 1).trim() : "";
    return { sha, message };
  });
}

function parseGitBranch(content: string): string {
  const match = content.match(/On branch (\S+)/i) || content.match(/^\*?\s*(\S+)/);
  return match ? match[1].trim() : "";
}

/**
 * Orchestrates workflow by calling Jira MCP, Git MCP, and SQLite MCP.
 */
export class WorkflowManager {
  constructor(
    private db: IRelayDb,
    private mcp: McpClientsManager
  ) {}

  async morningCheckin(developerId?: string): Promise<MorningCheckinResult> {
    const devId = developerId ?? defaultDeveloperId();
    await this.db.ensureDeveloper(devId, devId);

    const pendingHandoffsRaw = await this.db.getPendingHandoffs(devId);
    const pendingHandoffs = pendingHandoffsRaw.map((h) => ({
      id: h.id,
      title: h.title,
      from: h.from_developer_id,
      summary: h.context_summary,
    }));

    const jiraRes = await this.mcp.callJiraTool("search_issues", {
      jql: "assignee = currentUser() AND status != Done ORDER BY updated DESC",
      max_results: 20,
    });
    const assignedIssues = jiraRes.isError ? [] : parseJiraIssues(jiraRes.content);

    const gitStatusRes = await this.mcp.callGitTool("git_status", { repo_path: process.cwd() });
    const currentBranch = gitStatusRes.isError ? "" : parseGitBranch(gitStatusRes.content);

    const gitLogRes = await this.mcp.callGitTool("git_log", { repo_path: process.cwd(), max_count: 5 });
    const recentCommits = gitLogRes.isError ? [] : parseGitLog(gitLogRes.content);

    const rawSession = await this.db.getActiveSession(devId);
    const activeSession = rawSession ? { id: rawSession.id, jiraKey: rawSession.jira_issue_key } : null;

    return {
      pendingHandoffs,
      assignedIssues,
      currentBranch,
      recentCommits,
      activeSession,
    };
  }

  async startTask(issueKey: string, microTaskTitles: string[], developerId?: string): Promise<StartTaskResult> {
    const devId = developerId ?? defaultDeveloperId();
    await this.db.ensureDeveloper(devId, devId);

    let summary = issueKey;
    const jiraRes = await this.mcp.callJiraTool("get_jira", { issue_key: issueKey });
    if (!jiraRes.isError && jiraRes.content) {
      const s = parseJiraIssueSummary(jiraRes.content);
      if (s) summary = s;
      await this.mcp.callJiraTool("transition_issue", { issue_key: issueKey, transition_name: "In Progress" }).catch(() => {});
    }

    const sessionId = nanoid();
    const gitStatusRes = await this.mcp.callGitTool("git_status", { repo_path: process.cwd() });
    const currentBranch = parseGitBranch(gitStatusRes.content || "");
    const safe = summary.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 30);
    const suggestedBranch = currentBranch ? `feature/${issueKey}-${safe}`.toLowerCase() : `feature/${issueKey}`;

    await this.db.createWorkSession(sessionId, devId, {
      jiraIssueKey: issueKey,
      jiraIssueSummary: summary,
      branchName: suggestedBranch,
    });

    const tasks =
      microTaskTitles.length > 0
        ? microTaskTitles.map((title, i) => ({ id: nanoid(), title, sortOrder: i }))
        : [{ id: nanoid(), title: "Implement and test", sortOrder: 0 }];

    await this.db.addMicroTasks(
      sessionId,
      tasks.map((t) => ({ id: t.id, title: t.title, sortOrder: t.sortOrder }))
    );

    return {
      sessionId,
      issueKey,
      summary,
      suggestedBranch,
      microTasks: tasks.map((t) => ({ id: t.id, title: t.title })),
    };
  }

  async updateProgress(sessionId: string, note?: string, minutesLogged?: number, commitSha?: string, microTaskId?: string): Promise<void> {
    if (microTaskId) await this.db.completeMicroTask(microTaskId);
    await this.db.addProgressLog(nanoid(), sessionId, note, minutesLogged, commitSha);
  }

  async completeTask(sessionId: string, mergeRequestUrl?: string, totalMinutes?: number): Promise<void> {
    await this.db.endWorkSession(sessionId, "completed", { mergeRequestUrl, totalMinutes });
    const session = await this.db.getSession(sessionId);
    if (session?.jira_issue_key) {
      await this.mcp.callJiraTool("transition_issue", { issue_key: session.jira_issue_key, transition_name: "Done" }).catch(() => {});
    }
  }

  async createHandoff(input: CreateHandoffInput): Promise<string> {
    await this.db.ensureDeveloper(input.fromDeveloperId, input.fromDeveloperId);
    await this.db.ensureDeveloper(input.toDeveloperId, input.toDeveloperId);
    const id = nanoid();
    await this.db.createHandoff({
      id,
      fromDeveloperId: input.fromDeveloperId,
      toDeveloperId: input.toDeveloperId,
      workSessionId: input.workSessionId ?? null,
      title: input.title,
      contextSummary: input.contextSummary,
      whatDone: input.whatDone,
      whatNext: input.whatNext,
      branchName: input.branchName,
      fileList: input.fileList,
      blockersNotes: input.blockersNotes,
    });
    if (input.workSessionId) await this.db.endWorkSession(input.workSessionId, "handed_off");
    return id;
  }

  async endOfDay(developerId?: string): Promise<MorningCheckinResult & { message: string }> {
    const devId = developerId ?? defaultDeveloperId();
    const checkin = await this.morningCheckin(devId);
    const message =
      checkin.activeSession != null
        ? "You have an active work session. Consider creating a handoff or completing the task before EOD."
        : "No active session. You're all set for EOD.";
    return { ...checkin, message };
  }

  async getActiveSession(developerId?: string): Promise<{ id: string; jiraKey: string | null } | null> {
    const row = await this.db.getActiveSession(developerId ?? defaultDeveloperId());
    return row ? { id: row.id, jiraKey: row.jira_issue_key } : null;
  }

  async getMicroTasks(sessionId: string) {
    return this.db.getMicroTasks(sessionId);
  }

  async getTaskStatus(developerId?: string): Promise<{
    activeSession: { id: string; jiraKey: string | null } | null;
    sessionDetails: { id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; status: string; started_at: string } | null;
    microTasks: Array<{ id: string; title: string; status: string; sort_order: number }>;
    progressLogs: Array<{ id: string; note: string | null; minutes_logged: number; commit_sha: string | null; created_at: string }>;
  }> {
    const devId = developerId ?? defaultDeveloperId();
    const activeSession = await this.getActiveSession(devId);
    if (!activeSession) {
      return { activeSession: null, sessionDetails: null, microTasks: [], progressLogs: [] };
    }
    const sessionDetails = await this.db.getSession(activeSession.id);
    const microTasks = await this.db.getMicroTasks(activeSession.id);
    const progressLogs = await this.db.getProgressLogs(activeSession.id, 10);
    return {
      activeSession,
      sessionDetails,
      microTasks,
      progressLogs,
    };
  }
}
