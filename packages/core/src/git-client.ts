import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Lightweight Git integration: read-only operations (branch, recent commits).
 * Runs in repo root inferred from cwd or RELAY_REPO_ROOT.
 */
export class GitClient {
  private repoRoot: string;

  constructor(repoRoot?: string) {
    this.repoRoot =
      repoRoot ?? process.env["RELAY_REPO_ROOT"] ?? process.cwd();
  }

  private run(args: string[], options?: { timeout?: number }): string {
    try {
      return execFileSync("git", args, {
        cwd: this.repoRoot,
        encoding: "utf-8",
        timeout: options?.timeout ?? 5000,
      }).trim();
    } catch {
      return "";
    }
  }

  isRepository(): boolean {
    const p = join(this.repoRoot, ".git");
    return existsSync(p);
  }

  getCurrentBranch(): string {
    return this.run(["rev-parse", "--abbrev-ref", "HEAD"]) || "";
  }

  getRecentCommits(count = 10): Array<{ sha: string; message: string }> {
    const out = this.run([
      "log",
      `-${count}`,
      "--format=%H %s",
      "--no-decorate",
    ].filter(Boolean));
    if (!out) return [];
    return out.split("\n").map((line) => {
      const i = line.indexOf(" ");
      return {
        sha: i > 0 ? line.slice(0, i) : line,
        message: i > 0 ? line.slice(i + 1) : "",
      };
    });
  }

  /** Suggest branch name from issue key: feature/PROJ-42-short-slug */
  suggestBranchName(issueKey: string, slug?: string): string {
    const safe = (slug ?? issueKey).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 30);
    return `feature/${issueKey}-${safe}`.toLowerCase();
  }
}
