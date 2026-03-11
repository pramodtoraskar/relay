/**
 * Learner — capability intelligence on plug (PRD §2.2). LEARN mode.
 */

import type { RawTool } from "./types.js";
import type { LearnOutput } from "./types.js";
import type { CapabilityMapEntry } from "./types.js";
import { buildPrompt } from "./prompt.js";
import type { LlmClient } from "./llm-client.js";

export async function runLearn(
  llm: LlmClient,
  mcpName: string,
  rawTools: RawTool[]
): Promise<LearnOutput> {
  const rawToolsStr = JSON.stringify(rawTools, null, 2);
  const prompt = buildPrompt({
    active_mode: "learn",
    plugged_in_mcps: `(learning for: ${mcpName})`,
    capability_map: "(building)",
    session_context: "{}",
    user_message: "",
    raw_tools: rawToolsStr,
  });

  const output = await llm.completeJson<LearnOutput>(prompt);
  if (output.mode !== "learn") {
    throw new Error(`LEARN mode returned unexpected mode: ${(output as { mode?: string }).mode}`);
  }
  output.mcp_name = output.mcp_name || mcpName;
  return output;
}

/** Convert LearnOutput enriched_tools to CapabilityMapEntry[] for the registry. */
export function learnOutputToCapabilityEntries(
  mcpName: string,
  learnOutput: LearnOutput
): CapabilityMapEntry[] {
  return learnOutput.enriched_tools.map((t) => ({
    mcp: mcpName,
    tool_id: t.tool_id,
    tool: t.tool_id.includes(":") ? t.tool_id.split(":")[1]! : t.tool_id,
    human_intent: t.human_intent,
    action_verbs: t.action_verbs,
    risk_level: t.risk_level,
  }));
}
