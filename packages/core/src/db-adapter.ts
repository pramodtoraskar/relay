/**
 * Database adapter that uses SQLite MCP (callDBTool) instead of direct better-sqlite3.
 * Implements the same interface as DatabaseManager for WorkflowManager.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { McpClientsManager } from "./mcp-clients.js";

export interface IRelayDb {
  ensureDeveloper(id: string, displayName: string, email?: string, jiraUserId?: string): Promise<void>;
  getActiveSession(developerId: string): Promise<{ id: string; jira_issue_key: string | null } | null>;
  getPendingHandoffs(developerId: string): Promise<Array<{ id: string; title: string; from_developer_id: string; context_summary: string | null; created_at: string }>>;
  createWorkSession(id: string, developerId: string, options: { jiraIssueKey?: string; jiraIssueSummary?: string; branchName?: string }): Promise<void>;
  addMicroTasks(sessionId: string, tasks: Array<{ id: string; title: string; sortOrder: number }>): Promise<void>;
  completeMicroTask(taskId: string): Promise<void>;
  endWorkSession(sessionId: string, status: "completed" | "handed_off" | "paused", options?: { mergeRequestUrl?: string; totalMinutes?: number }): Promise<void>;
  createHandoff(params: { id: string; fromDeveloperId: string; toDeveloperId: string; workSessionId: string | null; title: string; contextSummary?: string; whatDone?: string; whatNext?: string; branchName?: string; fileList?: string; blockersNotes?: string }): Promise<void>;
  addProgressLog(id: string, sessionId: string, note?: string, minutesLogged?: number, commitSha?: string): Promise<void>;
  getProgressLogs(sessionId: string, limit?: number): Promise<Array<{ id: string; note: string | null; minutes_logged: number; commit_sha: string | null; created_at: string }>>;
  getMicroTasks(sessionId: string): Promise<Array<{ id: string; title: string; status: string; sort_order: number }>>;
  getSession(sessionId: string): Promise<{ id: string; developer_id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; status: string; started_at: string } | null>;
  /** Last ended work session(s) for a developer (for context resurrection). */
  getLastEndedSessions(developerId: string, limit?: number): Promise<Array<{ id: string; developer_id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; status: string; started_at: string; ended_at: string | null }>>;
  /** Work sessions for a developer (for analytics). */
  getWorkSessionsForDeveloper(developerId: string, limit?: number): Promise<Array<{ id: string; jira_issue_key: string | null; started_at: string; ended_at: string | null; total_minutes: number | null; status: string }>>;
}

function parseQueryResult(content: string): { rows?: unknown[] } {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return { rows: parsed };
    if (parsed && Array.isArray(parsed.rows)) return { rows: parsed.rows };
    if (parsed && Array.isArray(parsed.results)) return { rows: parsed.results };
    return {};
  } catch {
    return {};
  }
}

/**
 * Relay DB implementation using SQLite MCP (query tool).
 */
export class McpDbAdapter implements IRelayDb {
  private mcp: McpClientsManager;
  private schemaDone = false;

  constructor(mcp: McpClientsManager) {
    this.mcp = mcp;
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaDone) return;
    const schemaPath = join(__dirname, "..", "database", "schema.sql");
    let schema: string;
    try {
      schema = readFileSync(schemaPath, "utf-8");
    } catch {
      return;
    }
    const stripped = schema.replace(/--[^\n]*/g, "");
    const parts = stripped.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    const statements: string[] = [];
    for (const p of parts) {
      if (statements.length && /^\s*END\s*$/i.test(p)) {
        statements[statements.length - 1] += ";\n" + p;
      } else {
        statements.push(p);
      }
    }
    for (const stmt of statements) {
      const res = await this.mcp.callDBTool("query", { sql: stmt + ";" });
      if (res.isError) throw new Error(`Schema statement failed: ${res.content}`);
    }
    this.schemaDone = true;
  }

  private async runQuery(sql: string, values: unknown[] = []): Promise<{ rows?: unknown[] }> {
    await this.ensureSchema();
    const res = await this.mcp.callDBTool("query", { sql, values });
    if (res.isError) throw new Error(res.content);
    return parseQueryResult(res.content);
  }

  private async runWrite(sql: string, values: unknown[] = []): Promise<void> {
    await this.ensureSchema();
    const res = await this.mcp.callDBTool("query", { sql, values });
    if (res.isError) throw new Error(res.content);
  }

  async ensureDeveloper(id: string, displayName: string, email?: string, jiraUserId?: string): Promise<void> {
    await this.runWrite(
      `INSERT INTO developers (id, display_name, email, jira_user_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email,
         jira_user_id = excluded.jira_user_id, updated_at = datetime('now')`,
      [id, displayName, email ?? null, jiraUserId ?? null]
    );
  }

  async getActiveSession(developerId: string): Promise<{ id: string; jira_issue_key: string | null } | null> {
    const { rows } = await this.runQuery(
      `SELECT id, jira_issue_key FROM work_sessions WHERE developer_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [developerId]
    );
    const row = rows?.[0] as { id: string; jira_issue_key: string | null } | undefined;
    return row ?? null;
  }

  async getPendingHandoffs(developerId: string): Promise<Array<{ id: string; title: string; from_developer_id: string; context_summary: string | null; created_at: string }>> {
    const { rows } = await this.runQuery(
      `SELECT id, title, from_developer_id, context_summary, created_at
       FROM handoffs WHERE to_developer_id = ? AND status = 'pending' ORDER BY created_at DESC`,
      [developerId]
    );
    return (rows ?? []) as Array<{ id: string; title: string; from_developer_id: string; context_summary: string | null; created_at: string }>;
  }

  async createWorkSession(id: string, developerId: string, options: { jiraIssueKey?: string; jiraIssueSummary?: string; branchName?: string }): Promise<void> {
    await this.runWrite(
      `INSERT INTO work_sessions (id, developer_id, jira_issue_key, jira_issue_summary, branch_name, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [id, developerId, options.jiraIssueKey ?? null, options.jiraIssueSummary ?? null, options.branchName ?? null]
    );
  }

  async addMicroTasks(sessionId: string, tasks: Array<{ id: string; title: string; sortOrder: number }>): Promise<void> {
    for (const t of tasks) {
      await this.runWrite(`INSERT INTO micro_tasks (id, work_session_id, title, sort_order) VALUES (?, ?, ?, ?)`, [
        t.id,
        sessionId,
        t.title,
        t.sortOrder,
      ]);
    }
  }

  async completeMicroTask(taskId: string): Promise<void> {
    await this.runWrite(`UPDATE micro_tasks SET status = 'done', completed_at = datetime('now') WHERE id = ?`, [taskId]);
  }

  async endWorkSession(sessionId: string, status: "completed" | "handed_off" | "paused", options?: { mergeRequestUrl?: string; totalMinutes?: number }): Promise<void> {
    await this.runWrite(
      `UPDATE work_sessions SET status = ?, ended_at = datetime('now'), merge_request_url = ?, total_minutes = ? WHERE id = ?`,
      [status, options?.mergeRequestUrl ?? null, options?.totalMinutes ?? null, sessionId]
    );
  }

  async createHandoff(params: {
    id: string;
    fromDeveloperId: string;
    toDeveloperId: string;
    workSessionId: string | null;
    title: string;
    contextSummary?: string;
    whatDone?: string;
    whatNext?: string;
    branchName?: string;
    fileList?: string;
    blockersNotes?: string;
  }): Promise<void> {
    await this.runWrite(
      `INSERT INTO handoffs (id, from_developer_id, to_developer_id, work_session_id, title,
       context_summary, what_done, what_next, branch_name, file_list, blockers_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        params.id,
        params.fromDeveloperId,
        params.toDeveloperId,
        params.workSessionId,
        params.title,
        params.contextSummary ?? null,
        params.whatDone ?? null,
        params.whatNext ?? null,
        params.branchName ?? null,
        params.fileList ?? null,
        params.blockersNotes ?? null,
      ]
    );
  }

  async addProgressLog(id: string, sessionId: string, note?: string, minutesLogged?: number, commitSha?: string): Promise<void> {
    await this.runWrite(
      `INSERT INTO progress_logs (id, work_session_id, note, minutes_logged, commit_sha) VALUES (?, ?, ?, ?, ?)`,
      [id, sessionId, note ?? null, minutesLogged ?? 0, commitSha ?? null]
    );
  }

  async getProgressLogs(sessionId: string, limit = 10): Promise<Array<{ id: string; note: string | null; minutes_logged: number; commit_sha: string | null; created_at: string }>> {
    const { rows } = await this.runQuery(
      `SELECT id, note, minutes_logged, commit_sha, created_at FROM progress_logs WHERE work_session_id = ? ORDER BY created_at DESC LIMIT ?`,
      [sessionId, limit]
    );
    return (rows ?? []) as Array<{ id: string; note: string | null; minutes_logged: number; commit_sha: string | null; created_at: string }>;
  }

  async getMicroTasks(sessionId: string): Promise<Array<{ id: string; title: string; status: string; sort_order: number }>> {
    const { rows } = await this.runQuery(
      `SELECT id, title, status, sort_order FROM micro_tasks WHERE work_session_id = ? ORDER BY sort_order`,
      [sessionId]
    );
    return (rows ?? []) as Array<{ id: string; title: string; status: string; sort_order: number }>;
  }

  async getSession(sessionId: string): Promise<{ id: string; developer_id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; status: string; started_at: string } | null> {
    const { rows } = await this.runQuery(`SELECT id, developer_id, jira_issue_key, jira_issue_summary, branch_name, status, started_at FROM work_sessions WHERE id = ?`, [sessionId]);
    const row = rows?.[0];
    return (row as any) ?? null;
  }

  async getLastEndedSessions(
    developerId: string,
    limit = 5
  ): Promise<Array<{ id: string; developer_id: string; jira_issue_key: string | null; jira_issue_summary: string | null; branch_name: string | null; status: string; started_at: string; ended_at: string | null }>> {
    const { rows } = await this.runQuery(
      `SELECT id, developer_id, jira_issue_key, jira_issue_summary, branch_name, status, started_at, ended_at
       FROM work_sessions WHERE developer_id = ? AND status != 'active' AND ended_at IS NOT NULL
       ORDER BY ended_at DESC LIMIT ?`,
      [developerId, limit]
    );
    return (rows ?? []) as Array<{
      id: string;
      developer_id: string;
      jira_issue_key: string | null;
      jira_issue_summary: string | null;
      branch_name: string | null;
      status: string;
      started_at: string;
      ended_at: string | null;
    }>;
  }

  async getWorkSessionsForDeveloper(
    developerId: string,
    limit = 50
  ): Promise<Array<{ id: string; jira_issue_key: string | null; started_at: string; ended_at: string | null; total_minutes: number | null; status: string }>> {
    const { rows } = await this.runQuery(
      `SELECT id, jira_issue_key, started_at, ended_at, total_minutes, status
       FROM work_sessions WHERE developer_id = ? ORDER BY started_at DESC LIMIT ?`,
      [developerId, limit]
    );
    return (rows ?? []) as Array<{ id: string; jira_issue_key: string | null; started_at: string; ended_at: string | null; total_minutes: number | null; status: string }>;
  }
}
