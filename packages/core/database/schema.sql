-- Relay local layer schema (SQLite)
-- Official layer = Jira/Linear/GitHub; Local layer = this DB; Code layer = Git

-- Developers (local identity, can map to Jira user)
CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  jira_user_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Work sessions (one per "start task" until complete or handoff)
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  jira_issue_key TEXT,
  jira_issue_summary TEXT,
  branch_name TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'handed_off', 'paused')),
  merge_request_url TEXT,
  total_minutes INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_work_sessions_developer ON work_sessions(developer_id);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);
CREATE INDEX idx_work_sessions_jira ON work_sessions(jira_issue_key);

-- Micro-tasks (sub-tasks within a work session, AI or manual)
CREATE TABLE IF NOT EXISTS micro_tasks (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_micro_tasks_session ON micro_tasks(work_session_id);

-- File ownership (claim files to reduce conflicts)
CREATE TABLE IF NOT EXISTS file_claims (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  claimed_at TEXT DEFAULT (datetime('now')),
  released_at TEXT,
  UNIQUE(file_path)
);

CREATE INDEX idx_file_claims_session ON file_claims(work_session_id);
CREATE INDEX idx_file_claims_path ON file_claims(file_path);

-- Handoffs (context passed to another developer)
CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY,
  from_developer_id TEXT NOT NULL REFERENCES developers(id),
  to_developer_id TEXT NOT NULL REFERENCES developers(id),
  work_session_id TEXT REFERENCES work_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  context_summary TEXT,
  what_done TEXT,
  what_next TEXT,
  branch_name TEXT,
  file_list TEXT,
  blockers_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT
);

CREATE INDEX idx_handoffs_to ON handoffs(to_developer_id);
CREATE INDEX idx_handoffs_from ON handoffs(from_developer_id);
CREATE INDEX idx_handoffs_status ON handoffs(status);

-- Progress log (time + notes linked to session)
CREATE TABLE IF NOT EXISTS progress_logs (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  note TEXT,
  minutes_logged INTEGER DEFAULT 0,
  commit_sha TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_progress_logs_session ON progress_logs(work_session_id);

-- Trigger: update updated_at
CREATE TRIGGER IF NOT EXISTS developers_updated_at
  AFTER UPDATE ON developers BEGIN
    UPDATE developers SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
CREATE TRIGGER IF NOT EXISTS work_sessions_updated_at
  AFTER UPDATE ON work_sessions BEGIN
    UPDATE work_sessions SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
CREATE TRIGGER IF NOT EXISTS micro_tasks_updated_at
  AFTER UPDATE ON micro_tasks BEGIN
    UPDATE micro_tasks SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
CREATE TRIGGER IF NOT EXISTS handoffs_updated_at
  AFTER UPDATE ON handoffs BEGIN
    UPDATE handoffs SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
