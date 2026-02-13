import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DatabaseManager } from "./database-manager.js";
import { JiraClient } from "./jira-client.js";
import { GitClient } from "./git-client.js";
import { WorkflowManager } from "./workflow-manager.js";
import { morningCheckinTool, runMorningCheckin } from "./tools/morning-checkin.js";
import { startTaskTool, runStartTask } from "./tools/start-task.js";
import { updateProgressTool, runUpdateProgress } from "./tools/update-progress.js";
import { completeTaskTool, runCompleteTask } from "./tools/complete-task.js";
import { createHandoffTool, runCreateHandoff } from "./tools/create-handoff.js";
import { endOfDayTool, runEndOfDay } from "./tools/end-of-day.js";

const db = new DatabaseManager();
const jira = new JiraClient();
jira.configure();
const git = new GitClient();
const wm = new WorkflowManager(db, jira, git);

const tools = [
  morningCheckinTool(wm),
  startTaskTool(wm),
  updateProgressTool(wm),
  completeTaskTool(wm),
  createHandoffTool(wm),
  endOfDayTool(wm),
];

export async function runMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: "relay",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args as Record<string, unknown>) ?? {};
    try {
      let text: string;
      switch (name) {
        case "morning_checkin":
          text = await runMorningCheckin(wm, a as { developer_id?: string });
          break;
        case "start_task":
          text = await runStartTask(wm, a as { issue_key: string; micro_tasks?: string[]; developer_id?: string });
          break;
        case "update_progress":
          text = await runUpdateProgress(wm, a as any);
          break;
        case "complete_task":
          text = await runCompleteTask(wm, a as { session_id: string; merge_request_url?: string; total_minutes?: number });
          break;
        case "create_handoff":
          text = await runCreateHandoff(wm, a as any);
          break;
        case "end_of_day":
          text = await runEndOfDay(wm, a as { developer_id?: string });
          break;
        default:
          text = `Unknown tool: ${name}`;
      }
      return { content: [{ type: "text", text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "relay:///active-tasks", name: "Active tasks", description: "Current work sessions" },
      { uri: "relay:///pending-handoffs", name: "Pending handoffs", description: "Handoffs waiting for you" },
      { uri: "relay:///metrics", name: "Metrics", description: "Session and handoff counts" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const devId = process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
    if (uri === "relay:///active-tasks") {
      const session = db.getActiveSession(devId);
      const text = session
        ? JSON.stringify({ sessionId: session.id, jiraKey: session.jira_issue_key }, null, 2)
        : JSON.stringify({ message: "No active session" }, null, 2);
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "relay:///pending-handoffs") {
      const handoffs = db.getPendingHandoffs(devId);
      const text = JSON.stringify(
        handoffs.map((h) => ({ id: h.id, title: h.title, from: h.from_developer_id, summary: h.context_summary })),
        null,
        2
      );
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "relay:///metrics") {
      const session = db.getActiveSession(devId);
      const handoffs = db.getPendingHandoffs(devId);
      const text = JSON.stringify(
        {
          activeSession: session != null,
          sessionId: session?.id ?? null,
          pendingHandoffsCount: handoffs.length,
        },
        null,
        2
      );
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
