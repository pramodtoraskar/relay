/**
 * NL-routed engine — top-level chat flow: Route → Plan → Execute → Narrate.
 */

import type { NlRegistry } from "./registry.js";
import type { LlmClient } from "./llm-client.js";
import type { SessionContext } from "./types.js";
import type { PlanOutput } from "./types.js";
import { runRoute } from "./router.js";
import { runPlan } from "./planner.js";
import { runExecute } from "./executor.js";
import { runNarrate } from "./narrate.js";

export type ChatResult =
  | { type: "clarification"; message: string }
  | { type: "no_capability"; message: string; suggested_mcp: string | null }
  | { type: "confirmation_required"; message: string; plan: PlanOutput }
  | { type: "result"; summary: string; detail: string | null; follow_up_suggestions: string[] }
  | { type: "failure"; what_happened: string; what_to_try: string };

export interface ChatOptions {
  sessionContext?: SessionContext;
  /** When true, skip route/plan and execute the provided plan (after user confirmed). */
  confirm?: boolean;
  /** Plan to execute when confirm is true. */
  plan?: PlanOutput;
}

export async function chat(
  registry: NlRegistry,
  llm: LlmClient,
  userMessage: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const sessionContext = options.sessionContext ?? {};

  if (options.confirm && options.plan) {
    const result = await runExecute(registry, options.plan, userMessage, sessionContext);
    const narrate = await runNarrate(llm, result, userMessage);
    if (narrate.status === "success") {
      return {
        type: "result",
        summary: narrate.summary,
        detail: narrate.detail ?? null,
        follow_up_suggestions: narrate.follow_up_suggestions ?? [],
      };
    }
    return {
      type: "failure",
      what_happened: narrate.what_happened,
      what_to_try: narrate.what_to_try,
    };
  }

  const routeResult = await runRoute(llm, registry, userMessage, sessionContext);

  if (routeResult.clarification_needed) {
    return { type: "clarification", message: routeResult.clarification_needed };
  }

  if (routeResult.workflow_type === "no_capability" || routeResult.no_capability_message) {
    return {
      type: "no_capability",
      message: routeResult.no_capability_message ?? "No plugged-in MCP can handle this request.",
      suggested_mcp: routeResult.suggested_mcp_to_plug ?? null,
    };
  }

  if (!routeResult.proceed_to_plan) {
    return {
      type: "clarification",
      message: routeResult.clarification_needed ?? "I need a bit more information to proceed.",
    };
  }

  const plan = await runPlan(llm, registry, routeResult, userMessage, sessionContext);

  if (plan.needs_confirmation && plan.confirmation_message) {
    return {
      type: "confirmation_required",
      message: plan.confirmation_message,
      plan,
    };
  }

  const result = await runExecute(registry, plan, userMessage, sessionContext);
  const narrate = await runNarrate(llm, result, routeResult.intent_understood);

  if (narrate.status === "success") {
    return {
      type: "result",
      summary: narrate.summary,
      detail: narrate.detail ?? null,
      follow_up_suggestions: narrate.follow_up_suggestions ?? [],
    };
  }

  return {
    type: "failure",
    what_happened: narrate.what_happened,
    what_to_try: narrate.what_to_try,
  };
}
