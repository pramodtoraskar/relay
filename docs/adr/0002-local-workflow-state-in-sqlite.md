# ADR-002: Local workflow state in SQLite

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Relay needs durable storage for work sessions, micro-tasks, handoffs, progress logs, and related workflow state. This could live in a cloud service (e.g. hosted DB or API) or in a local database. We also need to decide who owns the schema and how the data is accessed.

## Decision

Store all workflow state in a **local SQLite database** (`work-tracker.db`). Access is **only via SQLite MCP** (no direct SQLite driver in Relay). Relay owns the schema (e.g. `packages/core/database/schema.sql`): tables such as `developers`, `work_sessions`, `micro_tasks`, `handoffs`, `progress_logs`, `context_notes`, `daily_goals`. The DB is local to the machine running Relay; no cloud persistence for this state.

## Consequences

### Positive

- Works offline; no dependency on a central server for sessions/handoffs.
- Simple deployment: no separate DB server or API; schema is versioned with the repo.
- Single source of truth for workflow state on the developer’s machine.

### Negative

- State is not shared across machines by default; handoffs are “local” until we add sync or a shared backend later.
- User must ensure DB path exists and schema is applied (e.g. `npm run setup` or first run).

### Neutral

- Schema ownership is clear: Relay defines and migrates it; SQLite MCP just executes queries.

## Notes

- See [ADR-003](0003-mcpdb-adapter-facade-over-sqlite-mcp.md) for how Relay accesses this DB (via McpDbAdapter).
- Schema location: `packages/core/database/schema.sql`.
