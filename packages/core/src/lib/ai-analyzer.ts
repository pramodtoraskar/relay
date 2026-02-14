/**
 * Rule-based AI analysis for orchestration tools.
 * Used to analyze review comments, task complexity, and conflict risk.
 * Future: can be extended to call an LLM API for deeper analysis.
 */

import type { ReviewCommentsAnalysis, RequiredChange } from "../types/orchestration-tools.js";

export interface AnalyzeReviewCommentsInput {
  notes?: Array<{ body?: string; author?: { username?: string }; system?: boolean; resolved?: boolean }>;
  discussions?: Array<{ notes?: Array<{ body?: string; author?: { username?: string }; resolved?: boolean }> }>;
}

/**
 * Analyze GitLab MR notes/discussions and extract required changes (rule-based).
 * Infers priority from language (must → high, should → medium, consider → low).
 */
export function analyzeReviewComments(input: AnalyzeReviewCommentsInput): ReviewCommentsAnalysis {
  const notes: Array<{ body: string; author?: string; resolved?: boolean }> = [];

  if (input.notes?.length) {
    for (const n of input.notes) {
      if (n.system) continue;
      const body = typeof n.body === "string" ? n.body : "";
      if (!body.trim()) continue;
      notes.push({
        body,
        author: (n.author as any)?.username,
        resolved: (n as any).resolved ?? false,
      });
    }
  }

  if (input.discussions?.length) {
    for (const d of input.discussions) {
      for (const n of d.notes ?? []) {
        const body = typeof n.body === "string" ? n.body : "";
        if (!body.trim()) continue;
        notes.push({
          body,
          author: (n.author as any)?.username,
          resolved: (n as any).resolved ?? false,
        });
      }
    }
  }

  const unresolved = notes.filter((n) => !n.resolved);
  const requiredChanges: RequiredChange[] = [];

  for (const n of unresolved) {
    const priority = inferPriority(n.body);
    const summary = summarizeComment(n.body);
    requiredChanges.push({
      summary,
      description: n.body.slice(0, 500),
      priority,
      estimatedMinutes: estimateMinutes(priority, n.body.length),
      reviewerUsername: n.author,
    });
  }

  return {
    changesRequested: unresolved.length > 0,
    requiredChanges,
    unresolvedThreads: unresolved.length,
    totalComments: notes.length,
  };
}

function inferPriority(text: string): "high" | "medium" | "low" {
  const t = text.toLowerCase();
  if (/\b(must|critical|blocker|required|need to)\b/.test(t)) return "high";
  if (/\b(should|please|recommend|better)\b/.test(t)) return "medium";
  return "low";
}

function summarizeComment(body: string, maxLen = 80): string {
  const firstLine = body.split(/\n/)[0]?.trim() ?? "";
  const cleaned = firstLine.replace(/^#+\s*/, "").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 3) + "...";
}

function estimateMinutes(priority: string, bodyLength: number): number {
  const base = priority === "high" ? 20 : priority === "medium" ? 15 : 10;
  const extra = Math.min(30, Math.floor(bodyLength / 50));
  return base + extra;
}
