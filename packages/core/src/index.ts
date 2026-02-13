/**
 * @relay/core — Database, Jira, Git clients and WorkflowManager.
 * For MCP server entry point use: relay-mcp (bin) or run "node dist/run-mcp.js"
 */
export { DatabaseManager } from "./database-manager.js";
export { JiraClient } from "./jira-client.js";
export type { JiraConfig, JiraIssue } from "./jira-client.js";
export { GitClient } from "./git-client.js";
export { WorkflowManager } from "./workflow-manager.js";
export type { MorningCheckinResult, StartTaskResult, CreateHandoffInput } from "./workflow-manager.js";
export { runMcpServer } from "./server.js";
