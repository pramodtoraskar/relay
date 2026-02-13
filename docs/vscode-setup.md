# Relay + VS Code setup

Use Relay from VS Code via the **Relay extension** (commands + sidebar) or the **CLI** in the integrated terminal.

## Option A: Relay extension

1. **Build the extension** (from repo):
   ```bash
   cd packages/vscode && npm install && npm run build
   ```

2. **Install in VS Code**:
   - Open VS Code → Extensions → “Install from VSIX” (if you have a built `.vsix`), or
   - Run the extension in development: open `packages/vscode` in VS Code, press F5 (Run Extension).

3. **Use**:
   - Command Palette (`Ctrl/Cmd+Shift+P`) → “Relay: Morning check-in”, “Relay: Start task”, etc.
   - These run the Relay CLI in a terminal. Ensure `relay` or `npx relay` is available in your PATH.

4. **Config** (optional): `relay.mcpPath` — path to `relay-mcp` (default `relay-mcp`). The extension primarily drives the CLI; full MCP tool integration is available in Cursor.

## Option B: CLI only

1. **Install Relay** (from repo root):
   ```bash
   npm install && npm run build
   ```

2. **Open terminal in VS Code** and run:
   ```bash
   npx relay checkin
   npx relay start PROJ-42
   npx relay eod
   ```

3. **Optional**: Link the CLI globally from the monorepo:
   ```bash
   cd packages/cli && npm link
   ```
   Then you can run `relay checkin` from any directory.

## Jira and identity

Set in your shell profile or VS Code terminal env:

- `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, `RELAY_JIRA_API_TOKEN` (Jira Personal Access Token)
- `RELAY_DEVELOPER_ID` (for handoffs; use a random ID or handle)

Database: `~/.relay/relay.db` (or `RELAY_DB_PATH`).

## Next

- [Getting started](getting-started.md)
- [User guide](user-guide.md)
