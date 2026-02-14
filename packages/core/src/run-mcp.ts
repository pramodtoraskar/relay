#!/usr/bin/env node
import { runMcpServer } from "./server.js";

// Prevent unhandled rejections from closing the MCP connection (e.g. subprocess failures)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
});

runMcpServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
