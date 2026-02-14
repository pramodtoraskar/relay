import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { RelayOrchestrator } from "../../orchestrator.js";
import { dependencyVulnerabilityScanner } from "../../flows/orchestration-flows.js";

export function dependencyVulnerabilityScannerTool(): Tool {
  return {
    name: "dependency_vulnerability_scanner",
    description: "Scan package.json/requirements.txt for vulnerabilities. Create Jira security issues for findings.",
    inputSchema: { type: "object", properties: {} },
  };
}

export async function runDependencyVulnerabilityScanner(orc: RelayOrchestrator): Promise<string> {
  const r = await dependencyVulnerabilityScanner(orc);
  return r.summary + "\n\nNext: " + r.next_steps.join("; ");
}
