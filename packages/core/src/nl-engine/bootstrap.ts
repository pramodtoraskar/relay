/**
 * Bootstrap NL engine: create registry from McpClientsManager and optionally run LEARN.
 */

import type { McpClientsManager } from "../mcp-clients.js";
import { NlRegistry } from "./registry.js";
import type { LlmClient } from "./llm-client.js";
import { createJiraAdapter, createGitAdapter, createSqliteAdapter } from "./adapters.js";
import { runLearn, learnOutputToCapabilityEntries } from "./learner.js";

const BUILTIN_MCPS = ["jira", "git", "sqlite"] as const;

export function createRegistryFromMcp(mcp: McpClientsManager): NlRegistry {
  const registry = new NlRegistry();
  registry.register("jira", createJiraAdapter(mcp));
  registry.register("git", createGitAdapter(mcp));
  registry.register("sqlite", createSqliteAdapter(mcp));
  return registry;
}

/**
 * Run LEARN for each registered MCP and populate the capability map. Skips if LLM not configured.
 */
export async function populateCapabilityMap(
  registry: NlRegistry,
  llm: LlmClient
): Promise<{ announcements: string[] }> {
  if (!llm.isConfigured()) {
    return { announcements: [] };
  }
  const announcements: string[] = [];
  for (const mcpName of BUILTIN_MCPS) {
    const adapter = registry.getAdapter(mcpName);
    if (!adapter) continue;
    try {
      const rawTools = await adapter.listTools();
      if (rawTools.length === 0) continue;
      const learnOutput = await runLearn(llm, mcpName, rawTools);
      const entries = learnOutputToCapabilityEntries(mcpName, learnOutput);
      registry.setCapabilityEntries(mcpName, entries);
      if (learnOutput.announcement) {
        announcements.push(learnOutput.announcement);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      announcements.push(`${mcpName}: could not learn (${msg}).`);
    }
  }
  return { announcements };
}
