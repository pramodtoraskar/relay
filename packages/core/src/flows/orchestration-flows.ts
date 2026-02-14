/**
 * Orchestration flow implementations for tools 2–3, 5–7, 9–38.
 * Each flow uses orchestrator (wm, db, Jira/GitLab MCP) and returns a result object.
 */

import type { RelayOrchestrator } from "../orchestrator.js";

const defaultDev = () => process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";
const projectId = () => process.env["RELAY_GITLAB_PROJECT"] ?? "";

// --- 2. Cross-Timezone Relay ---
export async function crossTimezoneRelay(
  orc: RelayOrchestrator,
  params: { dev_name?: string; suggest_only?: boolean }
): Promise<{ summary: string; suggested_handoff_to?: string; handoff_id?: string; next_steps: string[] }> {
  const devId = params.dev_name ?? defaultDev();
  const wm = orc.getWorkflowManager();
  const db = orc.getDb();
  const session = await db.getActiveSession(devId);
  const received = await db.getPendingHandoffs(devId);
  const developers = new Set<string>();
  received.forEach((h) => developers.add(h.from_developer_id));
  const suggested = Array.from(developers).filter((d) => d !== devId)[0] ?? "team-lead";
  if (!session?.jira_issue_key) {
    return { summary: "No active session to relay.", next_steps: ["Start a task first or use handoff_task with a specific issue."] };
  }
  if (params.suggest_only) {
    return { summary: "Suggested next developer (by recent handoffs): " + suggested, suggested_handoff_to: suggested, next_steps: ["Use handoff_task or smart_handoff to complete relay."] };
  }
  return { summary: "Use smart_handoff or handoff_task to relay. Suggested recipient: " + suggested, suggested_handoff_to: suggested, next_steps: ["Call handoff_task with to_developer_id = " + suggested] };
}

// --- 3. Knowledge Transfer ---
export async function knowledgeTransfer(
  orc: RelayOrchestrator,
  params: { task_id: string; dev_name?: string }
): Promise<{ summary: string; related_tasks: string[]; handoff_history: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, related_tasks: [], handoff_history: [], next_steps: [] };
  const projectKey = params.task_id.split("-")[0];
  const related = await wm.searchJira(`project = ${projectKey} AND text ~ "${projectKey}" ORDER BY updated DESC`, 10);
  const relatedKeys = related.filter((r) => r.key !== params.task_id).map((r) => `${r.key}: ${r.summary}`);
  const db = orc.getDb();
  const sessions = await db.getLastEndedSessions(params.dev_name ?? defaultDev(), 20);
  const handoffHistory = sessions.filter((s) => s.jira_issue_key === params.task_id).map((s) => `Session ${s.id} (${s.ended_at})`);
  return {
    summary: `Knowledge transfer package for ${params.task_id}.`,
    related_tasks: relatedKeys,
    handoff_history: handoffHistory,
    next_steps: ["Review related tasks in Jira", "Check GitLab for commits/MRs with " + params.task_id],
  };
}

// --- 5. Auto-Review Assignment ---
export async function autoReviewAssignment(
  orc: RelayOrchestrator,
  params: { task_id?: string; dev_name?: string }
): Promise<{ summary: string; suggested_reviewers: string[]; mr_url?: string; next_steps: string[] }> {
  const devId = params.dev_name ?? defaultDev();
  const wm = orc.getWorkflowManager();
  const db = orc.getDb();
  const session = await db.getActiveSession(devId);
  const issueKey = params.task_id ?? session?.jira_issue_key;
  if (!issueKey) return { summary: "No task in context. Provide task_id or start a task.", suggested_reviewers: [], next_steps: [] };
  const proj = projectId();
  const mrs = proj ? await wm.listMergeRequests(proj, "opened", 20) : [];
  const taskIdUpper = issueKey.toUpperCase();
  const mr = mrs.find((m) => m.title.toUpperCase().includes(taskIdUpper) || m.source_branch.toUpperCase().includes(taskIdUpper)) ?? mrs[0];
  const handoffs = await db.getPendingHandoffs(devId);
  const reviewers = [...new Set(handoffs.map((h) => h.from_developer_id).filter(Boolean))].slice(0, 2);
  return {
    summary: reviewers.length ? `Suggested reviewers: ${reviewers.join(", ")}` : "Suggest requesting review from team members (use query_gitlab to assign).",
    suggested_reviewers: reviewers,
    mr_url: mr?.web_url,
    next_steps: ["Request review on the MR", "Add reviewers in GitLab"],
  };
}

// --- 6. Review Bottleneck Detector ---
export async function reviewBottleneckDetector(orc: RelayOrchestrator): Promise<{ summary: string; overdue_mrs: Array<{ iid: number; title: string; days_waiting: number }>; next_steps: string[] }> {
  const proj = projectId();
  if (!proj) return { summary: "Set RELAY_GITLAB_PROJECT to scan MRs.", overdue_mrs: [], next_steps: [] };
  const wm = orc.getWorkflowManager();
  const mrs = await wm.listMergeRequests(proj, "opened", 50);
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const overdue = mrs
    .filter((m) => new Date(m.updated_at).getTime() < threeDaysAgo)
    .map((m) => ({ iid: m.iid, title: m.title, days_waiting: Math.floor((Date.now() - new Date(m.updated_at).getTime()) / (24 * 60 * 60 * 1000)) }));
  return {
    summary: overdue.length ? `${overdue.length} MR(s) waiting >3 days for review` : "No MRs waiting >3 days.",
    overdue_mrs: overdue.slice(0, 10),
    next_steps: overdue.length ? ["Create follow-up tasks in Jira", "Ping reviewers"] : [],
  };
}

// --- 7. Review Impact Analyzer ---
export async function reviewImpactAnalyzer(
  orc: RelayOrchestrator,
  params: { task_id: string; project_id?: string; mr_iid?: number }
): Promise<{ summary: string; total_comments: number; estimated_minutes: number; suggested_story_points?: number; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, total_comments: 0, estimated_minutes: 0, next_steps: [] };
  const proj = params.project_id ?? projectId();
  let totalComments = 0;
  let estimatedMinutes = 0;
  if (proj) {
    const mrs = await wm.listMergeRequests(proj, "opened", 10);
    const mr = params.mr_iid ? mrs.find((m) => m.iid === params.mr_iid) : mrs.find((m) => m.title.toUpperCase().includes(params.task_id.toUpperCase()));
    if (mr) {
      const notes = await wm.getMergeRequestNotes(proj, mr.iid);
      totalComments = notes.length;
      estimatedMinutes = totalComments * 15;
    }
  }
  const suggestedPoints = totalComments > 5 ? 3 : totalComments > 2 ? 2 : undefined;
  return {
    summary: `Review impact: ${totalComments} comment(s), ~${estimatedMinutes} min effort.`,
    total_comments: totalComments,
    estimated_minutes: estimatedMinutes,
    suggested_story_points: suggestedPoints,
    next_steps: suggestedPoints ? ["Consider updating story points in Jira"] : [],
  };
}

// --- 9. Work Session Analytics ---
export async function workSessionAnalytics(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; total_sessions: number; total_minutes: number; by_status: Record<string, number>; next_steps: string[] }> {
  const db = orc.getDb();
  const devId = params.dev_name ?? defaultDev();
  const sessions = await db.getWorkSessionsForDeveloper(devId, 50);
  const totalMinutes = sessions.reduce((s, x) => s + (x.total_minutes ?? 0), 0);
  const byStatus: Record<string, number> = {};
  sessions.forEach((x) => { byStatus[x.status] = (byStatus[x.status] ?? 0) + 1; });
  return {
    summary: `${sessions.length} sessions, ${totalMinutes} min logged.`,
    total_sessions: sessions.length,
    total_minutes: totalMinutes,
    by_status: byStatus,
    next_steps: ["Use focus time during your most active hours", "Consider batching similar tasks"],
  };
}

// --- 10. Focus Time Protector ---
export async function focusTimeProtector(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; focus_mode: boolean; session_id?: string; next_steps: string[] }> {
  const db = orc.getDb();
  const session = await db.getActiveSession(params.dev_name ?? defaultDev());
  const focusMode = session != null;
  return {
    summary: focusMode ? "Focus mode on — you have an active session. Batch non-urgent updates until you complete or hand off." : "No active session. Start a task to enable focus mode.",
    focus_mode: focusMode,
    session_id: session?.id,
    next_steps: focusMode ? ["Complete or hand off when ready", "Notifications can be batched"] : ["Start a task to enable focus mode"],
  };
}

// --- 11. Sprint Auto-Planning ---
export async function sprintAutoPlanning(orc: RelayOrchestrator, params: { sprint_id?: string; project_key?: string }): Promise<{ summary: string; suggested_assignments: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const backlog = await wm.searchJira(`project = ${key} AND status in (Backlog, "To Do") ORDER BY priority DESC`, 20);
  return {
    summary: `${backlog.length} issue(s) in backlog. Use Jira board to assign by capacity and expertise.`,
    suggested_assignments: backlog.slice(0, 5).map((b) => b.key),
    next_steps: ["Open Jira sprint board", "Assign by team capacity"],
  };
}

// --- 12. Capacity Forecasting ---
export async function capacityForecasting(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; assigned_count: number; session_hours: number; alert?: string; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const db = orc.getDb();
  const devId = params.dev_name ?? defaultDev();
  const assigned = await wm.searchJira(`assignee = currentUser() AND status != Done`, 50);
  const sessions = await db.getWorkSessionsForDeveloper(devId, 20);
  const sessionHours = sessions.reduce((s, x) => s + (x.total_minutes ?? 0) / 60, 0);
  const alert = assigned.length > 10 ? "High assignment count — consider rebalancing." : undefined;
  return {
    summary: `${assigned.length} assigned, ~${sessionHours.toFixed(1)} h in recent sessions.`,
    assigned_count: assigned.length,
    session_hours: Math.round(sessionHours * 10) / 10,
    alert,
    next_steps: alert ? ["Review workload with lead"] : [],
  };
}

// --- 13. Story Breakdown Assistant ---
export async function storyBreakdownAssistant(orc: RelayOrchestrator, params: { task_id: string }): Promise<{ summary: string; suggested_subtasks: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, suggested_subtasks: [], next_steps: [] };
  const suggested = ["Implement core logic", "Add tests", "Update documentation"];
  return {
    summary: `Suggested breakdown for ${params.task_id}: ${suggested.join("; ")}.`,
    suggested_subtasks: suggested,
    next_steps: ["Create sub-tasks in Jira", "Estimate each sub-task"],
  };
}

// --- 14. Technical Debt Tracker ---
export async function technicalDebtTracker(orc: RelayOrchestrator): Promise<{ summary: string; created_count: number; next_steps: string[] }> {
  return {
    summary: "Scan repo for TODO/FIXME/HACK (e.g. grep or GitLab file search), then create Jira tech-debt issues per finding.",
    created_count: 0,
    next_steps: ["Use query_gitlab or local grep for TODO|FIXME|HACK", "Create Jira issues and link to file:line"],
  };
}

// --- 15. Code Quality Gate ---
export async function codeQualityGate(orc: RelayOrchestrator, params: { task_id: string; dev_name?: string }): Promise<{ summary: string; passed: boolean; blockers: string[]; next_steps: string[] }> {
  const result = await orc.getWorkflowManager().reviewReadinessCheck(params.task_id, params.dev_name);
  const passed = result.data.blockers?.length === 0 && result.data.readiness.all_subtasks_complete !== false && result.data.readiness.no_conflicts !== false;
  return {
    summary: passed ? "Quality gate passed." : "Quality gate not passed.",
    passed,
    blockers: result.data.blockers?.map((b) => b.message ?? b.type) ?? [],
    next_steps: result.next_steps,
  };
}

// --- 16. Flaky Test Detective ---
export async function flakyTestDetector(orc: RelayOrchestrator): Promise<{ summary: string; next_steps: string[] }> {
  return {
    summary: "Integrate with CI to track intermittent failures. Use pipeline failure history and create Jira issues for flaky tests.",
    next_steps: ["Use query_gitlab list_pipelines / list_jobs for failure data", "Create Jira issues for recurring failures"],
  };
}

// --- 17. Merge Conflict Predictor ---
export async function mergeConflictPredictor(orc: RelayOrchestrator, params: { task_id: string; dev_name?: string }): Promise<{ summary: string; conflict_risk: string; overlapping: string[]; next_steps: string[] }> {
  const db = orc.getDb();
  const devId = params.dev_name ?? defaultDev();
  const session = await db.getActiveSession(devId);
  const others = await db.getWorkSessionsForDeveloper(devId, 1);
  return {
    summary: "Check GitLab for branches touching same files. Coordinate with other assignees on the project.",
    conflict_risk: "unknown",
    overlapping: [],
    next_steps: ["Use query_gitlab list_merge_requests to see open MRs", "Coordinate with team on same files"],
  };
}

// --- 18. Pair Programming Matcher ---
export async function pairProgrammingMatcher(orc: RelayOrchestrator, params: { task_id: string }): Promise<{ summary: string; suggested_pair?: string; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, next_steps: [] };
  const db = orc.getDb();
  const handoffs = await db.getPendingHandoffs(state.assigneeName ?? "");
  const from = handoffs.map((h) => h.from_developer_id)[0];
  return {
    summary: from ? `Suggested pair (recent handoff from): ${from}` : "Use Jira assignees or team list to find a pair.",
    suggested_pair: from,
    next_steps: ["Coordinate with suggested developer"],
  };
}

// --- 19. Blockers Resolver ---
export async function blockersResolver(orc: RelayOrchestrator, params: { task_id: string; blocker_reason?: string }): Promise<{ summary: string; unblock_task_created: boolean; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, unblock_task_created: false, next_steps: [] };
  const projectKey = params.task_id.split("-")[0];
  const jiraRes = await orc.callJiraMcpTool("create_issue", {
    project: projectKey,
    summary: `Unblock ${params.task_id}: ${params.blocker_reason ?? "blocker"}`,
    description: `Parent: ${params.task_id}. ${params.blocker_reason ?? ""}`,
    issuetype: "Task",
    issueType: "Task",
    type: "Task",
  });
  const created = !jiraRes.isError;
  return {
    summary: created ? "Unblock task created in Jira. Assign to ops/lead." : "Could not create unblock task: " + (jiraRes.content || "unknown"),
    unblock_task_created: created,
    next_steps: created ? ["Assign unblock task", "Link to parent"] : ["Create task manually in Jira"],
  };
}

// --- 20. Pre-Deploy Checklist ---
export async function preDeployChecklist(orc: RelayOrchestrator, params: { project_key?: string }): Promise<{ summary: string; ready: boolean; blockers: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const notDone = await wm.searchJira(`project = ${key} AND status != Done AND status != Closed`, 20);
  const proj = projectId();
  const mrs = proj ? await wm.listMergeRequests(proj, "opened", 5) : [];
  const blockers: string[] = [];
  if (notDone.length) blockers.push(`${notDone.length} issue(s) not Done`);
  if (mrs.length) blockers.push(`${mrs.length} MR(s) still open`);
  const ready = blockers.length === 0;
  return {
    summary: ready ? "Pre-deploy check passed." : "Pre-deploy blocked.",
    ready,
    blockers,
    next_steps: ready ? ["Proceed with deploy"] : ["Complete or move issues", "Merge MRs"],
  };
}

// --- 21. Deploy Impact Analyzer ---
export async function deployImpactAnalyzer(orc: RelayOrchestrator, params: { version?: string; project_key?: string }): Promise<{ summary: string; issues_in_scope: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const done = await wm.searchJira(`project = ${key} AND status = Done ORDER BY updated DESC`, 15);
  return {
    summary: `Done issues (candidate for release): ${done.length}. Generate release notes from Jira.`,
    issues_in_scope: done.map((d) => d.key),
    next_steps: ["Generate release notes", "Tag release in GitLab"],
  };
}

// --- 22. Rollback Recommender ---
export async function rollbackRecommender(orc: RelayOrchestrator): Promise<{ summary: string; next_steps: string[] }> {
  return {
    summary: "Link to monitoring/APM to detect error spikes. If rollback needed, identify last deploy and revert.",
    next_steps: ["Check GitLab pipeline for last successful deploy", "Use query_gitlab for commit history"],
  };
}

// --- 23. Developer Happiness Tracker ---
export async function developerHappinessTracker(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; signals: string[]; next_steps: string[] }> {
  const db = orc.getDb();
  const sessions = await db.getWorkSessionsForDeveloper(params.dev_name ?? defaultDev(), 30);
  const longSessions = sessions.filter((s) => (s.total_minutes ?? 0) > 240);
  const signals = [];
  if (longSessions.length > 2) signals.push("Many long sessions (>4h)");
  return {
    summary: signals.length ? "Consider checking in with the developer." : "No strong signals.",
    signals,
    next_steps: signals.length ? ["1:1 check-in", "Review workload"] : [],
  };
}

// --- 24. Story Cycle Time Analyzer ---
export async function storyCycleTimeAnalyzer(orc: RelayOrchestrator, params: { project_key?: string }): Promise<{ summary: string; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const done = await wm.searchJira(`project = ${key} AND status = Done ORDER BY updated DESC`, 20);
  return {
    summary: `${done.length} Done issue(s). Use Jira reports or query_jira for created/updated dates to compute cycle time.`,
    next_steps: ["Use Jira cycle time report", "Compare work time (SQLite sessions) vs calendar time"],
  };
}

// --- 25. Team Velocity Dashboard ---
export async function teamVelocityDashboard(orc: RelayOrchestrator, params: { project_key?: string }): Promise<{ summary: string; completed_count: number; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const done = await wm.searchJira(`project = ${key} AND status = Done ORDER BY updated DESC`, 50);
  return {
    summary: `${done.length} completed issue(s) in project. Use Jira velocity chart for trend.`,
    completed_count: done.length,
    next_steps: ["Open Jira velocity chart", "Correlate with GitLab commits"],
  };
}

// --- 26. New Developer Guide ---
export async function newDeveloperGuide(orc: RelayOrchestrator): Promise<{ summary: string; good_first_issues: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const issues = await wm.searchJira('labels = "good first issue" OR summary ~ "first" ORDER BY created DESC', 10);
  return {
    summary: `${issues.length} potential good-first issue(s). Review and assign.`,
    good_first_issues: issues.map((i) => i.key + ": " + i.summary),
    next_steps: ["Assign good-first issues", "Point to README and docs"],
  };
}

// --- 27. Code Area Mapper ---
export async function codeAreaMapper(orc: RelayOrchestrator, params: { task_id: string; area?: string }): Promise<{ summary: string; owners?: string[]; related_stories: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const state = await wm.getJiraState(params.task_id);
  if (!state) return { summary: `Issue ${params.task_id} not found.`, related_stories: [], next_steps: [] };
  const projectKey = params.task_id.split("-")[0];
  const related = await wm.searchJira(`project = ${projectKey} ORDER BY updated DESC`, 5);
  return {
    summary: "Use GitLab blame/file history for code ownership. Related stories from Jira.",
    related_stories: related.map((r) => r.key),
    next_steps: ["Use query_gitlab for file list", "Pair with code owner"],
  };
}

// --- 28. Best Practices Enforcer ---
export async function bestPracticesEnforcer(orc: RelayOrchestrator, params: { task_id: string }): Promise<{ summary: string; gaps: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  await wm.getJiraState(params.task_id);
  return {
    summary: "Check MR description for tests/docs. Add sub-tasks if missing.",
    gaps: ["Verify tests added", "Verify docs updated"],
    next_steps: ["Add sub-tasks in Jira if standards not met"],
  };
}

// --- 29. Interruption Minimizer ---
export async function interruptionMinimizer(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; next_steps: string[] }> {
  const db = orc.getDb();
  const session = await db.getActiveSession(params.dev_name ?? defaultDev());
  return {
    summary: session ? "Active session — batch non-urgent notifications and use focus time." : "No active session.",
    next_steps: ["Block focus time on calendar", "Batch Slack/email outside focus"],
  };
}

// --- 30. Task Switcher ---
export async function taskSwitcher(orc: RelayOrchestrator, params: { new_task_id: string; dev_name?: string }): Promise<{ summary: string; previous_task?: string; next_steps: string[] }> {
  const db = orc.getDb();
  const session = await db.getActiveSession(params.dev_name ?? defaultDev());
  const previousTask = session?.jira_issue_key ?? undefined;
  return {
    summary: previousTask ? `Switching from ${previousTask} to ${params.new_task_id}. Use start_task for the new task; hand off or complete the previous one.` : `Start ${params.new_task_id} with start_task.`,
    previous_task: previousTask ?? undefined,
    next_steps: ["complete_task or handoff_task for current", "start_task for " + params.new_task_id],
  };
}

// --- 31. Work-Life Balance Monitor ---
export async function workLifeBalanceMonitor(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; hours_this_week: number; alert?: string; next_steps: string[] }> {
  const db = orc.getDb();
  const sessions = await db.getWorkSessionsForDeveloper(params.dev_name ?? defaultDev(), 30);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeek = sessions.filter((s) => s.started_at >= oneWeekAgo);
  const hours = thisWeek.reduce((s, x) => s + (x.total_minutes ?? 0) / 60, 0);
  const alert = hours > 50 ? "Over 50 hours this week — consider rebalancing." : undefined;
  return {
    summary: `~${hours.toFixed(1)} h in the last 7 days.`,
    hours_this_week: Math.round(hours * 10) / 10,
    alert,
    next_steps: alert ? ["Take breaks", "Redistribute work"] : [],
  };
}

// --- 32. Smart Task Recommender ---
export async function smartTaskRecommender(orc: RelayOrchestrator, params: { dev_name?: string }): Promise<{ summary: string; suggested_tasks: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const backlog = await wm.searchJira("assignee = currentUser() AND status in (Backlog, \"To Do\") ORDER BY priority DESC", 10);
  return {
    summary: backlog.length ? `Suggested: ${backlog.slice(0, 3).map((b) => b.key).join(", ")}` : "No open tasks. Pull from backlog.",
    suggested_tasks: backlog.map((b) => b.key),
    next_steps: ["start_task with suggested key"],
  };
}

// --- 33. Code Pattern Learner ---
export async function codePatternLearner(orc: RelayOrchestrator, params: { task_id?: string }): Promise<{ summary: string; next_steps: string[] }> {
  return {
    summary: "Review past MR comments for your common patterns. Add a pre-commit checklist from recurring feedback.",
    next_steps: ["Use review_readiness_check before submitting", "Address recurring review comments"],
  };
}

// --- 34. Sprint Risk Predictor ---
export async function sprintRiskPredictor(orc: RelayOrchestrator, params: { project_key?: string }): Promise<{ summary: string; remaining_count: number; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const open = await wm.searchJira(`project = ${key} AND status != Done AND status != Closed`, 50);
  return {
    summary: `${open.length} issue(s) still open. Use velocity to predict completion.`,
    remaining_count: open.length,
    next_steps: ["Review scope", "Consider descoping or adding capacity"],
  };
}

// --- 35. Automated Retrospective ---
export async function automatedRetrospective(orc: RelayOrchestrator, params: { sprint_id?: string; project_key?: string }): Promise<{ summary: string; completed: number; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  const key = params.project_key ?? "PROJ";
  const done = await wm.searchJira(`project = ${key} AND status = Done ORDER BY updated DESC`, 30);
  return {
    summary: `Sprint data: ${done.length} Done. Gather: What went well? What to improve?`,
    completed: done.length,
    next_steps: ["Run retro meeting", "Create improvement tasks in Jira"],
  };
}

// --- 36. Security Review Trigger ---
export async function securityReviewTrigger(orc: RelayOrchestrator, params: { task_id: string }): Promise<{ summary: string; security_required: boolean; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  await wm.getJiraState(params.task_id);
  return {
    summary: "If MR touches auth/payment/PII, add sub-task 'Security review' and request security team.",
    security_required: true,
    next_steps: ["Create Security review sub-task in Jira", "Block merge until approved"],
  };
}

// --- 37. Compliance Checker ---
export async function complianceChecker(orc: RelayOrchestrator, params: { task_id: string }): Promise<{ summary: string; compliance_tasks: string[]; next_steps: string[] }> {
  const wm = orc.getWorkflowManager();
  await wm.getJiraState(params.task_id);
  return {
    summary: "If PII handling changed, ensure privacy docs updated. Create compliance task if needed.",
    compliance_tasks: ["Update privacy policy", "Data retention review"],
    next_steps: ["Create compliance task in Jira", "Assign to legal/compliance"],
  };
}

// --- 38. Dependency Vulnerability Scanner ---
export async function dependencyVulnerabilityScanner(orc: RelayOrchestrator): Promise<{ summary: string; next_steps: string[] }> {
  return {
    summary: "Scan package.json/requirements.txt (e.g. npm audit, pip-audit). Create Jira security issues for known vulnerabilities.",
    next_steps: ["Run npm audit or pip-audit", "Create Jira issues for high/critical"],
  };
}
