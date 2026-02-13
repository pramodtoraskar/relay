import { nanoid } from "nanoid";
import { DatabaseManager } from "./database-manager.js";
import { JiraClient } from "./jira-client.js";
import { GitClient } from "./git-client.js";

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

/**
 * Orchestrates workflow operations: check-in, start task, handoffs, etc.
 */
export class WorkflowManager {
  constructor(
    private db: DatabaseManager,
    private jira: JiraClient,
    private git: GitClient
  ) {}

  /** Default developer id when not provided (e.g. from env RELAY_DEVELOPER_ID or machine user). */
  private defaultDeveloperId(): string {
    return (
      process.env["RELAY_DEVELOPER_ID"] ??
      process.env["USER"] ??
      "default"
    );
  }

  async morningCheckin(developerId?: string): Promise<MorningCheckinResult> {
    const devId = developerId ?? this.defaultDeveloperId();
    this.db.ensureDeveloper(devId, devId);

    const pendingHandoffs = this.db
      .getPendingHandoffs(devId)
      .map((h) => ({
        id: h.id,
        title: h.title,
        from: h.from_developer_id,
        summary: h.context_summary,
      }));

    const assignedIssues = this.jira.isConfigured()
      ? (await this.jira.getAssignedIssues()).map((i) => ({
          key: i.key,
          summary: i.summary,
        }))
      : [];

    const currentBranch = this.git.isRepository() ? this.git.getCurrentBranch() : "";
    const recentCommits = this.git.isRepository() ? this.git.getRecentCommits(5) : [];
    const rawSession = this.db.getActiveSession(devId);
    const activeSession = rawSession
      ? { id: rawSession.id, jiraKey: rawSession.jira_issue_key }
      : null;

    return {
      pendingHandoffs,
      assignedIssues,
      currentBranch,
      recentCommits,
      activeSession,
    };
  }

  async startTask(
    issueKey: string,
    microTaskTitles: string[],
    developerId?: string
  ): Promise<StartTaskResult> {
    const devId = developerId ?? this.defaultDeveloperId();
    this.db.ensureDeveloper(devId, devId);

    let summary = issueKey;
    if (this.jira.isConfigured()) {
      const issue = await this.jira.getIssue(issueKey);
      if (issue) {
        summary = issue.summary;
        await this.jira.transitionIssue(issueKey, "In Progress");
      }
    }

    const sessionId = nanoid();
    const suggestedBranch = this.git.isRepository()
      ? this.git.suggestBranchName(issueKey, summary)
      : `feature/${issueKey}`;

    this.db.createWorkSession(sessionId, devId, {
      jiraIssueKey: issueKey,
      jiraIssueSummary: summary,
      branchName: suggestedBranch,
    });

    const tasks = microTaskTitles.length
      ? microTaskTitles.map((title, i) => ({ id: nanoid(), title, sortOrder: i }))
      : [{ id: nanoid(), title: "Implement and test", sortOrder: 0 }];

    this.db.addMicroTasks(
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

  updateProgress(
    sessionId: string,
    note?: string,
    minutesLogged?: number,
    commitSha?: string,
    microTaskId?: string
  ): void {
    if (microTaskId) this.db.completeMicroTask(microTaskId);
    this.db.addProgressLog(nanoid(), sessionId, note, minutesLogged, commitSha);
  }

  completeTask(
    sessionId: string,
    mergeRequestUrl?: string,
    totalMinutes?: number
  ): void {
    this.db.endWorkSession(sessionId, "completed", {
      mergeRequestUrl,
      totalMinutes,
    });
    const session = this.db.getSession(sessionId);
    if (session?.jira_issue_key && this.jira.isConfigured())
      this.jira.transitionIssue(session.jira_issue_key, "Done");
  }

  createHandoff(input: CreateHandoffInput): string {
    this.db.ensureDeveloper(input.fromDeveloperId, input.fromDeveloperId);
    this.db.ensureDeveloper(input.toDeveloperId, input.toDeveloperId);
    const id = nanoid();
    this.db.createHandoff({
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
    if (input.workSessionId)
      this.db.endWorkSession(input.workSessionId, "handed_off");
    return id;
  }

  async endOfDay(developerId?: string): Promise<MorningCheckinResult & { message: string }> {
    const devId = developerId ?? this.defaultDeveloperId();
    const checkin = await this.morningCheckin(devId);
    const message =
      checkin.activeSession != null
        ? "You have an active work session. Consider creating a handoff or completing the task before EOD."
        : "No active session. You're all set for EOD.";
    return { ...checkin, message };
  }

  getActiveSession(developerId?: string): { id: string; jiraKey: string | null } | null {
    const row = this.db.getActiveSession(developerId ?? this.defaultDeveloperId());
    return row ? { id: row.id, jiraKey: row.jira_issue_key } : null;
  }

  getMicroTasks(sessionId: string) {
    return this.db.getMicroTasks(sessionId);
  }

  /** Get current task list and progress for the developer (active session, micro-tasks, recent progress). */
  getTaskStatus(developerId?: string): {
    activeSession: { id: string; jiraKey: string | null } | null;
    sessionDetails: {
      id: string;
      jira_issue_key: string | null;
      jira_issue_summary: string | null;
      branch_name: string | null;
      status: string;
      started_at: string;
    } | null;
    microTasks: Array<{ id: string; title: string; status: string; sort_order: number }>;
    progressLogs: Array<{
      id: string;
      note: string | null;
      minutes_logged: number;
      commit_sha: string | null;
      created_at: string;
    }>;
  } {
    const devId = developerId ?? this.defaultDeveloperId();
    const activeSession = this.getActiveSession(devId);
    if (!activeSession) {
      return {
        activeSession: null,
        sessionDetails: null,
        microTasks: [],
        progressLogs: [],
      };
    }
    const sessionDetails = this.db.getSession(activeSession.id);
    const microTasks = this.db.getMicroTasks(activeSession.id);
    const progressLogs = this.db.getProgressLogs(activeSession.id, 10);
    return {
      activeSession,
      sessionDetails,
      microTasks,
      progressLogs,
    };
  }
}
