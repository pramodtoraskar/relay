/**
 * MCP adapters for the Registry — wrap McpClientsManager so Jira, Git, SQLite can be registered.
 */

import type { McpClientsManager } from "../mcp-clients.js";
import type { IMcpAdapter } from "./registry.js";
import type { RawTool } from "./types.js";

function toRawTool(
  t: { name: string; description?: string; inputSchema?: Record<string, unknown> }
): RawTool {
  return { name: t.name, description: t.description, inputSchema: t.inputSchema };
}

export function createJiraAdapter(mcp: McpClientsManager): IMcpAdapter {
  return {
    async listTools(): Promise<RawTool[]> {
      const list = await mcp.listJiraToolsFull();
      return list.map(toRawTool);
    },
    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      return mcp.callJiraTool(name, args);
    },
  };
}

export function createGitAdapter(mcp: McpClientsManager): IMcpAdapter {
  return {
    async listTools(): Promise<RawTool[]> {
      const list = await mcp.listGitToolsFull();
      return list.map(toRawTool);
    },
    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      return mcp.callGitTool(name, args);
    },
  };
}

export function createSqliteAdapter(mcp: McpClientsManager): IMcpAdapter {
  return {
    async listTools(): Promise<RawTool[]> {
      const list = await mcp.listDbToolsFull();
      return list.map(toRawTool);
    },
    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      return mcp.callDBTool(name, args);
    },
  };
}
