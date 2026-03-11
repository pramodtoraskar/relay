# ADR-007: Graceful degradation when MCPs are down

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Relay depends on Jira MCP, Git MCP, and SQLite MCP ([ADR-001](0001-mcp-only-integration.md)). Any of them can be unavailable (not running, misconfigured, network failure, or DB missing). We need defined behavior so the product degrades in a predictable way instead of failing entirely.

## Decision

**Define degradation per MCP:**

- **SQLite MCP down or DB missing:** All workflow state access fails (sessions, handoffs, micro-tasks, progress). Relay cannot offer check-in, start task, handoff, or progress in a useful way. Ensure DB path exists and schema is applied (e.g. `npm run setup` or first run). No fallback; local state is essential for core workflows.
- **Jira MCP down:** Check-in and start/complete **degrade gracefully**. Handoffs and local state still work. Check-in omits or reduces Jira-derived data (e.g. assigned issues, status). Start task cannot fetch issue or transition status; complete task cannot update Jira status. User can still create handoffs, log progress locally, and use Git-related features.
- **Git MCP down:** Check-in and start task cannot show branch or recent commits; suggested branch on start task is unavailable. Handoffs, progress, and Jira-related operations (if Jira MCP is up) still work. No write to Git from Relay anyway ([ADR-004](0004-three-layer-model-official-local-code.md)).

Relay should avoid hard crashes when an MCP fails; surface errors or partial results so the user understands what is missing.

## Consequences

### Positive

- Users can keep working with handoffs and local state even when Jira or Git is unreachable.
- Clear expectations: SQLite is critical; Jira/Git enhance but are not required for local workflow.

### Negative

- Partial check-ins or incomplete start/complete flows may confuse users if not clearly communicated (e.g. “Jira unavailable; showing only local handoffs”).

### Neutral

- Future improvements: retries, caching, or optional “offline” mode could build on this policy.

## Notes

- Architecture: [docs/architecture.md](../architecture.md#security-and-failure-modes).
- Implementation should handle MCP errors and return structured responses (e.g. partial success + warnings) rather than throwing up the stack.
