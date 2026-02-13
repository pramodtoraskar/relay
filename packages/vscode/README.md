# Relay VS Code Extension

Relay integrates with VS Code via the **Relay CLI**. Install the CLI in your project or globally, then use the command palette:

- **Relay: Morning check-in** — runs `relay checkin`
- **Relay: Start task** — runs `relay start <issue>`
- **Relay: End of day** — runs `relay eod`

For full MCP integration (tools + resources inside the IDE), use **Cursor** with the Relay MCP server. This extension provides quick access to Relay CLI commands from the sidebar and status bar.

## Configuration

- `relay.mcpPath`: Path to `relay-mcp` or `npx @relay/core` (default: `relay-mcp`)

## Building

```bash
cd packages/vscode && npm run build
```

Then run from VS Code: Run and Debug > Launch Extension.
