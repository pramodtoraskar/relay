/**
 * NL-routed engine: type definitions for LEARN, ROUTE, PLAN, NARRATE (PRD §4.3).
 */

export type RiskLevel = "safe" | "reversible" | "destructive";

export interface RawTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** Enriched tool produced by LEARN mode. */
export interface EnrichedTool {
  tool_id: string;
  human_intent: string;
  action_verbs: string[];
  example_phrases: string[];
  output_description: string;
  risk_level: RiskLevel;
}

/** LEARN mode output. */
export interface LearnOutput {
  mode: "learn";
  mcp_name: string;
  enriched_tools: EnrichedTool[];
  capability_summary: string;
  announcement: string;
}

export type WorkflowType =
  | "single"
  | "sequential"
  | "parallel"
  | "ambiguous"
  | "no_capability";

/** ROUTE mode output. */
export interface RouteOutput {
  mode: "route";
  intent_understood: string;
  workflow_type: WorkflowType;
  clarification_needed: string | null;
  no_capability_message: string | null;
  suggested_mcp_to_plug: string | null;
  proceed_to_plan: boolean;
}

/** Single step in a plan. */
export interface PlanStep {
  step: number;
  mcp: string;
  tool: string;
  inputs: Record<string, unknown>;
  input_sources?: Record<string, string>;
  depends_on: number[] | null;
  reason: string;
  risk_level: RiskLevel;
}

/** PLAN mode output. */
export interface PlanOutput {
  mode: "plan";
  needs_confirmation: boolean;
  confirmation_message: string | null;
  steps: PlanStep[];
}

/** NARRATE success output. */
export interface NarrateSuccessOutput {
  mode: "narrate";
  status: "success";
  summary: string;
  detail: string | null;
  follow_up_suggestions: string[];
}

/** NARRATE failure output. */
export interface NarrateFailureOutput {
  mode: "narrate";
  status: "failed";
  failed_step: number;
  what_happened: string;
  what_to_try: string;
}

export type NarrateOutput = NarrateSuccessOutput | NarrateFailureOutput;

/** Capability map entry: intent/verb -> tools that can fulfill it. */
export interface CapabilityMapEntry {
  mcp: string;
  tool_id: string;
  tool: string;
  human_intent: string;
  action_verbs: string[];
  risk_level: RiskLevel;
}

/** Session context passed into ROUTE/PLAN. */
export interface SessionContext {
  prior_messages?: Array<{ role: "user" | "assistant"; content: string }>;
  inferred_state?: Record<string, unknown>;
  last_tool_outputs?: Record<string, unknown>;
}

/** Result of executing one step. */
export interface StepResult {
  step: number;
  mcp: string;
  tool: string;
  output: unknown;
  isError?: boolean;
}

/** Full execution result for NARRATE. */
export interface ExecutionResult {
  success: boolean;
  steps: StepResult[];
  failed_step?: number;
  error_message?: string;
}
