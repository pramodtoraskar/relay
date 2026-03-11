# ADR-006: Tool routing via RelayOrchestrator → WorkflowManager

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Relay exposes tools (e.g. morning check-in, start task, handoff) through an MCP server. We need a single, predictable path from incoming tool calls to the logic that performs work and to the MCPs (Jira, Git, SQLite).

## Decision

Use a **single entry path** for all Relay tools:

**MCP server (tool handlers) → RelayOrchestrator → WorkflowManager → (McpDbAdapter | McpClientsManager) → MCPs**

- The MCP server receives tool invocations and delegates to **RelayOrchestrator**.
- **RelayOrchestrator** routes each tool to **WorkflowManager** (no business logic in the orchestrator).
- **WorkflowManager** implements workflows (e.g. morningCheckin, startTask, updateProgress, completeTask, createHandoff, endOfDay) and uses **McpDbAdapter** for session/handoff/micro-task state and **McpClientsManager** for Jira and Git tool calls. McpDbAdapter itself uses McpClientsManager for SQLite MCP.

All three external MCPs are reached via **McpClientsManager** (callJiraTool, callGitTool, callDBTool); no direct MCP calls from WorkflowManager.

## Consequences

### Positive

- One place to add new tools (orchestrator + workflow method); clear separation between transport (server), routing (orchestrator), and business logic (WorkflowManager).
- Easier to test: mock McpDbAdapter and McpClientsManager at the WorkflowManager boundary.

### Negative

- All tools go through the same pipeline; very high-throughput or special-case tools might need a different path later (not currently required).

### Neutral

- Resource handlers (if any) can follow a similar path or a dedicated handler, as long as they don’t bypass security or consistency.

## Notes

- Implementation: `server.ts` (handlers), `orchestrator.ts`, `workflow-manager.ts`, `mcp-clients.ts`, `db-adapter.ts`.
- Architecture: [docs/architecture.md](../architecture.md) (call flow).
