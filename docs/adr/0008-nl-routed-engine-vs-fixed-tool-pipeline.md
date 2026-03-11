# ADR-008: NL-routed engine vs fixed-tool pipeline (bottleneck)

**Status:** Accepted  
**Date:** 2026-02-18

## Context

Relay currently runs as a **fixed MCP server**: a single pipeline (orchestrator → workflow manager) with many named tools. The client (e.g. Cursor) must choose which tool to call; Relay does not interpret natural language or build execution plans. Adding capabilities means adding more tools and more pipeline branches. The system is **bounded** by the fixed tool list and the single routing path.

The PRD describes an **NL-routed engine**: the user speaks naturally; Relay learns capabilities when MCPs plug in (LEARN), routes intent (ROUTE), builds a plan (PLAN), executes it (Executor), and narrates the result (NARRATE). Capability is driven by whatever MCPs are connected and by semantic intent matching, not by a predefined tool roster. That design is **not bounded** by a fixed tool set.

## Problem (bottleneck)

The fixed-tool pipeline is a bottleneck:

- Every new capability requires a new named tool and code in the orchestrator/workflow manager.
- The user (or the client AI) must know the tool vocabulary; there is no single natural-language interface.
- Cross-tool workflows are manual (client chains tool calls) or hard-coded, not derived from intent.
- Plug/unplug of MCPs does not dynamically change what Relay can do; the server’s tool list is static.

## Decision

Treat the **NL-routed engine** (per the PRD) as the target architecture. The fixed MCP server with many named tools and the single pipeline (orchestrator → workflow manager) is the current implementation, not the long-term design. Work toward:

1. **LEARN** — On MCP plug, introspect tools and build a semantic capability map; announce what is now possible.
2. **ROUTE** — On each user message, parse intent, match to capability map, decide workflow type (single / sequential / parallel / ambiguous / no_capability).
3. **PLAN** — When route says proceed, build a step DAG (MCP + tool + inputs per step) with semantic output bridging.
4. **EXECUTE** — Run the plan; resolve inputs from user message, session context, and prior step outputs.
5. **NARRATE** — Translate execution result into plain English; no raw JSON to the user.

Runtime parameters (active_mode, plugged_in_mcps, capability_map, session_context, user_message) and the mode-specific JSON output schemas from the PRD define the contract for this engine.

## Consequences

### Positive

- Relay is no longer bounded by a fixed list of named tools; capability scales with plugged-in MCPs and intent understanding.
- Single, stable natural-language interface regardless of which MCPs are connected.
- Cross-MCP workflows are first-class (plan DAG, semantic bridging) instead of client-side chaining.
- Plug/unplug directly changes what Relay can do, with announcements in plain English.

### Negative

- Significant implementation work: Registry, Learner, Router, Executor, and the four-mode prompt/schemas.
- Existing fixed tools can remain during migration (e.g. for backward compatibility or gradual rollout).

### Neutral

- ADR-006 (tool routing via Orchestrator → WorkflowManager) still describes the *current* request path; the NL-routed engine adds a *new* path (user message → ROUTE → PLAN → EXECUTE → NARRATE) that may eventually become primary.

## Notes

- PRD: `docs/relay_prd.docx.pdf` (Four modes, runtime params, JSON output schemas).
- Current architecture: [docs/architecture.md](../architecture.md); ADR-006 (tool routing).
