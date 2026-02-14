/**
 * @relay/core — Relay MCP server and workflow orchestration.
 *
 * Uses MCP only: Jira MCP, Git MCP, SQLite MCP. No direct API or DB.
 * Exposes: RelayOrchestrator, WorkflowManager, McpClientsManager, McpDbAdapter.
 */

export { McpClientsManager } from "./mcp-clients.js";
export type { McpClientsConfig, ToolResult } from "./mcp-clients.js";
export { McpDbAdapter } from "./db-adapter.js";
export type { IRelayDb } from "./db-adapter.js";
export { WorkflowManager } from "./workflow-manager.js";
export type {
  MorningCheckinResult,
  StartTaskResult,
  CreateHandoffInput,
} from "./workflow-manager.js";
export { RelayOrchestrator } from "./orchestrator.js";
export type { RelayOrchestratorOptions } from "./orchestrator.js";
export { runMcpServer } from "./server.js";
export { getRoleGuidance, listRoles, ROLE_GUIDANCE, RELAY_ROLE_IDS } from "./roles.js";
export type { RelayRoleId, RoleGuidance } from "./roles.js";
export { BaseOrchestrationTool } from "./lib/base-orchestration-tool.js";
export * as JiraState from "./lib/jira-state.js";
export type { JiraIssueState, ResolvedTaskContext, StateValidationResult, JiraTransitionIntent } from "./types/orchestration-tools.js";