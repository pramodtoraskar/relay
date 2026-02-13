#!/usr/bin/env node
/**
 * One-command setup: ensure ~/.relay exists, copy example env, run migrations.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const RELAY_HOME = process.env.RELAY_HOME || path.join(os.homedir(), ".relay");

function main() {
  if (!fs.existsSync(RELAY_HOME)) {
    fs.mkdirSync(RELAY_HOME, { recursive: true });
    console.log("Created", RELAY_HOME);
  }

  const envExample = path.join(RELAY_HOME, "env.example");
  const randomId = require("crypto").randomBytes(8).toString("hex");
  const envContent = `# Relay configuration (copy to .env or export)
# RELAY_DB_PATH=${path.join(RELAY_HOME, "relay.db")}
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
  console.log("  2. Install CLI: npm install -g @relay/cli  (or use npx)");
  console.log("  3. Run: relay checkin");
}

main();
