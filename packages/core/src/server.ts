import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { RelayOrchestrator } from "./orchestrator.js";
import { morningCheckinTool, runMorningCheckin } from "./tools/morning-checkin.js";
import { startTaskTool, runStartTask } from "./tools/start-task.js";
import { updateProgressTool, runUpdateProgress } from "./tools/update-progress.js";
import { completeTaskTool, runCompleteTask } from "./tools/complete-task.js";
import { createHandoffTool, runCreateHandoff } from "./tools/create-handoff.js";
import { endOfDayTool, runEndOfDay } from "./tools/end-of-day.js";

const orchestrator = new RelayOrchestrator();

const tools = [
  {
    ...morningCheckinTool(orchestrator as any),
    inputSchema: {
      type: "object" as const,
      properties: {
        dev_name: { type: "string", description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)" },
      },
    },
  },
  {
    ...startTaskTool(orchestrator as any),
    inputSchema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Jira issue key (e.g. PROJ-42)" },
        dev_name: { type: "string", description: "Developer id" },
        micro_tasks: { type: "array", items: { type: "string" }, description: "Optional micro-task titles" },
      },
      required: ["task_id", "dev_name"],
    },
  },
  updateProgressTool(orchestrator as any),
  completeTaskTool(orchestrator as any),
  createHandoffTool(orchestrator as any),
  {
    ...endOfDayTool(orchestrator as any),
    inputSchema: {
      type: "object" as const,
      properties: {
        dev_name: { type: "string", description: "Developer id" },
      },
    },
  },
];

export async function runMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: "relay",
      version: "1.0.0",
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
    const devId = (a.dev_name ?? a.developer_id) as string | undefined;
    try {
      let text: string;
      switch (name) {
        case "morning_checkin":
          text = await runMorningCheckin(orchestrator as any, { developer_id: devId });
          break;
        case "start_task":
          text = await runStartTask(orchestrator as any, {
            issue_key: (a.task_id ?? a.issue_key) as string,
            micro_tasks: a.micro_tasks as string[] | undefined,
            developer_id: devId,
          });
          break;
        case "update_progress":
          text = await runUpdateProgress(orchestrator as any, { ...a, developer_id: devId } as any);
          break;
        case "complete_task":
          text = await runCompleteTask(orchestrator as any, a as { session_id: string; merge_request_url?: string; total_minutes?: number });
          break;
        case "create_handoff":
          text = await runCreateHandoff(orchestrator as any, { ...a, from_developer_id: devId } as any);
          break;
        case "end_of_day":
          text = await runEndOfDay(orchestrator as any, { developer_id: devId });
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
    const db = orchestrator.getDb();
    if (uri === "relay:///active-tasks") {
      const session = await db.getActiveSession(devId);
      const text = session
        ? JSON.stringify({ sessionId: session.id, jiraKey: session.jira_issue_key }, null, 2)
        : JSON.stringify({ message: "No active session" }, null, 2);
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "relay:///pending-handoffs") {
      const handoffs = await db.getPendingHandoffs(devId);
      const text = JSON.stringify(
        handoffs.map((h) => ({ id: h.id, title: h.title, from: h.from_developer_id, summary: h.context_summary })),
        null,
        2
      );
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "relay:///metrics") {
      const session = await db.getActiveSession(devId);
      const handoffs = await db.getPendingHandoffs(devId);
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
