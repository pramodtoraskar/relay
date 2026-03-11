/**
 * NL-routed engine — LEARN, ROUTE, PLAN, EXECUTE, NARRATE (PRD §2, ADR-008).
 */

export { NlRegistry } from "./registry.js";
export type { IMcpAdapter } from "./registry.js";
export { LlmClient } from "./llm-client.js";
export type { LlmClientOptions } from "./llm-client.js";
export { runLearn, learnOutputToCapabilityEntries } from "./learner.js";
export { runRoute } from "./router.js";
export { runPlan } from "./planner.js";
export { runExecute } from "./executor.js";
export { runNarrate } from "./narrate.js";
export { chat } from "./engine.js";
export type { ChatResult, ChatOptions } from "./engine.js";
export { createJiraAdapter, createGitAdapter, createSqliteAdapter } from "./adapters.js";
export { createRegistryFromMcp, populateCapabilityMap } from "./bootstrap.js";
export { buildPrompt } from "./prompt.js";

export type {
  RawTool,
  EnrichedTool,
  LearnOutput,
  RouteOutput,
  PlanOutput,
  PlanStep,
  NarrateOutput,
  ExecutionResult,
  StepResult,
  SessionContext,
  CapabilityMapEntry,
  RiskLevel,
  WorkflowType,
} from "./types.js";
