#!/usr/bin/env node
/**
 * One-command setup: ensure ~/.relay exists, copy example env, run migrations.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const RELAY_HOME = process.env.RELAY_HOME || path.join(os.homedir(), ".relay");

function askToContinue() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Run Relay setup now? (creates ~/.relay, env.example) [Y/n] ", (answer) => {
      rl.close();
      const normalized = (answer || "y").trim().toLowerCase();
      resolve(normalized === "" || normalized === "y" || normalized === "yes");
    });
  });
}

function runSetup() {
  if (!fs.existsSync(RELAY_HOME)) {
    fs.mkdirSync(RELAY_HOME, { recursive: true });
    console.log("Created", RELAY_HOME);
  }

  const envExample = path.join(RELAY_HOME, "env.example");
  const randomId = require("crypto").randomBytes(8).toString("hex");
  const envContent = `# Relay configuration (copy to .env or export)
# RELAY_DB_PATH=${path.join(RELAY_HOME, "relay.db")}
# Disable Jira MCP if you get 404 for @red-hat/jira-mcp or don't use Jira (check-in still works, no assigned issues):
# RELAY_JIRA_MCP_DISABLED=1
# Disable Git MCP if you get 404 for @modelcontextprotocol/server-git (check-in still works, no branch/commits):
# RELAY_GIT_MCP_DISABLED=1
# Jira (optional) — RELAY_JIRA_API_TOKEN = Jira Personal Access Token
# RELAY_JIRA_BASE_URL=https://your-domain.atlassian.net
# RELAY_JIRA_EMAIL=you@example.com
# RELAY_JIRA_API_TOKEN=your-jira-personal-access-token
# Developer identity (for handoffs); use a random ID or your handle
# RELAY_DEVELOPER_ID=${randomId}
`;
  if (!fs.existsSync(envExample)) {
    fs.writeFileSync(envExample, envContent, "utf8");
    console.log("Created", envExample);
  }

  console.log("Relay setup complete. Next:");
  console.log("  1. Configure (optional): set RELAY_JIRA_BASE_URL, RELAY_JIRA_EMAIL, RELAY_JIRA_API_TOKEN (Jira PAT), RELAY_DEVELOPER_ID — or copy", envExample);
  console.log("     If you don't use Jira or get 404 for @red-hat/jira-mcp: set RELAY_JIRA_MCP_DISABLED=1.");
  console.log("     If you get 404 for @modelcontextprotocol/server-git: set RELAY_GIT_MCP_DISABLED=1 (in .env or export).");
  console.log("  2. From this repo:  npm run build   then run check-in with either:");
  console.log("        npx relay checkin    (use npx, not npm)");
  console.log("        npm run checkin");
  console.log("     Or install globally:  npm install -g @relay/cli   then run  relay checkin  from anywhere");
}

async function main() {
  const ok = await askToContinue();
  if (!ok) {
    console.log("Setup cancelled.");
    process.exit(0);
  }
  runSetup();
}

main();
