/**
 * NARRATE mode — translate execution result to plain English (PRD §2.2).
 */

import type { ExecutionResult } from "./types.js";
import type { NarrateOutput } from "./types.js";
import { buildPrompt } from "./prompt.js";
import type { LlmClient } from "./llm-client.js";

export async function runNarrate(
  llm: LlmClient,
  executionResult: ExecutionResult,
  userIntent: string
): Promise<NarrateOutput> {
  const executionStr = JSON.stringify(executionResult, null, 2);
  const prompt = buildPrompt({
    active_mode: "narrate",
    plugged_in_mcps: "",
    capability_map: "",
    session_context: "{}",
    user_message: userIntent,
    execution_result: executionStr,
  });

  const output = await llm.completeJson<NarrateOutput>(prompt);
  if (output.mode !== "narrate") {
    throw new Error(`NARRATE mode returned unexpected mode: ${(output as { mode?: string }).mode}`);
  }
  return output;
}
