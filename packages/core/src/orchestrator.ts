/**
 * RelayOrchestrator — Coordinates workflow by delegating to WorkflowManager,
 * which uses only MCP (Jira MCP, Git MCP, SQLite MCP). No direct integrations.
 */

import { McpClientsManager } from "./mcp-clients.js";
import { McpDbAdapter } from "./db-adapter.js";
import { WorkflowManager } from "./workflow-manager.js";
import type {
  MorningCheckinResult,
  StartTaskResult,
  CreateHandoffInput,
} from "./workflow-manager.js";

export type RelayOrchestratorOptions = {
  mcp?: McpClientsManager;
};

/**
 * Orchestrator that uses WorkflowManager backed by MCP clients only.
 */
export class RelayOrchestrator {
  private mcp: McpClientsManager;
  private wm: WorkflowManager;
  private db: McpDbAdapter;

  constructor(options: RelayOrchestratorOptions = {}) {
    this.mcp = options.mcp ?? new McpClientsManager();
    this.db = new McpDbAdapter(this.mcp);
    this.wm = new WorkflowManager(this.db, this.mcp);
  }

  async morningCheckin(devName?: string): Promise<MorningCheckinResult> {
    return this.wm.morningCheckin(devName);
  }

  async startTask(taskId: string, devName: string, microTasks?: string[]): Promise<StartTaskResult> {
    return this.wm.startTask(taskId, microTasks ?? [], devName);
  }

  async updateProgress(
    sessionId: string,
    note?: string,
    minutesLogged?: number,
    commitSha?: string,
    microTaskId?: string
  ): Promise<void> {
    await this.wm.updateProgress(sessionId, note, minutesLogged, commitSha, microTaskId);
  }

  async completeTask(sessionId: string, mergeRequestUrl?: string, totalMinutes?: number): Promise<void> {
    await this.wm.completeTask(sessionId, mergeRequestUrl, totalMinutes);
  }

  async createHandoff(input: CreateHandoffInput): Promise<string> {
    return this.wm.createHandoff(input);
  }

  async endOfDay(devName?: string) {
    return this.wm.endOfDay(devName);
  }

  async getActiveSession(devName?: string) {
    return this.wm.getActiveSession(devName);
  }

  async getTaskStatus(devName?: string) {
    return this.wm.getTaskStatus(devName);
  }

  async getMicroTasks(sessionId: string) {
    return this.wm.getMicroTasks(sessionId);
  }

  /** Expose db adapter for server resources (active-tasks, pending-handoffs, metrics). */
  getDb(): McpDbAdapter {
    return this.db;
  }

  /** Expose workflow manager for role-aware tools (role_aware_checkin, suggest_next). */
  getWorkflowManager(): WorkflowManager {
    return this.wm;
  }

  /** Call any Jira MCP tool by name with given arguments. Use list_jira_mcp_tools to discover tools. */
  async callJiraMcpTool(toolName: string, args: Record<string, unknown> = {}): Promise<{ content: string; isError: boolean }> {
    const r = await this.mcp.callJiraTool(toolName, args);
    return { content: r.content, isError: !!r.isError };
  }

  /** Call any Git/GitLab MCP tool by name with given arguments. Use list_gitlab_mcp_tools to discover tools. */
  async callGitlabMcpTool(toolName: string, args: Record<string, unknown> = {}): Promise<{ content: string; isError: boolean }> {
    const r = await this.mcp.callGitTool(toolName, args);
    return { content: r.content, isError: !!r.isError };
  }

  /** List tools exposed by the Jira MCP (e.g. search_issues, get_issue, transition_issue). */
  async listJiraMcpTools(): Promise<Array<{ name: string; description?: string }>> {
    return this.mcp.listJiraTools();
  }

  /** List tools exposed by the GitLab MCP. */
  async listGitlabMcpTools(): Promise<Array<{ name: string; description?: string }>> {
    return this.mcp.listGitTools();
  }
}
