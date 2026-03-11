/**
 * Planner — builds execution DAG (PRD §2.2). PLAN mode.
 */

import type { PlanOutput } from "./types.js";
import type { RouteOutput } from "./types.js";
import type { SessionContext } from "./types.js";
import { buildPrompt } from "./prompt.js";
import type { LlmClient } from "./llm-client.js";
import type { NlRegistry } from "./registry.js";

export async function runPlan(
  llm: LlmClient,
  registry: NlRegistry,
  routeResult: RouteOutput,
  userMessage: string,
  sessionContext: SessionContext
): Promise<PlanOutput> {
  const capabilityMap = registry.getCapabilityMapSummary();
  const pluggedIn = registry.getPluggedInSummary();
  const sessionStr = JSON.stringify(sessionContext, null, 2);
  const routeStr = JSON.stringify(routeResult, null, 2);

  const prompt = buildPrompt({
    active_mode: "plan",
    plugged_in_mcps: pluggedIn,
    capability_map: capabilityMap,
    session_context: sessionStr,
    user_message: userMessage,
    route_result: routeStr,
  });

  const output = await llm.completeJson<PlanOutput>(prompt);
  if (output.mode !== "plan") {
    throw new Error(`PLAN mode returned unexpected mode: ${(output as { mode?: string }).mode}`);
  }
  return output;
}
