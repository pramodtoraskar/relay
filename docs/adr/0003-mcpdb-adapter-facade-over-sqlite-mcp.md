# ADR-003: McpDbAdapter as facade over SQLite MCP

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Workflow logic needs to read and write sessions, handoffs, micro-tasks, and progress. We could have WorkflowManager (or tools) call SQLite MCP directly with raw queries, or we could introduce an abstraction that hides MCP details and exposes typed business operations.

## Decision

All database access goes through **McpDbAdapter**. Workflow code does not call SQLite MCP directly. McpDbAdapter implements an interface (e.g. `IRelayDb`) with methods like `getPendingHandoffs(devId)`, and translates those into **McpClientsManager.callDBTool()** (SQLite MCP `query`) calls, then returns typed results. So: MCP server → Orchestrator → WorkflowManager → McpDbAdapter → McpClientsManager.callDBTool() → SQLite MCP.

## Consequences

### Positive

- WorkflowManager stays high-level and independent of SQL and MCP tool names.
- Single place to change how we talk to the DB (or swap to another storage later).
- Typed API reduces ad-hoc query strings scattered across the codebase.

### Negative

- Extra layer; new operations require updating both the adapter and the underlying queries.

### Neutral

- McpDbAdapter does not spawn or hold the SQLite MCP; it uses the shared McpClientsManager, consistent with [ADR-001](0001-mcp-only-integration.md).

## Notes

- Implementation: `packages/core/src/db-adapter.ts` (IRelayDb + McpDbAdapter).
- Architecture: [docs/architecture.md](../architecture.md) (McpDbAdapter as facade).
