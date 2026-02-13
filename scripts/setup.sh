#!/bin/bash

echo "🏃 Setting up Relay..."

# 1. Create database and apply schema
mkdir -p .relay
RELAY_DB="${RELAY_DB_PATH:-.relay/work-tracker.db}"
if [ -f "packages/core/database/schema.sql" ]; then
  sqlite3 "$RELAY_DB" < packages/core/database/schema.sql
  echo "✅ Database initialized at $RELAY_DB"
else
  echo "⚠️  packages/core/database/schema.sql not found; run from repo root or set RELAY_DB_PATH"
fi

# 2. Copy MCP config for Cursor and/or VS Code
if [ -f "configs/cursor/mcp.json" ]; then
  mkdir -p .cursor
  cp configs/cursor/mcp.json .cursor/mcp.json
  echo "✅ Updated .cursor/mcp.json"
fi
if [ -d ".vscode" ] && [ -f "configs/vscode/settings.json" ]; then
  cp configs/vscode/settings.json .vscode/settings.json
  echo "✅ Updated .vscode/settings.json"
fi

# 3. Environment variables
echo ""
echo "🔑 Set these environment variables for Jira (optional):"
echo "  export JIRA_URL='https://your-company.atlassian.net'"
echo "  export JIRA_TOKEN='your_token'"
echo "  export JIRA_EMAIL='your_email@company.com'"
echo ""
echo "  Or for Relay direct Jira integration (CLI):"
echo "  export RELAY_JIRA_BASE_URL='https://your-company.atlassian.net'"
echo "  export RELAY_JIRA_EMAIL='your_email@company.com'"
echo "  export RELAY_JIRA_API_TOKEN='your_api_token'"
echo ""
echo "  For Relay DB (optional, default: .relay/work-tracker.db or ~/.relay/relay.db):"
echo "  export RELAY_DB_PATH='$(pwd)/.relay/work-tracker.db'"

echo ""
echo "✨ Setup complete!"
echo "Run: npx relay checkin   (or: relay checkin if linked)"
echo "Run: npx relay start PROJ-42"
