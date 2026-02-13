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
  private wm: WorkflowManager;
  private db: McpDbAdapter;

  constructor(options: RelayOrchestratorOptions = {}) {
    const mcp = options.mcp ?? new McpClientsManager();
    this.db = new McpDbAdapter(mcp);
    this.wm = new WorkflowManager(this.db, mcp);
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
}
