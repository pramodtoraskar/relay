/**
 * WorkflowManager — Orchestrates workflow using MCP only (Jira MCP, Git MCP, SQLite MCP).
 * No direct API or DB access; all integration goes through McpClientsManager.
 */

import { nanoid } from "nanoid";
import type { IRelayDb } from "./db-adapter.js";
import type { McpClientsManager } from "./mcp-clients.js";
import { analyzeReviewComments } from "./lib/ai-analyzer.js";
import * as JiraState from "./lib/jira-state.js";
import type { SmartHandoffResult } from "./types/orchestration-tools.js";
import type { ReviewReadinessResult, BlockerItem } from "./types/orchestration-tools.js";
import type { JiraIssueState, ResolvedTaskContext, StateValidationResult, JiraTransitionIntent } from "./types/orchestration-tools.js";

export interface MorningCheckinResult {
  pendingHandoffs: Array<{ id: string; title: string; from: string; summary: string | null }>;
  assignedIssues: Array<{ key: string; summary: string }>;
  currentBranch: string;
  recentCommits: Array<{ sha: string; message: string }>;
  activeSession: { id: string; jiraKey: string | null } | null;
  /** Set when Jira MCP call failed (e.g. 406, connection refused, tool not found). */
  jiraError?: string;
  /** Set when Git MCP call failed. */
  gitError?: string;
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
  /** If set with jiraIssueKey, add a Jira comment with the MR link before creating the handoff. */
  mergeRequestUrl?: string;
  /** Jira issue key to add MR comment to (e.g. from active session). Used with mergeRequestUrl. */
  jiraIssueKey?: string;
}

function defaultDeveloperId(): string {
  return process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
}

function parseJiraIssues(content: string): Array<{ key: string; summary: string }> {
  if (!content || !content.trim()) return [];
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data.map((i: any) => ({ key: i.key ?? i.id ?? "", summary: i.summary ?? i.fields?.summary ?? "" }));
    if (data?.issues) return data.issues.map((i: any) => ({ key: i.key ?? i.id ?? "", summary: i.fields?.summary ?? i.summary ?? "" }));
    if (data?.results && Array.isArray(data.results)) return data.results.map((i: any) => ({ key: i.key ?? i.id ?? "", summary: i.fields?.summary ?? i.summary ?? "" }));
    if (data?.key) return [{ key: data.key, summary: data.fields?.summary ?? data.summary ?? "" }];
    return [];
  } catch {
    // Some MCPs return plain text or markdown; extract issue keys (e.g. DDISMDPS-2305)
    const keys = content.match(/\b([A-Z][A-Z0-9]+-\d+)\b/g);
    if (keys) return [...new Set(keys)].map((key) => ({ key, summary: "" }));
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
  if (!content || /Git MCP disabled|Not a git repo/i.test(content)) return "";
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

  // --- Jira state awareness (used by BaseOrchestrationTool and all orchestration tools) ---

  /** Query Jira for current issue state. Use before any action. */
  async getJiraState(issueKey: string): Promise<JiraIssueState | null> {
    return JiraState.getJiraState(this.mcp, issueKey);
  }

  /** Resolve task context: auto-detect from active session if task_id not provided. */
  async resolveTaskContext(developerId: string, taskId?: string): Promise<ResolvedTaskContext | null> {
    return JiraState.resolveTaskContext(this.mcp, this.db, developerId ?? defaultDeveloperId(), taskId);
  }

  /** Validate a state transition is legal before performing it. */
  validateTransition(currentState: JiraIssueState, intent: JiraTransitionIntent, targetStatus?: string): StateValidationResult {
    return JiraState.validateTransition(currentState, intent, targetStatus);
  }

  /** Sync local state with Jira after actions (e.g. warn if Jira is Done but session still active). */
  async syncLocalStateWithJira(issueKey: string, jiraState: JiraIssueState, developerId: string): Promise<{ synced: boolean; message?: string }> {
    return JiraState.syncLocalStateWithJira(this.db, issueKey, jiraState, developerId ?? defaultDeveloperId());
  }

  /** Search Jira with JQL; returns issue keys and summaries. */
  async searchJira(jql: string, maxResults = 20): Promise<Array<{ key: string; summary: string }>> {
    const searchTool = await this.mcp.getJiraSearchTool();
    const res = await this.mcp.callJiraTool(searchTool, { jql, query: jql, max_results: maxResults, maxResults, limit: maxResults });
    if (res.isError || !res.content) return [];
    return parseJiraIssues(res.content);
  }

  /** List GitLab merge requests for a project. */
  async listMergeRequests(projectId: string, state: "opened" | "closed" | "merged" = "opened", limit = 20): Promise<Array<{ iid: number; title: string; web_url: string; state: string; source_branch: string; target_branch: string; created_at: string; updated_at: string }>> {
    const listMrTool = await this.mcp.getGitLabMergeRequestsTool();
    const res = await this.mcp.callGitTool(listMrTool, { project_id: projectId, project_name: projectId, state, limit });
    if (res.isError || !res.content) return [];
    try {
      const data = JSON.parse(res.content);
      const list = Array.isArray(data) ? data : data?.merge_requests ?? data?.results ?? [];
      return list.map((m: any) => ({
        iid: m.iid ?? m.iid,
        title: m.title ?? "",
        web_url: m.web_url ?? m.url ?? "",
        state: m.state ?? "opened",
        source_branch: m.source_branch ?? "",
        target_branch: m.target_branch ?? "",
        created_at: m.created_at ?? "",
        updated_at: m.updated_at ?? "",
      }));
    } catch {
      return [];
    }
  }

  /** Get MR notes/discussions for review comments. */
  async getMergeRequestNotes(projectId: string, mrIid: number): Promise<Array<{ body: string; author?: string; resolved?: boolean }>> {
    const notesTool = await this.mcp.getGitLabMrNotesTool();
    const res = await this.mcp.callGitTool(notesTool, { project_id: projectId, project_name: projectId, merge_request_iid: mrIid, iid: mrIid });
    if (res.isError || !res.content) return [];
    try {
      const data = JSON.parse(res.content);
      const notes = data?.notes ?? (Array.isArray(data) ? data : []);
      const discussions = data?.discussions ?? [];
      const out: Array<{ body: string; author?: string; resolved?: boolean }> = [];
      for (const n of notes) {
        if (n.system) continue;
        out.push({ body: n.body ?? "", author: n.author?.username, resolved: n.resolved });
      }
      for (const d of discussions) {
        for (const n of d.notes ?? []) {
          out.push({ body: n.body ?? "", author: n.author?.username, resolved: n.resolved });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

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

    const jql = "assignee = currentUser() AND status != Done ORDER BY updated DESC";
    const searchTool = await this.mcp.getJiraSearchTool();
    const searchArgs = { jql, query: jql, max_results: 20, maxResults: 20, limit: 20 };
    let jiraRes = await this.mcp.callJiraTool(searchTool, searchArgs);
    const assignedIssues = jiraRes.isError ? [] : parseJiraIssues(jiraRes.content);
    const jiraError = jiraRes.isError ? (jiraRes.content || "Unknown error").slice(0, 200) : undefined;

    const repoPath = process.cwd();
    const statusTool = await this.mcp.getGitStatusTool();
    const gitStatusRes = await this.mcp.callGitTool(statusTool, { repo_path: repoPath, path: repoPath, cwd: repoPath });
    const currentBranch = gitStatusRes.isError ? "" : parseGitBranch(gitStatusRes.content);

    const logTool = await this.mcp.getGitLogTool();
    const gitLogRes = await this.mcp.callGitTool(logTool, { repo_path: repoPath, path: repoPath, max_count: 5, limit: 5 });
    const recentCommits = gitLogRes.isError ? [] : parseGitLog(gitLogRes.content);
    const gitError = (gitStatusRes.isError || gitLogRes.isError)
      ? (gitStatusRes.isError ? gitStatusRes.content : gitLogRes.content || "Unknown error").slice(0, 200)
      : undefined;

    const rawSession = await this.db.getActiveSession(devId);
    const activeSession = rawSession ? { id: rawSession.id, jiraKey: rawSession.jira_issue_key } : null;

    return {
      pendingHandoffs,
      assignedIssues,
      currentBranch,
      recentCommits,
      activeSession,
      jiraError,
      gitError,
    };
  }

  async startTask(issueKey: string, microTaskTitles: string[], developerId?: string): Promise<StartTaskResult> {
    const devId = developerId ?? defaultDeveloperId();
    await this.db.ensureDeveloper(devId, devId);

    let summary = issueKey;
    const getIssueTool = await this.mcp.getJiraGetIssueTool();
    const getIssueArgs = { issue_key: issueKey, issueKey, key: issueKey };
    const jiraRes = await this.mcp.callJiraTool(getIssueTool, getIssueArgs);
    if (!jiraRes.isError && jiraRes.content) {
      const s = parseJiraIssueSummary(jiraRes.content);
      if (s) summary = s;
      const transitionTool = await this.mcp.getJiraTransitionTool();
      await this.mcp.callJiraTool(transitionTool, { issue_key: issueKey, issueKey, key: issueKey, transition_name: "In Progress", transitionName: "In Progress" }).catch(() => {});
    }

    const sessionId = nanoid();
    const repoPath = process.cwd();
    const statusTool = await this.mcp.getGitStatusTool();
    const gitStatusRes = await this.mcp.callGitTool(statusTool, { repo_path: repoPath, path: repoPath, cwd: repoPath });
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
      const transitionTool = await this.mcp.getJiraTransitionTool();
      await this.mcp.callJiraTool(transitionTool, {
        issue_key: session.jira_issue_key,
        issueKey: session.jira_issue_key,
        key: session.jira_issue_key,
        transition_name: "Done",
        transitionName: "Done",
      }).catch(() => {});
    }
  }

  /**
   * Add a comment to a Jira issue with the MR link. Uses Jira MCP (add_comment / create_comment).
   * Combined with GitLab: before handoff, add MR link into Jira so reviewers see it.
   */
  async addMrCommentToJira(
    issueKey: string,
    mergeRequestUrl: string,
    extraText?: string
  ): Promise<{ success: boolean; error?: string }> {
    const commentTool = await this.mcp.getJiraAddCommentTool();
    const body = extraText
      ? `${extraText}\n\nMR: ${mergeRequestUrl}`
      : `Merge request raised: ${mergeRequestUrl}`;
    const args = {
      issue_key: issueKey,
      issueKey,
      key: issueKey,
      comment: body,
      body,
      text: body,
    };
    const res = await this.mcp.callJiraTool(commentTool, args);
    return res.isError ? { success: false, error: res.content } : { success: true };
  }

  async createHandoff(input: CreateHandoffInput): Promise<string> {
    if (input.mergeRequestUrl && input.jiraIssueKey) {
      await this.addMrCommentToJira(
        input.jiraIssueKey,
        input.mergeRequestUrl,
        input.whatDone ? `Handoff: ${input.whatDone}` : undefined
      ).catch(() => {});
    }
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

  /**
   * Combined Jira + GitLab: check MR review comments; if any exist, create a Jira sub-task to address them.
   * Uses GitLab MCP for MR notes/discussions and Jira MCP for create issue/subtask.
   */
  async createSubtaskFromMrReview(
    parentIssueKey: string,
    options: {
      mergeRequestUrl?: string;
      projectId?: string;
      projectName?: string;
      mrIid?: number;
      mergeRequestId?: string;
    }
  ): Promise<{ subtaskKey?: string; created: boolean; noteCount?: number; error?: string }> {
    const notesTool = await this.mcp.getGitLabMrNotesTool();
    const projectId = options.projectId ?? options.projectName;
    const mrId = options.mrIid ?? options.mergeRequestId;
    let noteCount = 0;
    if (projectId != null && mrId != null) {
      const notesRes = await this.mcp.callGitTool(notesTool, {
        project_id: projectId,
        project_name: projectId,
        projectId,
        merge_request_iid: options.mrIid ?? mrId,
        merge_request_id: options.mergeRequestId ?? mrId,
        iid: options.mrIid ?? mrId,
      });
      if (!notesRes.isError && notesRes.content) {
        try {
          const data = JSON.parse(notesRes.content);
          const notes = Array.isArray(data) ? data : data?.notes ?? data?.discussions ?? [];
          noteCount = notes.length;
        } catch {
          if (notesRes.content.trim().length > 0) noteCount = 1;
        }
      }
    }
    const hadNotes = projectId != null && mrId != null;
    if (hadNotes && noteCount === 0) {
      return { created: false, noteCount: 0, error: "No review comments on MR; no sub-task created." };
    }
    const createTool = await this.mcp.getJiraCreateIssueTool();
    const summary =
      noteCount > 0 ? "Address MR review feedback" : "Address MR review feedback (create sub-task from review)";
    const description = options.mergeRequestUrl
      ? `MR: ${options.mergeRequestUrl}${noteCount > 0 ? `\n\nReview comments require changes.` : ""}`
      : noteCount > 0 ? "Review comments require changes." : "Sub-task created from MR review workflow.";
    const createArgs: Record<string, unknown> = {
      project: parentIssueKey.split("-")[0],
      parent: parentIssueKey,
      parentKey: parentIssueKey,
      summary,
      description,
      issueType: "Sub-task",
      issuetype: "Sub-task",
      type: "Sub-task",
    };
    const createRes = await this.mcp.callJiraTool(createTool, createArgs);
    if (createRes.isError) {
      return { created: false, noteCount: noteCount || undefined, error: createRes.content };
    }
    const keyMatch = createRes.content.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
    return {
      subtaskKey: keyMatch ? keyMatch[1] : undefined,
      created: true,
      noteCount: noteCount || undefined,
    };
  }

  /** Smart Handoff: find MR, analyze review comments, create sub-tasks, add Jira comment, create handoff record. */
  async smartHandoff(params: {
    task_id: string;
    from_dev: string;
    to_dev: string;
    auto_analyze?: boolean;
    custom_notes?: string;
    project_id?: string;
    project_name?: string;
    merge_request_url?: string;
    mr_iid?: number;
  }): Promise<SmartHandoffResult> {
    const actions: string[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // 1. Query Jira for current state before any action (CRITICAL: Jira state awareness)
    const jiraState = await this.getJiraState(params.task_id);
    if (!jiraState) {
      throw new Error(`Jira issue ${params.task_id} not found or Jira unavailable. Check the issue key and Jira MCP connection.`);
    }
    actions.push(`Jira state: ${jiraState.statusName} (${jiraState.statusCategory})`);

    // 2. Validate state transition: handoff from Done is unusual
    const validation = this.validateTransition(jiraState, "complete");
    if (!validation.valid && (jiraState.statusCategory?.toLowerCase() === "done" || jiraState.statusName?.toLowerCase() === "done")) {
      warnings.push("Issue is already Done; handoff may still be created for context transfer.");
    }

    const subTasksCreated: Array<{ key: string; summary: string; priority?: string }> = [];

    let mr: { iid: number; web_url: string; state: string; has_conflicts?: boolean; source_branch?: string; target_branch?: string; project_id?: number } | null = null;
    const projectId = params.project_id ?? params.project_name ?? process.env["RELAY_GITLAB_PROJECT"];
    if (projectId) {
      const listMrTool = await this.mcp.getGitLabMergeRequestsTool();
      const mrRes = await this.mcp.callGitTool(listMrTool, {
        project_id: projectId,
        project_name: projectId,
        state: "opened",
        limit: 20,
      });
      if (!mrRes.isError && mrRes.content) {
        let list: any[] = [];
        try {
          const data = JSON.parse(mrRes.content);
          list = Array.isArray(data) ? data : data?.merge_requests ?? data?.results ?? [];
        } catch {
          if (mrRes.content.trim()) list = [];
        }
        const taskId = params.task_id.toUpperCase();
        const match = list.find(
          (m: any) =>
            (m.title && String(m.title).toUpperCase().includes(taskId)) ||
            (m.source_branch && String(m.source_branch).toUpperCase().includes(taskId))
        ) ?? list[0];
        if (match) {
          mr = {
            iid: match.iid ?? match.iid,
            web_url: match.web_url ?? match.url ?? "",
            state: match.state ?? "opened",
            has_conflicts: match.has_conflicts,
            source_branch: match.source_branch,
            target_branch: match.target_branch,
            project_id: match.project_id,
          };
          actions.push(`Found GitLab MR !${mr.iid}`);
        }
      }
    }
    if (!mr && params.merge_request_url) {
      const iidMatch = params.merge_request_url.match(/merge_requests\/(\d+)/);
      mr = {
        iid: iidMatch ? parseInt(iidMatch[1], 10) : 0,
        web_url: params.merge_request_url,
        state: "opened",
      };
      actions.push("Using provided MR URL");
    }
    if (!mr) warnings.push("No GitLab MR found for this task");

    let reviewAnalysis: { changesRequested: boolean; requiredChanges: Array<{ summary: string; description: string; priority: string; estimatedMinutes: number; reviewerUsername?: string }>; unresolvedThreads: number; totalComments: number } | null = null;
    if (mr && params.auto_analyze !== false && (params.mr_iid ?? mr.iid) && (mr.project_id ?? projectId)) {
      const notesTool = await this.mcp.getGitLabMrNotesTool();
      const notesRes = await this.mcp.callGitTool(notesTool, {
        project_id: mr.project_id ?? projectId,
        project_name: projectId,
        merge_request_iid: params.mr_iid ?? mr.iid,
        iid: params.mr_iid ?? mr.iid,
      });
      if (!notesRes.isError && notesRes.content) {
        let notes: any[] = [];
        let discussions: any[] = [];
        try {
          const data = JSON.parse(notesRes.content);
          notes = data?.notes ?? (Array.isArray(data) ? data : []);
          discussions = data?.discussions ?? [];
        } catch {
          if (notesRes.content.trim().length > 0) notes = [{}];
        }
        reviewAnalysis = analyzeReviewComments({ notes, discussions });
        actions.push(`Analyzed ${reviewAnalysis.totalComments} review comment(s)`);
        const createTool = await this.mcp.getJiraCreateIssueTool();
        const projectKey = params.task_id.split("-")[0];
        for (const ch of reviewAnalysis.requiredChanges) {
          const summary = `[Review] ${ch.summary}`;
          const description = `${ch.description}\n\nMR: ${mr.web_url}`;
          const createRes = await this.mcp.callJiraTool(createTool, {
            project: projectKey,
            parent: params.task_id,
            parentKey: params.task_id,
            summary,
            description,
            issueType: "Sub-task",
            issuetype: "Sub-task",
            type: "Sub-task",
          });
          if (!createRes.isError && createRes.content) {
            const keyMatch = createRes.content.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
            if (keyMatch) {
              subTasksCreated.push({ key: keyMatch[1], summary: ch.summary, priority: ch.priority });
              nextSteps.push(`Address: ${ch.summary} (${keyMatch[1]})`);
            }
          }
        }
        if (subTasksCreated.length > 0) actions.push(`Created ${subTasksCreated.length} Jira sub-task(s) from review`);
      }
    }

    const mrUrl = mr?.web_url ?? params.merge_request_url;
    const commentParts: string[] = [`Handoff to **${params.to_dev}**`];
    if (reviewAnalysis?.changesRequested) commentParts.push(`Review: ${reviewAnalysis.unresolvedThreads} item(s) to address.`);
    if (subTasksCreated.length > 0) commentParts.push("Sub-tasks: " + subTasksCreated.map((s) => s.key).join(", "));
    if (params.custom_notes) commentParts.push(params.custom_notes);
    const extraComment = commentParts.join("\n");
    await this.addMrCommentToJira(params.task_id, mrUrl ?? params.task_id, extraComment).catch(() => {});
    actions.push("Added handoff comment to Jira");

    const activeSession = await this.getActiveSession(params.from_dev);
    const sessionDetails = activeSession?.jiraKey === params.task_id ? await this.db.getSession(activeSession.id) : null;
    const title = `Handoff: ${params.task_id} → ${params.to_dev}`;
    const handoffId = await this.createHandoff({
      fromDeveloperId: params.from_dev,
      toDeveloperId: params.to_dev,
      title,
      contextSummary: reviewAnalysis ? `${reviewAnalysis.unresolvedThreads} review item(s)` : undefined,
      whatDone: params.custom_notes ?? (mr ? `MR !${mr.iid} ready for review` : undefined),
      whatNext: nextSteps.length ? nextSteps.join("; ") : "Address review and push changes",
      branchName: sessionDetails?.branch_name ?? undefined,
      mergeRequestUrl: mrUrl,
      jiraIssueKey: params.task_id,
      workSessionId: activeSession?.jiraKey === params.task_id ? activeSession.id : undefined,
    });
    actions.push("Saved handoff record");

    if (nextSteps.length === 0) nextSteps.push("Review MR", "Address any comments", "Request re-review");

    // 3. Sync local state with Jira after actions (CRITICAL: Jira state awareness)
    const syncResult = await this.syncLocalStateWithJira(params.task_id, jiraState, params.from_dev);
    if (!syncResult.synced && syncResult.message) warnings.push(syncResult.message);

    const estimatedMinutes = reviewAnalysis?.requiredChanges?.reduce((s, c) => s + c.estimatedMinutes, 0) ?? 30;
    return {
      summary: `Handoff created to ${params.to_dev}`,
      actions_taken: actions,
      next_steps: nextSteps,
      data: {
        handoff_id: handoffId,
        task_id: params.task_id,
        merge_request: mr ? { iid: mr.iid, url: mr.web_url, state: mr.state, has_conflicts: mr.has_conflicts, source_branch: mr.source_branch, target_branch: mr.target_branch } : undefined,
        review_status: reviewAnalysis ? { changes_requested: reviewAnalysis.changesRequested, unresolved_threads: reviewAnalysis.unresolvedThreads, total_comments: reviewAnalysis.totalComments } : undefined,
        sub_tasks_created: subTasksCreated,
      },
      warnings: warnings.length ? warnings : undefined,
      estimated_effort_minutes: estimatedMinutes,
    };
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

  /** Review Readiness: check Jira sub-tasks, GitLab pipeline/conflicts, work session. */
  async reviewReadinessCheck(taskId: string, developerId?: string): Promise<ReviewReadinessResult> {
    const devId = developerId ?? defaultDeveloperId();
    const blockers: BlockerItem[] = [];
    const readiness: ReviewReadinessResult["data"]["readiness"] = {
      all_subtasks_complete: true,
      tests_passing: true,
      no_conflicts: true,
      session_complete: true,
    };

    // 1. Query Jira for current state before any action (CRITICAL: Jira state awareness)
    const jiraState = await this.getJiraState(taskId);
    if (!jiraState) {
      return {
        summary: `${taskId} not found or Jira unavailable`,
        actions_taken: [],
        next_steps: ["Check issue key", "Ensure Jira MCP is connected"],
        data: { readiness: { all_subtasks_complete: undefined, tests_passing: undefined, no_conflicts: undefined, session_complete: undefined }, blockers: [{ type: "jira", message: "Could not load Jira issue" }] },
      };
    }
    if (jiraState.statusCategory?.toLowerCase() === "done" || jiraState.statusName?.toLowerCase() === "done") {
      return {
        summary: `${taskId} is already Done`,
        actions_taken: [],
        next_steps: ["No review needed for completed issue"],
        data: { readiness: { all_subtasks_complete: true, tests_passing: true, no_conflicts: true, session_complete: true }, blockers: [{ type: "state", message: "Issue is Done" }] },
      };
    }

    const [statusTool, activeRow] = await Promise.all([
      this.mcp.getGitStatusTool(),
      this.db.getActiveSession(devId),
    ]);

    const incomplete = jiraState.subtasks.filter((s) => s.statusCategory?.toLowerCase() !== "done" && s.statusName?.toLowerCase() !== "done");
    if (incomplete.length > 0) {
      readiness.all_subtasks_complete = false;
      for (const s of incomplete) {
        blockers.push({ type: "incomplete_subtask", task: s.key, message: s.statusName });
      }
    }

    const gitStatusRes = await this.mcp.callGitTool(statusTool, { path: process.cwd(), repo_path: process.cwd() });

    if (activeRow?.jira_issue_key === taskId) {
      readiness.session_complete = false;
      blockers.push({ type: "active_session", message: "Close or hand off your work session before requesting review" });
    }

    if (!gitStatusRes.isError && gitStatusRes.content && /conflict|CONFLICT|diverged/i.test(gitStatusRes.content)) {
      readiness.no_conflicts = false;
      blockers.push({ type: "merge_conflict", message: "Resolve merge conflicts before requesting review" });
    } else if (gitStatusRes.isError) {
      readiness.no_conflicts = undefined;
    }

    let mrUrl: string | undefined;
    let pipelineOk: boolean | undefined;
    const projectId = process.env["RELAY_GITLAB_PROJECT"];
    if (projectId) {
      const listMrTool = await this.mcp.getGitLabMergeRequestsTool();
      const mrRes = await this.mcp.callGitTool(listMrTool, { project_id: projectId, state: "opened", limit: 10 });
      if (!mrRes.isError && mrRes.content) {
        try {
          const data = JSON.parse(mrRes.content);
          const list = Array.isArray(data) ? data : data?.merge_requests ?? [];
          const taskIdUpper = taskId.toUpperCase();
          const match = list.find((m: any) => (m.title && String(m.title).toUpperCase().includes(taskIdUpper)) || (m.source_branch && String(m.source_branch).toUpperCase().includes(taskIdUpper))) ?? list[0];
          if (match) {
            mrUrl = match.web_url ?? match.url;
            pipelineOk = match.pipeline ? match.pipeline.status === "success" : undefined;
            if (pipelineOk === false) {
              readiness.tests_passing = false;
              blockers.push({ type: "failing_test", message: "Pipeline not passing" });
            }
          }
        } catch {
          pipelineOk = undefined;
        }
      }
    } else {
      pipelineOk = undefined;
    }

    const allGood = readiness.all_subtasks_complete !== false && readiness.session_complete !== false && readiness.no_conflicts !== false && readiness.tests_passing !== false;
    return {
      summary: allGood ? `${taskId} is ready for review` : `${taskId} is not ready for review`,
      actions_taken: allGood ? ["Ready to request reviewers"] : [],
      next_steps: allGood ? ["Request reviewers on the MR", "Address any feedback"] : blockers.map((b) => (b.task ? `Complete ${b.task}` : b.message ?? b.type)),
      data: { readiness, blockers: blockers.length ? blockers : undefined, mr_url: mrUrl },
    };
  }

  /** Context Resurrection: last session + Jira + GitLab summary for returning developer. */
  async contextResurrection(developerId?: string): Promise<{
    summary: string;
    lastSession: { id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; ended_at: string | null } | null;
    jiraCurrentState?: { key: string; statusName: string; statusCategory: string };
    jiraUpdates: Array<{ task: string; change: string }>;
    conflicts: Array<{ reason: string }>;
    nextMicroTask?: string;
    activeSession: boolean;
  }> {
    const devId = developerId ?? defaultDeveloperId();
    const lastSessions = await this.db.getLastEndedSessions(devId, 3);
    const last = lastSessions[0] ?? null;
    if (!last) {
      return { summary: "No previous work sessions found.", lastSession: null, jiraUpdates: [], conflicts: [], activeSession: (await this.db.getActiveSession(devId)) != null };
    }

    // 1. Query Jira for current state (CRITICAL: Jira state awareness) — auto-detect context from last session
    const [microTasks, jiraState, gitStatusRes, activeRow] = await Promise.all([
      this.db.getMicroTasks(last.id),
      last.jira_issue_key ? this.getJiraState(last.jira_issue_key) : Promise.resolve(null),
      this.mcp.getGitStatusTool().then((name) => this.mcp.callGitTool(name, { path: process.cwd(), repo_path: process.cwd() })),
      this.db.getActiveSession(devId),
    ]);

    const jiraUpdates: Array<{ task: string; change: string }> = [];
    if (jiraState && last.jira_issue_key) {
      jiraUpdates.push({ task: last.jira_issue_key, change: `Current status: ${jiraState.statusName} (${jiraState.statusCategory})` });
      if (jiraState.updated) jiraUpdates.push({ task: last.jira_issue_key, change: `Last updated: ${jiraState.updated}` });
    }

    const conflicts: Array<{ reason: string }> = [];
    if (!gitStatusRes.isError && gitStatusRes.content && /conflict|CONFLICT|diverged/i.test(gitStatusRes.content)) {
      conflicts.push({ reason: "Merge conflicts or diverged branch" });
    }

    const nextMicro = microTasks.find((t) => t.status !== "done");
    return {
      summary: "Welcome back. Here's what happened while you were away.",
      lastSession: last,
      jiraCurrentState: jiraState ? { key: jiraState.key, statusName: jiraState.statusName, statusCategory: jiraState.statusCategory } : undefined,
      jiraUpdates,
      conflicts,
      nextMicroTask: nextMicro?.title,
      activeSession: activeRow != null,
    };
  }
}
