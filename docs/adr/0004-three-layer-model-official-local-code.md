# ADR-004: Three-layer model (Official / Local / Code)

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Relay integrates with issue trackers (Jira, Linear, GitHub), local workflow state, and version control (Git/GitLab). We need a clear mental model for where “source of truth” lives and what Relay reads vs writes.

## Decision

Adopt a **three-layer model**:

| Layer    | Systems              | Role |
|----------|----------------------|------|
| **Official** | Jira, Linear, GitHub | Source of truth for stories, assignments, status |
| **Local**    | Relay (SQLite)       | Sessions, micro-tasks, handoffs, progress logs |
| **Code**     | Git / GitLab         | Branches, commits, MRs/PRs |

- **Read**: Relay reads from Official (e.g. issues, status) and Code (e.g. branch, recent commits).
- **Write – Local**: Relay writes all workflow state to Local (SQLite via SQLite MCP).
- **Write – Official**: Relay may update Official when appropriate (e.g. Jira status on start task or complete task).

Relay does not write to Code (no push/merge from Relay); it only reads.

## Consequences

### Positive

- Clear ownership: stories/status in Official, workflow state in Local, code artifacts in Code.
- Prevents Relay from mutating repos; reduces risk and keeps Git operations explicit by the user or Git MCP under user control.

### Negative

- Status in Official and state in Local can diverge if updates fail or are skipped; we rely on workflows (e.g. complete task) to keep them in sync where desired.

### Neutral

- “Official” can be extended to other backends (e.g. Linear, GitHub Issues) with the same read/update pattern.

## Notes

- See [ADR-001](0001-mcp-only-integration.md) (MCP-only), [ADR-002](0002-local-workflow-state-in-sqlite.md) (Local = SQLite).
- Architecture: [docs/architecture.md](../architecture.md#three-layers).
