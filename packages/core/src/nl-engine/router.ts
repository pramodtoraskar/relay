/**
 * Router — intent engine (PRD §2.2). ROUTE mode.
 */

import type { RouteOutput } from "./types.js";
import type { SessionContext } from "./types.js";
import { buildPrompt } from "./prompt.js";
import type { LlmClient } from "./llm-client.js";
import type { NlRegistry } from "./registry.js";

export async function runRoute(
  llm: LlmClient,
  registry: NlRegistry,
  userMessage: string,
  sessionContext: SessionContext
): Promise<RouteOutput> {
  const capabilityMap = registry.getCapabilityMapSummary();
  const pluggedIn = registry.getPluggedInSummary();
  const sessionStr = JSON.stringify(sessionContext, null, 2);

  const prompt = buildPrompt({
    active_mode: "route",
    plugged_in_mcps: pluggedIn,
    capability_map: capabilityMap,
    session_context: sessionStr,
    user_message: userMessage,
  });

  const output = await llm.completeJson<RouteOutput>(prompt);
  if (output.mode !== "route") {
    throw new Error(`ROUTE mode returned unexpected mode: ${(output as { mode?: string }).mode}`);
  }
  return output;
}
