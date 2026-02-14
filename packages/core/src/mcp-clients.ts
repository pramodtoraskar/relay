/**
 * MCP Clients Manager — Spawns and coordinates Jira, Git, and SQLite MCP servers.
 * Relay uses these instead of direct API or DB access.
 * Jira and Git can be either: (1) spawned via command/args (stdio), or (2) connected to an already-running MCP server via URL (Streamable HTTP).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "fs";
import { dirname, join } from "path";

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
  /** Connect to an already-running Jira MCP server at this URL (Streamable HTTP). When set, no subprocess is spawned. */
  jiraMcpUrl?: string;
  /** If true, do not start Git MCP; callGitTool returns empty branch/commits. Use when Git MCP is unavailable or for minimal dev run. */
  gitDisabled?: boolean;
  /** Connect to an already-running Git/GitLab MCP server at this URL (Streamable HTTP). When set, no subprocess is spawned. */
  gitMcpUrl?: string;
  /** Override Git MCP command (e.g. "podman"). When set, args from gitArgs or RELAY_GIT_MCP_ARGS. Use for locally running stdio MCP (e.g. RH-GITLAB-MCP in a container). */
  gitCommand?: string;
  /** Override Git MCP args (e.g. ["run", "-i", "--rm", "localhost/rh-gitlab-mcp:latest"]). Used when gitCommand is set. */
  gitArgs?: string[];
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

/**
 * Manages MCP client connections to Jira, Git, and SQLite servers.
 * Spawns each as a subprocess and forwards tool calls.
 */
type ClientTransport = StdioClientTransport | InstanceType<typeof StreamableHTTPClientTransport>;

export class McpClientsManager {
  private config: McpClientsConfig;
  private jiraClient: Client | null = null;
  private jiraTransport: ClientTransport | null = null;
  private lastJiraConnectionError: string | null = null;
  private gitClient: Client | null = null;
  private gitTransport: ClientTransport | null = null;
  private lastGitConnectionError: string | null = null;
  private dbClient: Client | null = null;
  private dbTransport: StdioClientTransport | null = null;
  private started = false;
  private jiraToolsCache: Array<{ name: string; description?: string }> | null = null;
  private gitToolsCache: Array<{ name: string; description?: string }> | null = null;

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
      const jiraMcpUrl =
        this.config.jiraMcpUrl ??
        process.env["RELAY_JIRA_MCP_URL"] ??
        process.env["JIRA_MCP_URL"];

      if (jiraMcpUrl) {
        // Connect to already-running Jira MCP server (no npm fetch, no subprocess)
        try {
          this.jiraTransport = new StreamableHTTPClientTransport(new URL(jiraMcpUrl), {
            requestInit: {
              headers: { Accept: "application/json, text/event-stream" },
            },
          });
          this.jiraClient = new Client({ name: "relay-jira-client", version: "1.0.0" });
          await this.jiraClient.connect(this.jiraTransport as any);
        } catch (err) {
          this.lastJiraConnectionError = err instanceof Error ? err.message : String(err);
          this.jiraClient = null;
          this.jiraTransport = null;
        }
      } else {
        const jiraToken =
          this.config.jiraEnv?.JIRA_TOKEN ??
          process.env["JIRA_TOKEN"] ??
          process.env["RELAY_JIRA_API_TOKEN"] ??
          this.config.jiraEnv?.JIRA_API_TOKEN ??
          process.env["JIRA_API_TOKEN"] ??
          "";
        const jiraEnv = {
          ...process.env,
          JIRA_URL: this.config.jiraEnv?.JIRA_URL ?? process.env["JIRA_URL"] ?? process.env["RELAY_JIRA_BASE_URL"] ?? "",
          JIRA_TOKEN: jiraToken,
          JIRA_API_TOKEN: jiraToken,
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
          this.lastJiraConnectionError = err instanceof Error ? err.message : String(err);
          this.jiraClient = null;
          this.jiraTransport = null;
        }
      }
    }

    const gitDisabled =
      this.config.gitDisabled ?? process.env["RELAY_GIT_MCP_DISABLED"] === "1";

    if (!gitDisabled) {
      const gitMcpUrl =
        this.config.gitMcpUrl ??
        process.env["RELAY_GIT_MCP_URL"] ??
        process.env["RELAY_GITLAB_MCP_URL"] ??
        process.env["GIT_MCP_URL"];

      if (gitMcpUrl) {
        // Connect to already-running Git/GitLab MCP server via URL (Streamable HTTP)
        try {
          this.gitTransport = new StreamableHTTPClientTransport(new URL(gitMcpUrl), {
            requestInit: {
              headers: { Accept: "application/json, text/event-stream" },
            },
          });
          this.gitClient = new Client({ name: "relay-git-client", version: "1.0.0" });
          await this.gitClient.connect(this.gitTransport as any);
        } catch (err) {
          this.lastGitConnectionError = err instanceof Error ? err.message : String(err);
          this.gitClient = null;
          this.gitTransport = null;
        }
      } else {
        const gitCommand =
          this.config.gitCommand ?? process.env["RELAY_GIT_MCP_COMMAND"];
        const gitArgsRaw =
          this.config.gitArgs?.length
            ? this.config.gitArgs
            : process.env["RELAY_GIT_MCP_ARGS"]
              ? process.env["RELAY_GIT_MCP_ARGS"].split(",").map((s) => s.trim()).filter(Boolean)
              : null;
        const command = gitCommand ?? "npx";
        const args = gitArgsRaw ?? (gitCommand ? [] : ["-y", "@modelcontextprotocol/server-git", this.config.workspacePath!]);

        this.gitTransport = new StdioClientTransport({
          command,
          args,
          env: process.env as Record<string, string>,
        });
        this.gitClient = new Client({ name: "relay-git-client", version: "1.0.0" });
        try {
          await this.gitClient.connect(this.gitTransport as any);
        } catch (err) {
          this.lastGitConnectionError = err instanceof Error ? err.message : String(err);
          this.gitClient = null;
          this.gitTransport = null;
        }
      }
    }

    const dbPath = this.config.databasePath!;
    const dbDir = dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbTransport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "mcp-sqlite", dbPath],
    });
    this.dbClient = new Client({ name: "relay-db-client", version: "1.0.0" });
    try {
      await this.dbClient.connect(this.dbTransport as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`SQLite MCP failed to start (${dbPath}): ${message}`);
    }

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

  /** Call a Jira MCP tool (e.g. get_jira, search_issues). When Jira MCP is disabled or connection failed, returns error so workflow can surface it. */
  async callJiraTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.start();
    if (!this.jiraClient) {
      const msg = this.lastJiraConnectionError || "Jira MCP not connected";
      if (name === "search_issues") return { content: msg, isError: true };
      if (name === "get_jira") return { content: msg, isError: true };
      return { content: msg, isError: true };
    }
    try {
      const result = await this.jiraClient.callTool({ name, arguments: args });
      return McpClientsManager.extractText(result as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: message, isError: true };
    }
  }

  /** Call a Git MCP tool (e.g. git_log, git_status). When Git MCP is disabled or connection failed, returns error so workflow can surface it. */
  async callGitTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.start();
    if (!this.gitClient) {
      const msg = this.lastGitConnectionError || "Git MCP not connected";
      if (name === "git_status") return { content: msg, isError: true };
      if (name === "git_log") return { content: msg, isError: true };
      return { content: msg, isError: true };
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

  /** List tools exposed by the Jira MCP. Returns [] if not connected. Cached after first call. */
  async listJiraTools(): Promise<Array<{ name: string; description?: string }>> {
    await this.start();
    if (this.jiraToolsCache) return this.jiraToolsCache;
    if (!this.jiraClient) return [];
    try {
      const res = await this.jiraClient.listTools();
      const list = (res as { tools?: Array<{ name?: string; description?: string }> }).tools ?? [];
      this.jiraToolsCache = list.map((t) => ({ name: t.name ?? "", description: t.description }));
      return this.jiraToolsCache;
    } catch {
      return [];
    }
  }

  /** List tools exposed by the Git/GitLab MCP. Returns [] if not connected. Cached after first call. */
  async listGitTools(): Promise<Array<{ name: string; description?: string }>> {
    await this.start();
    if (this.gitToolsCache) return this.gitToolsCache;
    if (!this.gitClient) return [];
    try {
      const res = await this.gitClient.listTools();
      const list = (res as { tools?: Array<{ name?: string; description?: string }> }).tools ?? [];
      this.gitToolsCache = list.map((t) => ({ name: t.name ?? "", description: t.description }));
      return this.gitToolsCache;
    } catch {
      return [];
    }
  }

  /** Resolve Jira MCP tool name for workflow: search issues (JQL). */
  async getJiraSearchTool(): Promise<string> {
    const tools = await this.listJiraTools();
    const match = tools.find(
      (t) =>
        /search|jql|issues?|assignee/i.test(t.name) ||
        (t.description && /search|jql|query.*issue/i.test(t.description))
    );
    return match?.name ?? "search_issues";
  }

  /** Resolve Jira MCP tool name for workflow: get single issue. */
  async getJiraGetIssueTool(): Promise<string> {
    const tools = await this.listJiraTools();
    const match = tools.find(
      (t) =>
        /^get_?(issue|jira)/i.test(t.name) || (t.name === "get_issue") ||
        (t.description && /get.*issue|fetch.*issue/i.test(t.description))
    );
    return match?.name ?? "get_jira";
  }

  /** Resolve Jira MCP tool name for workflow: transition issue. */
  async getJiraTransitionTool(): Promise<string> {
    const tools = await this.listJiraTools();
    const match = tools.find(
      (t) =>
        /transition|move|status/i.test(t.name) ||
        (t.description && /transition|change.*status/i.test(t.description))
    );
    return match?.name ?? "transition_issue";
  }

  /** Resolve Git/GitLab MCP tool name for workflow: repo status / branch. */
  async getGitStatusTool(): Promise<string> {
    const tools = await this.listGitTools();
    const match = tools.find(
      (t) =>
        /status|branch|state/i.test(t.name) ||
        (t.description && /status|branch|working.*tree/i.test(t.description))
    );
    return match?.name ?? "git_status";
  }

  /** Resolve Git/GitLab MCP tool name for workflow: recent commits / log. */
  async getGitLogTool(): Promise<string> {
    const tools = await this.listGitTools();
    const match = tools.find(
      (t) =>
        /log|commit|history/i.test(t.name) ||
        (t.description && /log|commit|history|recent/i.test(t.description))
    );
    return match?.name ?? "git_log";
  }

  /** Resolve Jira MCP tool name for workflow: add comment to issue. */
  async getJiraAddCommentTool(): Promise<string> {
    const tools = await this.listJiraTools();
    const match = tools.find(
      (t) =>
        /comment|add_comment|create_comment/i.test(t.name) ||
        (t.description && /comment.*issue|add.*comment/i.test(t.description))
    );
    return match?.name ?? "add_comment";
  }

  /** Resolve Jira MCP tool name for workflow: create sub-task or create issue. */
  async getJiraCreateIssueTool(): Promise<string> {
    const tools = await this.listJiraTools();
    const subtask = tools.find(
      (t) =>
        /subtask|sub_task|create_subtask/i.test(t.name) ||
        (t.description && /subtask|sub-task/i.test(t.description))
    );
    if (subtask) return subtask.name;
    const create = tools.find(
      (t) =>
        /create_issue|create_issue|createIssue/i.test(t.name) ||
        (t.description && /create.*issue/i.test(t.description))
    );
    return create?.name ?? "create_issue";
  }

  /** Resolve Git/GitLab MCP tool name for workflow: list merge requests. */
  async getGitLabMergeRequestsTool(): Promise<string> {
    const tools = await this.listGitTools();
    const match = tools.find(
      (t) =>
        /merge_request|merge request|list_mr|list_merge/i.test(t.name) ||
        (t.description && /merge request|MR/i.test(t.description))
    );
    return match?.name ?? "list_merge_requests";
  }

  /** Resolve Git/GitLab MCP tool name for workflow: MR notes / review comments / discussions. */
  async getGitLabMrNotesTool(): Promise<string> {
    const tools = await this.listGitTools();
    const match = tools.find(
      (t) =>
        /note|comment|discussion|review/i.test(t.name) ||
        (t.description && /note|comment|discussion|review.*MR/i.test(t.description))
    );
    return match?.name ?? "list_merge_request_notes";
  }

  async close(): Promise<void> {
    if (this.jiraTransport) await (this.jiraTransport as any).close?.();
    if (this.gitTransport) await (this.gitTransport as any).close?.();
    if (this.dbTransport) await (this.dbTransport as any).close?.();
    this.jiraClient = null;
    this.jiraTransport = null;
    this.lastJiraConnectionError = null;
    this.jiraToolsCache = null;
    this.gitClient = null;
    this.gitTransport = null;
    this.lastGitConnectionError = null;
    this.gitToolsCache = null;
    this.dbClient = null;
    this.dbTransport = null;
    this.started = false;
  }
}
