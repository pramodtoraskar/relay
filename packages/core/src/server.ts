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
import {
  createSubtaskFromMrReviewTool,
  runCreateSubtaskFromMrReview,
} from "./tools/create-subtask-from-mr-review.js";
import { endOfDayTool, runEndOfDay } from "./tools/end-of-day.js";
import {
  getRoleGuidanceTool,
  runGetRoleGuidance,
  roleAwareCheckinTool,
  runRoleAwareCheckin,
  suggestActionsForRoleTool,
  runSuggestActionsForRole,
  listRolesTool,
  runListRoles,
} from "./tools/role-tools.js";
import {
  smartHandoffTool,
  runSmartHandoff,
  reviewReadinessTool,
  runReviewReadinessCheck,
  contextResurrectionTool,
  runContextResurrection,
  crossTimezoneRelayTool,
  runCrossTimezoneRelay,
  knowledgeTransferTool,
  runKnowledgeTransfer,
  autoReviewAssignmentTool,
  runAutoReviewAssignment,
  reviewBottleneckDetectorTool,
  runReviewBottleneckDetector,
  reviewImpactAnalyzerTool,
  runReviewImpactAnalyzer,
  workSessionAnalyticsTool,
  runWorkSessionAnalytics,
  focusTimeProtectorTool,
  runFocusTimeProtector,
  sprintAutoPlanningTool,
  runSprintAutoPlanning,
  capacityForecastingTool,
  runCapacityForecasting,
  storyBreakdownAssistantTool,
  runStoryBreakdownAssistant,
  technicalDebtTrackerTool,
  runTechnicalDebtTracker,
  codeQualityGateTool,
  runCodeQualityGate,
  flakyTestDetectorTool,
  runFlakyTestDetector,
  mergeConflictPredictorTool,
  runMergeConflictPredictor,
  pairProgrammingMatcherTool,
  runPairProgrammingMatcher,
  blockersResolverTool,
  runBlockersResolver,
  preDeployChecklistTool,
  runPreDeployChecklist,
  deployImpactAnalyzerTool,
  runDeployImpactAnalyzer,
  rollbackRecommenderTool,
  runRollbackRecommender,
  developerHappinessTrackerTool,
  runDeveloperHappinessTracker,
  storyCycleTimeAnalyzerTool,
  runStoryCycleTimeAnalyzer,
  teamVelocityDashboardTool,
  runTeamVelocityDashboard,
  newDeveloperGuideTool,
  runNewDeveloperGuide,
  codeAreaMapperTool,
  runCodeAreaMapper,
  bestPracticesEnforcerTool,
  runBestPracticesEnforcer,
  interruptionMinimizerTool,
  runInterruptionMinimizer,
  taskSwitcherTool,
  runTaskSwitcher,
  workLifeBalanceMonitorTool,
  runWorkLifeBalanceMonitor,
  smartTaskRecommenderTool,
  runSmartTaskRecommender,
  codePatternLearnerTool,
  runCodePatternLearner,
  sprintRiskPredictorTool,
  runSprintRiskPredictor,
  automatedRetrospectiveTool,
  runAutomatedRetrospective,
  securityReviewTriggerTool,
  runSecurityReviewTrigger,
  complianceCheckerTool,
  runComplianceChecker,
  dependencyVulnerabilityScannerTool,
  runDependencyVulnerabilityScanner,
} from "./tools/index.js";

const orchestrator = new RelayOrchestrator();

const morningCheckinBase = {
  ...morningCheckinTool(orchestrator as any),
  inputSchema: {
    type: "object" as const,
    properties: {
      dev_name: { type: "string", description: "Developer id (defaults to RELAY_DEVELOPER_ID or current user)" },
    },
  },
};
const startTaskBase = {
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
};
const endSessionBase = {
  ...endOfDayTool(orchestrator as any),
  inputSchema: {
    type: "object" as const,
    properties: {
      dev_name: { type: "string", description: "Developer id" },
    },
  },
};

const tools = [
  morningCheckinBase,
  { ...morningCheckinBase, name: "status_check" },
  { ...morningCheckinBase, name: "get_context" },
  startTaskBase,
  { ...startTaskBase, name: "begin_work" },
  updateProgressTool(orchestrator as any),
  { ...updateProgressTool(orchestrator as any), name: "update_status" },
  completeTaskTool(orchestrator as any),
  { ...completeTaskTool(orchestrator as any), name: "finish_task" },
  createHandoffTool(orchestrator as any),
  { ...createHandoffTool(orchestrator as any), name: "transfer_to" },
  createSubtaskFromMrReviewTool(),
  smartHandoffTool(),
  reviewReadinessTool(),
  contextResurrectionTool(),
  crossTimezoneRelayTool(),
  knowledgeTransferTool(),
  autoReviewAssignmentTool(),
  reviewBottleneckDetectorTool(),
  reviewImpactAnalyzerTool(),
  workSessionAnalyticsTool(),
  focusTimeProtectorTool(),
  sprintAutoPlanningTool(),
  capacityForecastingTool(),
  storyBreakdownAssistantTool(),
  technicalDebtTrackerTool(),
  codeQualityGateTool(),
  flakyTestDetectorTool(),
  mergeConflictPredictorTool(),
  pairProgrammingMatcherTool(),
  blockersResolverTool(),
  preDeployChecklistTool(),
  deployImpactAnalyzerTool(),
  rollbackRecommenderTool(),
  developerHappinessTrackerTool(),
  storyCycleTimeAnalyzerTool(),
  teamVelocityDashboardTool(),
  newDeveloperGuideTool(),
  codeAreaMapperTool(),
  bestPracticesEnforcerTool(),
  interruptionMinimizerTool(),
  taskSwitcherTool(),
  workLifeBalanceMonitorTool(),
  smartTaskRecommenderTool(),
  codePatternLearnerTool(),
  sprintRiskPredictorTool(),
  automatedRetrospectiveTool(),
  securityReviewTriggerTool(),
  complianceCheckerTool(),
  dependencyVulnerabilityScannerTool(),
  endSessionBase,
  { ...endSessionBase, name: "pause_session" },
  { ...endSessionBase, name: "resume_session" },
  { ...endSessionBase, name: "session_summary" },
  {
    name: "query_jira",
    description: "Query Jira. Call any tool from the Jira MCP by name (e.g. search_issues, get_issue, transition_issue). Use list_jira_mcp_tools to see available tools.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tool_name: { type: "string", description: "Name of the Jira MCP tool to call" },
        arguments: { type: "object", description: "Arguments to pass to the tool (key-value object)" },
      },
      required: ["tool_name"],
    },
  },
  {
    name: "query_gitlab",
    description: "Query GitLab. Call any tool from the GitLab MCP by name. Use list_gitlab_mcp_tools to see available tools.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tool_name: { type: "string", description: "Name of the GitLab MCP tool to call" },
        arguments: { type: "object", description: "Arguments to pass to the tool (key-value object)" },
      },
      required: ["tool_name"],
    },
  },
  {
    name: "list_jira_mcp_tools",
    description: "List all tools exposed by the Jira MCP. Use before query_jira to discover tool names.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_gitlab_mcp_tools",
    description: "List all tools exposed by the GitLab MCP. Use before query_gitlab to discover tool names.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  getRoleGuidanceTool(),
  roleAwareCheckinTool(orchestrator.getWorkflowManager()),
  suggestActionsForRoleTool(),
  listRolesTool(),
  {
    name: "active_tasks",
    description: "Show active tasks. Returns current work session for the developer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dev_name: { type: "string", description: "Developer id" },
      },
    },
  },
  {
    name: "pending_handoffs",
    description: "Show pending handoffs. Returns handoffs waiting for the developer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dev_name: { type: "string", description: "Developer id" },
      },
    },
  },
  {
    name: "show_metrics",
    description: "Show metrics. Session and handoff counts for the developer.",
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
        case "whats_up":
        case "status_check":
        case "get_context":
          text = await runMorningCheckin(orchestrator as any, { developer_id: devId });
          break;
        case "start_task":
        case "begin_work":
          text = await runStartTask(orchestrator as any, {
            issue_key: (a.task_id ?? a.issue_key) as string,
            micro_tasks: a.micro_tasks as string[] | undefined,
            developer_id: devId,
          });
          break;
        case "log_work":
        case "update_status":
          text = await runUpdateProgress(orchestrator as any, { ...a, developer_id: devId } as any);
          break;
        case "complete_task":
        case "finish_task":
          text = await runCompleteTask(orchestrator as any, a as { session_id: string; merge_request_url?: string; total_minutes?: number });
          break;
        case "handoff_task":
        case "transfer_to":
          text = await runCreateHandoff(orchestrator.getWorkflowManager(), {
            ...a,
            from_developer_id: devId,
            merge_request_url: a.merge_request_url as string | undefined,
            jira_issue_key: a.jira_issue_key as string | undefined,
          } as any);
          break;
        case "create_subtask_from_mr_review":
          text = await runCreateSubtaskFromMrReview(orchestrator, {
            jira_issue_key: a.jira_issue_key as string,
            merge_request_url: a.merge_request_url as string | undefined,
            project_id: a.project_id as string | undefined,
            project_name: a.project_name as string | undefined,
            mr_iid: a.mr_iid as number | undefined,
            merge_request_id: a.merge_request_id as string | undefined,
          });
          break;
        case "smart_handoff":
          text = await runSmartHandoff(orchestrator, {
            task_id: a.task_id as string,
            from_dev: a.from_dev as string,
            to_dev: a.to_dev as string,
            auto_analyze: a.auto_analyze as boolean | undefined,
            custom_notes: a.custom_notes as string | undefined,
            project_id: a.project_id as string | undefined,
            project_name: a.project_name as string | undefined,
            merge_request_url: a.merge_request_url as string | undefined,
            mr_iid: a.mr_iid as number | undefined,
          });
          break;
        case "review_readiness_check":
          text = await runReviewReadinessCheck(orchestrator, {
            task_id: a.task_id as string,
            dev_name: devId,
          });
          break;
        case "context_resurrection":
          text = await runContextResurrection(orchestrator, {
            dev_name: devId,
            days_away: a.days_away as number | undefined,
          });
          break;
        case "cross_timezone_relay":
          text = await runCrossTimezoneRelay(orchestrator, { dev_name: devId, suggest_only: a.suggest_only as boolean | undefined });
          break;
        case "knowledge_transfer":
          text = await runKnowledgeTransfer(orchestrator, { task_id: a.task_id as string, dev_name: devId });
          break;
        case "auto_review_assignment":
          text = await runAutoReviewAssignment(orchestrator, { task_id: a.task_id as string | undefined, dev_name: devId });
          break;
        case "review_bottleneck_detector":
          text = await runReviewBottleneckDetector(orchestrator);
          break;
        case "review_impact_analyzer":
          text = await runReviewImpactAnalyzer(orchestrator, {
            task_id: a.task_id as string,
            project_id: a.project_id as string | undefined,
            mr_iid: a.mr_iid as number | undefined,
          });
          break;
        case "work_session_analytics":
          text = await runWorkSessionAnalytics(orchestrator, { dev_name: devId });
          break;
        case "focus_time_protector":
          text = await runFocusTimeProtector(orchestrator, { dev_name: devId });
          break;
        case "sprint_auto_planning":
          text = await runSprintAutoPlanning(orchestrator, { sprint_id: a.sprint_id as string | undefined, project_key: a.project_key as string | undefined });
          break;
        case "capacity_forecasting":
          text = await runCapacityForecasting(orchestrator, { dev_name: devId });
          break;
        case "story_breakdown_assistant":
          text = await runStoryBreakdownAssistant(orchestrator, { task_id: a.task_id as string });
          break;
        case "technical_debt_tracker":
          text = await runTechnicalDebtTracker(orchestrator);
          break;
        case "code_quality_gate":
          text = await runCodeQualityGate(orchestrator, { task_id: a.task_id as string, dev_name: devId });
          break;
        case "flaky_test_detective":
          text = await runFlakyTestDetector(orchestrator);
          break;
        case "merge_conflict_predictor":
          text = await runMergeConflictPredictor(orchestrator, { task_id: a.task_id as string, dev_name: devId });
          break;
        case "pair_programming_matcher":
          text = await runPairProgrammingMatcher(orchestrator, { task_id: a.task_id as string });
          break;
        case "blockers_resolver":
          text = await runBlockersResolver(orchestrator, { task_id: a.task_id as string, blocker_reason: a.blocker_reason as string | undefined });
          break;
        case "pre_deploy_checklist":
          text = await runPreDeployChecklist(orchestrator, { project_key: a.project_key as string | undefined });
          break;
        case "deploy_impact_analyzer":
          text = await runDeployImpactAnalyzer(orchestrator, { version: a.version as string | undefined, project_key: a.project_key as string | undefined });
          break;
        case "rollback_recommender":
          text = await runRollbackRecommender(orchestrator);
          break;
        case "developer_happiness_tracker":
          text = await runDeveloperHappinessTracker(orchestrator, { dev_name: devId });
          break;
        case "story_cycle_time_analyzer":
          text = await runStoryCycleTimeAnalyzer(orchestrator, { project_key: a.project_key as string | undefined });
          break;
        case "team_velocity_dashboard":
          text = await runTeamVelocityDashboard(orchestrator, { project_key: a.project_key as string | undefined });
          break;
        case "new_developer_guide":
          text = await runNewDeveloperGuide(orchestrator);
          break;
        case "code_area_mapper":
          text = await runCodeAreaMapper(orchestrator, { task_id: a.task_id as string, area: a.area as string | undefined });
          break;
        case "best_practices_enforcer":
          text = await runBestPracticesEnforcer(orchestrator, { task_id: a.task_id as string });
          break;
        case "interruption_minimizer":
          text = await runInterruptionMinimizer(orchestrator, { dev_name: devId });
          break;
        case "task_switcher":
          text = await runTaskSwitcher(orchestrator, { new_task_id: a.new_task_id as string, dev_name: devId });
          break;
        case "work_life_balance_monitor":
          text = await runWorkLifeBalanceMonitor(orchestrator, { dev_name: devId });
          break;
        case "smart_task_recommender":
          text = await runSmartTaskRecommender(orchestrator, { dev_name: devId });
          break;
        case "code_pattern_learner":
          text = await runCodePatternLearner(orchestrator, { task_id: a.task_id as string | undefined });
          break;
        case "sprint_risk_predictor":
          text = await runSprintRiskPredictor(orchestrator, { project_key: a.project_key as string | undefined });
          break;
        case "automated_retrospective":
          text = await runAutomatedRetrospective(orchestrator, { sprint_id: a.sprint_id as string | undefined, project_key: a.project_key as string | undefined });
          break;
        case "security_review_trigger":
          text = await runSecurityReviewTrigger(orchestrator, { task_id: a.task_id as string });
          break;
        case "compliance_checker":
          text = await runComplianceChecker(orchestrator, { task_id: a.task_id as string });
          break;
        case "dependency_vulnerability_scanner":
          text = await runDependencyVulnerabilityScanner(orchestrator);
          break;
        case "end_session":
        case "pause_session":
        case "resume_session":
        case "session_summary":
          text = await runEndOfDay(orchestrator as any, { developer_id: devId });
          break;
        case "query_jira": {
          const toolName = a.tool_name as string;
          const toolArgs = (a.arguments ?? a.args ?? {}) as Record<string, unknown>;
          const out = await orchestrator.callJiraMcpTool(toolName, toolArgs);
          text = out.isError ? `Error: ${out.content}` : out.content;
          break;
        }
        case "query_gitlab": {
          const toolName = a.tool_name as string;
          const toolArgs = (a.arguments ?? a.args ?? {}) as Record<string, unknown>;
          const out = await orchestrator.callGitlabMcpTool(toolName, toolArgs);
          text = out.isError ? `Error: ${out.content}` : out.content;
          break;
        }
        case "list_jira_mcp_tools": {
          const list = await orchestrator.listJiraMcpTools();
          text = list.length
            ? list.map((t) => `- **${t.name}**: ${t.description ?? ""}`).join("\n")
            : "No Jira MCP connected or no tools returned.";
          break;
        }
        case "list_gitlab_mcp_tools": {
          const list = await orchestrator.listGitlabMcpTools();
          text = list.length
            ? list.map((t) => `- **${t.name}**: ${t.description ?? ""}`).join("\n")
            : "No GitLab MCP connected or no tools returned.";
          break;
        }
        case "get_guidance":
          text = await runGetRoleGuidance({ role: (a.role as string) ?? "engineer" });
          break;
        case "role_aware_checkin":
          text = await runRoleAwareCheckin(orchestrator.getWorkflowManager(), {
            role: a.role as string,
            developer_id: devId,
            dev_name: devId,
          });
          break;
        case "suggest_next":
          text = await runSuggestActionsForRole(orchestrator.getWorkflowManager(), {
            role: a.role as string,
            context: a.context as string | undefined,
            developer_id: devId,
            dev_name: devId,
          });
          break;
        case "show_roles":
          text = await runListRoles();
          break;
        case "active_tasks": {
          const db = orchestrator.getDb();
          const session = await db.getActiveSession(devId ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default");
          text = session
            ? `Active session: **${session.id}** — Jira: ${session.jira_issue_key ?? "none"}`
            : "No active session.";
          break;
        }
        case "pending_handoffs": {
          const db = orchestrator.getDb();
          const handoffs = await db.getPendingHandoffs(devId ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default");
          text = handoffs.length
            ? handoffs.map((h) => `- **${h.title}** (from ${h.from_developer_id})${h.context_summary ? ` — ${h.context_summary}` : ""}`).join("\n")
            : "No pending handoffs.";
          break;
        }
        case "show_metrics": {
          const db = orchestrator.getDb();
          const dev = devId ?? process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
          const session = await db.getActiveSession(dev);
          const handoffs = await db.getPendingHandoffs(dev);
          text = [
            `Active session: ${session ? "yes" : "no"}${session ? ` (${session.id})` : ""}`,
            `Pending handoffs: ${handoffs.length}`,
          ].join("\n");
          break;
        }
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
