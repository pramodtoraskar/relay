# Solo developer setup

Minimal Relay setup for an individual developer.

1. **Install** (from repo root):
   ```bash
   npm install && npm run build && npm run setup
   ```

2. **Configure** (optional — for Jira). Use only these four variables; `RELAY_JIRA_API_TOKEN` is your **Jira Personal Access Token**.
   ```bash
   export RELAY_JIRA_BASE_URL=https://your-domain.atlassian.net
   export RELAY_JIRA_EMAIL=you@example.com
   export RELAY_JIRA_API_TOKEN=your-jira-personal-access-token
   export RELAY_DEVELOPER_ID=your-id   # random ID or handle; run: node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
   ```

3. **Use**:
   - `npx relay checkin` — morning summary (includes pending handoffs from you to yourself)
   - `npx relay start PROJ-42` — start a task
   - `npx relay update "Fixed login"` — log progress
   - `npx relay complete --url https://gitlab.com/.../merge_requests/1` — complete
   - `npx relay eod` — end of day
   - `npx relay handoff --to $RELAY_DEVELOPER_ID --title "PROJ-99 next steps"` — hand off to *yourself* (use your own id so it shows at next checkin)

4. **Cursor**: Add to `.cursor/mcp.json` (see docs/getting-started.md).

Database: `~/.relay/relay.db` (or `RELAY_DB_PATH`).
