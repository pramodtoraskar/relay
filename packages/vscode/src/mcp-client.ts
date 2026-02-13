/**
 * MCP client for VS Code — connect to relay-mcp via stdio or spawn.
 * Post-MVP: implement full MCP client to call tools from the extension.
 */
export async function callRelayTool(_toolName: string, _args: Record<string, unknown>): Promise<string> {
  return "Use Relay CLI (relay checkin, relay start PROJ-42) or configure Cursor MCP for full integration.";
}
