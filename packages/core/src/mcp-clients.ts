/**
 * MCP Clients Manager — Spawns and coordinates Jira, Git, and SQLite MCP servers.
 * Relay uses these instead of direct API or DB access.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "path";

export interface McpClientsConfig {
  /** Path to workspace/repo for Git MCP (default: cwd) */
  workspacePath?: string;
  /** Path to Relay workflow SQLite DB (default: .relay/work-tracker.db in workspace) */
  databasePath?: string;
  /** Jira MCP env (JIRA_URL, JIRA_TOKEN, JIRA_EMAIL) — from process.env if not set */
  jiraEnv?: Record<string, string>;
  /** If true, do not start Jira MCP; callJiraTool will return empty/error. Use when Jira is unavailable or for E2E without Jira. */
  jiraDisabled?: boolean;
  /** Override Jira MCP command (e.g. "node"). When set, args from jiraArgs or RELAY_JIRA_MCP_ARGS. */
  jiraCommand?: string;
  /** Override Jira MCP args (e.g. ["/path/to/jira-mcp/run.js"]). Used when jiraCommand is set. */
  jiraArgs?: string[];
  /** If true, do not start Git MCP; callGitTool returns empty branch/commits. Use when Git MCP is unavailable or for minimal dev run. */
  gitDisabled?: boolean;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

/**
 * Manages MCP client connections to Jira, Git, and SQLite servers.
 * Spawns each as a subprocess and forwards tool calls.
 */
export class McpClientsManager {
  private config: McpClientsConfig;
  private jiraClient: Client | null = null;
  private jiraTransport: StdioClientTransport | null = null;
  private gitClient: Client | null = null;
  private gitTransport: StdioClientTransport | null = null;
  private dbClient: Client | null = null;
  private dbTransport: StdioClientTransport | null = null;
  private started = false;

  constructor(config: McpClientsConfig = {}) {
    const cwd = process.cwd();
    this.config = {
      workspacePath: config.workspacePath ?? cwd,
      databasePath:
        config.databasePath ??
        process.env["RELAY_DB_PATH"] ??
        process.env["DATABASE_PATH"] ??
        join(cwd, ".relay", "work-tracker.db"),
      jiraEnv: config.jiraEnv ?? {},
    };
  }

  /** Start all MCP server processes and connect. */
  async start(): Promise<void> {
    if (this.started) return;

    const jiraDisabled =
      this.config.jiraDisabled ??
      (process.env["RELAY_JIRA_MCP_DISABLED"] === "1" || process.env["RELAY_DISABLE_JIRA_MCP"] === "1");

    if (!jiraDisabled) {
      const jiraEnv = {
        ...process.env,
        JIRA_URL: this.config.jiraEnv?.JIRA_URL ?? process.env["JIRA_URL"] ?? process.env["RELAY_JIRA_BASE_URL"] ?? "",
        JIRA_TOKEN: this.config.jiraEnv?.JIRA_TOKEN ?? process.env["JIRA_TOKEN"] ?? process.env["RELAY_JIRA_API_TOKEN"] ?? "",
        JIRA_EMAIL: this.config.jiraEnv?.JIRA_EMAIL ?? process.env["JIRA_EMAIL"] ?? process.env["RELAY_JIRA_EMAIL"] ?? "",
      };
      const jiraCommand =
        this.config.jiraCommand ?? process.env["RELAY_JIRA_MCP_COMMAND"];
      const jiraArgsRaw =
        this.config.jiraArgs?.length
          ? this.config.jiraArgs
          : process.env["RELAY_JIRA_MCP_ARGS"]
            ? process.env["RELAY_JIRA_MCP_ARGS"].split(",").map((s) => s.trim()).filter(Boolean)
            : null;
      const command = jiraCommand ?? "npx";
      const args = jiraArgsRaw ?? (jiraCommand ? [] : ["-y", "@red-hat/jira-mcp"]);

      this.jiraTransport = new StdioClientTransport({
        command,
        args,
        env: jiraEnv as Record<string, string>,
      });
      this.jiraClient = new Client({ name: "relay-jira-client", version: "1.0.0" });
      try {
        await this.jiraClient.connect(this.jiraTransport as any);
      } catch (err) {
        this.jiraClient = null;
        this.jiraTransport = null;
        throw err;
      }
    }

    const gitDisabled =
      this.config.gitDisabled ?? process.env["RELAY_GIT_MCP_DISABLED"] === "1";

    if (!gitDisabled) {
      this.gitTransport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-git", this.config.workspacePath!],
      });
      this.gitClient = new Client({ name: "relay-git-client", version: "1.0.0" });
      try {
        await this.gitClient.connect(this.gitTransport as any);
      } catch (err) {
        this.gitClient = null;
        this.gitTransport = null;
      }
    }

    this.dbTransport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "mcp-sqlite", this.config.databasePath!],
    });
    this.dbClient = new Client({ name: "relay-db-client", version: "1.0.0" });
    await this.dbClient.connect(this.dbTransport as any);

    this.started = true;
  }

  private static extractText(result: { content?: Array<{ type: string; text?: string }>; isError?: boolean }): ToolResult {
    const content = result?.content ?? [];
    const text = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text" && typeof (c as any).text === "string")
      .map((c) => c.text)
      .join("\n");
    return { content: text, isError: result?.isError };
  }

  /** Call a Jira MCP tool (e.g. get_jira, search_issues). When Jira MCP is disabled, returns empty/error so workflow still runs. */
  async callJiraTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.start();
    if (!this.jiraClient) {
      if (name === "search_issues") return { content: "[]", isError: false };
      if (name === "get_jira") return { content: "", isError: true };
      return { content: "", isError: true };
    }
    try {
      const result = await this.jiraClient.callTool({ name, arguments: args });
      return McpClientsManager.extractText(result as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: message, isError: true };
    }
  }

  /** Call a Git MCP tool (e.g. git_log, git_status). When Git MCP is disabled, returns empty so workflow still runs. */
  async callGitTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.start();
    if (!this.gitClient) {
      if (name === "git_status") return { content: "Not a git repo (Git MCP disabled)", isError: false };
      if (name === "git_log") return { content: "", isError: false };
      return { content: "", isError: false };
    }
    try {
      const result = await this.gitClient.callTool({ name, arguments: args });
      return McpClientsManager.extractText(result as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: message, isError: true };
    }
  }

  /** Call SQLite MCP tool (e.g. query, read_records, create_record). */
  async callDBTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.start();
    if (!this.dbClient) throw new Error("SQLite MCP client not initialized");
    try {
      const result = await this.dbClient.callTool({ name, arguments: args });
      return McpClientsManager.extractText(result as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: message, isError: true };
    }
  }

  getDatabasePath(): string {
    return this.config.databasePath!;
  }

  async close(): Promise<void> {
    if (this.jiraTransport) await (this.jiraTransport as any).close?.();
    if (this.gitTransport) await (this.gitTransport as any).close?.();
    if (this.dbTransport) await (this.dbTransport as any).close?.();
    this.jiraClient = null;
    this.jiraTransport = null;
    this.gitClient = null;
    this.gitTransport = null;
    this.dbClient = null;
    this.dbTransport = null;
    this.started = false;
  }
}
