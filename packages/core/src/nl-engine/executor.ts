/**
 * Executor — runs the plan DAG (PRD §2.2).
 */

import type { PlanOutput } from "./types.js";
import type { SessionContext } from "./types.js";
import type { ExecutionResult } from "./types.js";
import type { StepResult } from "./types.js";
import type { NlRegistry } from "./registry.js";

/** Resolve step inputs from user message, session context, and prior step outputs. */
function resolveInputs(
  inputSources: Record<string, string> | undefined,
  userMessage: string,
  sessionContext: SessionContext,
  stepOutputs: Record<number, unknown>
): Record<string, unknown> {
  if (!inputSources || Object.keys(inputSources).length === 0) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [field, source] of Object.entries(inputSources)) {
    if (source === "user_message") {
      out[field] = userMessage;
    } else if (source === "session_context") {
      out[field] = sessionContext.inferred_state ?? sessionContext;
    } else {
      const match = source.match(/step_(\d+)_output/);
      if (match) {
        const stepNum = parseInt(match[1], 10);
        out[field] = stepOutputs[stepNum];
      } else {
        out[field] = stepOutputs[parseInt(source.replace(/\D/g, ""), 10)];
      }
    }
  }
  return out;
}

/** Topological order of steps (by depends_on). */
function executionOrder(steps: PlanOutput["steps"]): number[] {
  const order: number[] = [];
  const done = new Set<number>();
  const stepMap = new Map(steps.map((s) => [s.step, s]));

  function visit(stepNum: number): void {
    if (done.has(stepNum)) return;
    const step = stepMap.get(stepNum);
    if (step?.depends_on?.length) {
      for (const dep of step.depends_on) {
        visit(dep);
      }
    }
    done.add(stepNum);
    order.push(stepNum);
  }

  for (const s of steps) {
    visit(s.step);
  }
  return order;
}

export async function runExecute(
  registry: NlRegistry,
  plan: PlanOutput,
  userMessage: string,
  sessionContext: SessionContext
): Promise<ExecutionResult> {
  const stepOutputs: Record<number, unknown> = {};
  const results: StepResult[] = [];
  const order = executionOrder(plan.steps);
  const stepByNum = new Map(plan.steps.map((s) => [s.step, s]));

  for (const stepNum of order) {
    const step = stepByNum.get(stepNum);
    if (!step) continue;

    const adapter = registry.getAdapter(step.mcp);
    if (!adapter) {
      return {
        success: false,
        steps: results,
        failed_step: stepNum,
        error_message: `MCP "${step.mcp}" is not connected.`,
      };
    }

    const inputs = resolveInputs(
      step.input_sources,
      userMessage,
      sessionContext,
      stepOutputs
    );
    const mergedInputs = { ...step.inputs, ...inputs };

    try {
      const output = await adapter.callTool(step.tool, mergedInputs);
      const content =
        typeof output === "object" && output !== null && "content" in output
          ? (output as { content?: string }).content
          : String(output);
      // Store extracted text so subsequent steps receive a usable string value
      // (not a raw ToolResult object) when referenced via input_sources.
      stepOutputs[stepNum] = content ?? output;
      const isError =
        typeof output === "object" && output !== null && "isError" in output
          ? (output as { isError?: boolean }).isError
          : false;

      results.push({
        step: stepNum,
        mcp: step.mcp,
        tool: step.tool,
        output: content ?? output,
        isError,
      });

      if (isError) {
        return {
          success: false,
          steps: results,
          failed_step: stepNum,
          error_message: String(content ?? "Tool returned error."),
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        step: stepNum,
        mcp: step.mcp,
        tool: step.tool,
        output: message,
        isError: true,
      });
      return {
        success: false,
        steps: results,
        failed_step: stepNum,
        error_message: message,
      };
    }
  }

  return { success: true, steps: results };
}
