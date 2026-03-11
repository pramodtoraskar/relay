/**
 * Registry — source of truth for plugged-in MCPs and the capability map (PRD §2.2).
 */

import type { RawTool } from "./types.js";
import type { CapabilityMapEntry } from "./types.js";

export interface IMcpAdapter {
  /** List all tools with name, description, optional inputSchema. */
  listTools(): Promise<RawTool[]>;
  /** Invoke a tool by name with given arguments. Returns result (e.g. { content, isError }). */
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export class NlRegistry {
  private adapters = new Map<string, IMcpAdapter>();
  /** Per-MCP enriched capability entries (from Learner). */
  private capabilityEntries = new Map<string, CapabilityMapEntry[]>();

  register(name: string, adapter: IMcpAdapter): void {
    this.adapters.set(name, adapter);
  }

  unregister(name: string): void {
    this.adapters.delete(name);
    this.capabilityEntries.delete(name);
  }

  /** Store enriched tools for an MCP (called by Learner after LEARN). */
  setCapabilityEntries(mcpName: string, entries: CapabilityMapEntry[]): void {
    this.capabilityEntries.set(mcpName, entries);
  }

  getAdapter(mcpName: string): IMcpAdapter | undefined {
    return this.adapters.get(mcpName);
  }

  getMcpNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /** Flatten capability map for prompt injection. */
  getCapabilityMap(): CapabilityMapEntry[] {
    const out: CapabilityMapEntry[] = [];
    for (const entries of this.capabilityEntries.values()) {
      out.push(...entries);
    }
    return out;
  }

  /** Serialize capability map for LLM prompt (plain text summary). */
  getCapabilityMapSummary(): string {
    const entries = this.getCapabilityMap();
    if (entries.length === 0) return "(No tools indexed yet. Plug in MCPs and run LEARN.)";
    return entries
      .map(
        (e) =>
          `- ${e.mcp}:${e.tool} | intent: ${e.human_intent} | verbs: ${e.action_verbs.join(", ")} | risk: ${e.risk_level}`
      )
      .join("\n");
  }

  /** Serialize plugged-in MCPs for prompt (names + tool counts). */
  getPluggedInSummary(): string {
    const names = this.getMcpNames();
    if (names.length === 0) return "(No MCPs plugged in.)";
    const lines = names.map((name) => {
      const entries = this.capabilityEntries.get(name) ?? [];
      return `- ${name}: ${entries.length} tools`;
    });
    return lines.join("\n");
  }
}
