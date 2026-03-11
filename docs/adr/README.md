# Architecture Decision Records

This directory holds **Architecture Decision Records (ADRs)** for Relay: short documents that capture an important architectural decision and its context.

## Index

| ADR   | Title | Status |
|-------|--------|--------|
| [ADR-001](0001-mcp-only-integration.md) | Use MCP-only integration | Accepted |
| [ADR-002](0002-local-workflow-state-in-sqlite.md) | Local workflow state in SQLite | Accepted |
| [ADR-003](0003-mcpdb-adapter-facade-over-sqlite-mcp.md) | McpDbAdapter as facade over SQLite MCP | Accepted |
| [ADR-004](0004-three-layer-model-official-local-code.md) | Three-layer model (Official / Local / Code) | Accepted |
| [ADR-005](0005-credentials-via-mcp-environment.md) | Credentials via MCP environment | Accepted |
| [ADR-006](0006-tool-routing-via-orchestrator-workflow-manager.md) | Tool routing via RelayOrchestrator → WorkflowManager | Accepted |
| [ADR-007](0007-graceful-degradation-when-mcps-down.md) | Graceful degradation when MCPs are down | Accepted |

## Adding a new ADR

1. Copy `template.md` to a new file: `NNNN-short-title.md` (e.g. `0001-mcp-only-integration.md`).
2. Fill in the template (context, decision, consequences).
3. Add a row to the index table above.
4. Optionally link from `docs/architecture.md` where relevant.

## References

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (Michael Nygard)
