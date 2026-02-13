import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const RELAY_DB_ENV = "RELAY_DB_PATH";

/**
 * Manages the local SQLite database for work sessions, micro-tasks, and handoffs.
 * Database path is configurable via RELAY_DB_PATH (default: ~/.relay/relay.db).
 */
export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath =
      dbPath ??
      process.env[RELAY_DB_ENV] ??
      join(process.env.HOME ?? process.env.USERPROFILE ?? ".", ".relay", "relay.db");
    this.db = new Database(this.dbPath, { timeout: 10000 });
    this.db.pragma("journal_mode = WAL");
    this.ensureSchema();
  }

  /** Initialize schema from schema.sql if tables don't exist. */
  private ensureSchema(): void {
    const schemaPath = join(__dirname, "..", "database", "schema.sql");
    try {
      const schema = readFileSync(schemaPath, "utf-8");
      this.db.exec(schema);
    } catch {
      // Fallback: run embedded minimal schema if file missing (e.g. after bundle)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS developers (
          id TEXT PRIMARY KEY, display_name TEXT NOT NULL, email TEXT, jira_user_id TEXT,
          created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS work_sessions (
          id TEXT PRIMARY KEY, developer_id TEXT NOT NULL, jira_issue_key TEXT, jira_issue_summary TEXT,
          branch_name TEXT, started_at TEXT NOT NULL DEFAULT (datetime('now')), ended_at TEXT,
          status TEXT NOT NULL DEFAULT 'active', merge_request_url TEXT, total_minutes INTEGER,
          created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS micro_tasks (
          id TEXT PRIMARY KEY, work_session_id TEXT NOT NULL, title TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending', completed_at TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS file_claims (
          id TEXT PRIMARY KEY, work_session_id TEXT NOT NULL, file_path TEXT NOT NULL,
          claimed_at TEXT DEFAULT (datetime('now')), released_at TEXT
        );
        CREATE TABLE IF NOT EXISTS handoffs (
          id TEXT PRIMARY KEY, from_developer_id TEXT NOT NULL, to_developer_id TEXT NOT NULL,
          work_session_id TEXT, title TEXT NOT NULL, context_summary TEXT, what_done TEXT, what_next TEXT,
          branch_name TEXT, file_list TEXT, blockers_notes TEXT, status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT, accepted_at TEXT
        );
        CREATE TABLE IF NOT EXISTS progress_logs (
          id TEXT PRIMARY KEY, work_session_id TEXT NOT NULL, note TEXT, minutes_logged INTEGER DEFAULT 0,
          commit_sha TEXT, created_at TEXT DEFAULT (datetime('now'))
        );
      `);
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  getDbPath(): string {
    return this.dbPath;
  }

  /** Ensure a developer record exists; create if not. */
  ensureDeveloper(id: string, displayName: string, email?: string, jiraUserId?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO developers (id, display_name, email, jira_user_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email,
        jira_user_id = excluded.jira_user_id, updated_at = datetime('now')
    `);
    stmt.run(id, displayName, email ?? null, jiraUserId ?? null);
  }

  /** Get active work session for a developer, if any. */
  getActiveSession(developerId: string): { id: string; jira_issue_key: string | null } | null {
    const row = this.db
      .prepare(
        `SELECT id, jira_issue_key FROM work_sessions WHERE developer_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`
      )
      .get(developerId) as { id: string; jira_issue_key: string | null } | undefined;
    return row ?? null;
  }

  /** Get pending handoffs for a developer. */
  getPendingHandoffs(developerId: string): Array<{
    id: string;
    title: string;
    from_developer_id: string;
    context_summary: string | null;
    created_at: string;
  }> {
    return this.db
      .prepare(
        `SELECT id, title, from_developer_id, context_summary, created_at
         FROM handoffs WHERE to_developer_id = ? AND status = 'pending' ORDER BY created_at DESC`
      )
      .all(developerId) as Array<{
      id: string;
      title: string;
      from_developer_id: string;
      context_summary: string | null;
      created_at: string;
    }>;
  }

  /** Create a work session. */
  createWorkSession(
    id: string,
    developerId: string,
    options: {
      jiraIssueKey?: string;
      jiraIssueSummary?: string;
      branchName?: string;
    }
  ): void {
    this.db
      .prepare(
        `INSERT INTO work_sessions (id, developer_id, jira_issue_key, jira_issue_summary, branch_name, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      )
      .run(
        id,
        developerId,
        options.jiraIssueKey ?? null,
        options.jiraIssueSummary ?? null,
        options.branchName ?? null
      );
  }

  /** Add micro-tasks to a session. */
  addMicroTasks(
    sessionId: string,
    tasks: Array<{ id: string; title: string; sortOrder: number }>
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO micro_tasks (id, work_session_id, title, sort_order) VALUES (?, ?, ?, ?)`
    );
    for (const t of tasks) {
      stmt.run(t.id, sessionId, t.title, t.sortOrder);
    }
  }

  /** Complete a micro-task. */
  completeMicroTask(taskId: string): void {
    this.db
      .prepare(
        `UPDATE micro_tasks SET status = 'done', completed_at = datetime('now') WHERE id = ?`
      )
      .run(taskId);
  }

  /** End work session (complete or handoff). */
  endWorkSession(
    sessionId: string,
    status: "completed" | "handed_off" | "paused",
    options?: { mergeRequestUrl?: string; totalMinutes?: number }
  ): void {
    this.db
      .prepare(
        `UPDATE work_sessions SET status = ?, ended_at = datetime('now'),
         merge_request_url = ?, total_minutes = ? WHERE id = ?`
      )
      .run(
        status,
        options?.mergeRequestUrl ?? null,
        options?.totalMinutes ?? null,
        sessionId
      );
  }

  /** Create a handoff. */
  createHandoff(params: {
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
  }): void {
    this.db
      .prepare(
        `INSERT INTO handoffs (id, from_developer_id, to_developer_id, work_session_id, title,
         context_summary, what_done, what_next, branch_name, file_list, blockers_notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(
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
        params.blockersNotes ?? null
      );
  }

  /** Add progress log entry. */
  addProgressLog(
    id: string,
    sessionId: string,
    note?: string,
    minutesLogged?: number,
    commitSha?: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO progress_logs (id, work_session_id, note, minutes_logged, commit_sha) VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, sessionId, note ?? null, minutesLogged ?? 0, commitSha ?? null);
  }

  /** Get recent progress logs for a session (newest first). */
  getProgressLogs(
    sessionId: string,
    limit = 10
  ): Array<{ id: string; note: string | null; minutes_logged: number; commit_sha: string | null; created_at: string }> {
    return this.db
      .prepare(
        `SELECT id, note, minutes_logged, commit_sha, created_at FROM progress_logs WHERE work_session_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(sessionId, limit) as Array<{
        id: string;
        note: string | null;
        minutes_logged: number;
        commit_sha: string | null;
        created_at: string;
      }>;
  }

  /** Get micro-tasks for a session. */
  getMicroTasks(sessionId: string): Array<{ id: string; title: string; status: string; sort_order: number }> {
    return this.db
      .prepare(
        `SELECT id, title, status, sort_order FROM micro_tasks WHERE work_session_id = ? ORDER BY sort_order`
      )
      .all(sessionId) as Array<{ id: string; title: string; status: string; sort_order: number }>;
  }

  /** Get session by id. */
  getSession(sessionId: string): {
    id: string;
    developer_id: string;
    jira_issue_key: string | null;
    jira_issue_summary: string | null;
    branch_name: string | null;
    status: string;
    started_at: string;
  } | null {
    return this.db.prepare(`SELECT * FROM work_sessions WHERE id = ?`).get(sessionId) as any ?? null;
  }

  close(): void {
    this.db.close();
  }
}
