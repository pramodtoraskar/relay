# ADR-001: Use MCP-only integration

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Relay must integrate with Jira (or similar), Git/GitLab, and local workflow state. We could use direct REST clients, Git CLI, and a SQLite driver from the core process, or we could rely on existing MCP servers that already implement those integrations.

## Decision

Use **only MCP** for all external systems: Jira MCP, Git MCP, and SQLite MCP. Relay does not call Jira API, Git CLI, or SQLite directly. All I/O goes through the Model Context Protocol; Relay composes and orchestrates MCP tools.

## Consequences

### Positive

- Reuse existing Jira/Git/SQLite MCPs; no duplicate REST or DB code in Relay.
- One protocol for all I/O; consistent request/response and error handling.
- Easier to swap backends (e.g. different Jira MCP or provider) without changing Relay core.

### Negative

- Subprocess overhead: Relay spawns and talks to each MCP as a separate process.
- Dependency on each MCP’s availability; if an MCP is down or misconfigured, that integration fails.

### Neutral

- Tool names and signatures are defined by each MCP (e.g. Jira: `get_jira`, `search_issues`; SQLite: `query`); Relay must adapt to them.

## Notes

- See [ADR-007](0007-graceful-degradation-when-mcps-down.md) for behavior when MCPs are unavailable.
- Architecture: [docs/architecture.md](../architecture.md#why-mcp-only).
