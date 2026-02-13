# @relay/core

Relay core: MCP server, database, Jira and Git clients, and workflow manager.

## As MCP server

Run via stdio for Cursor, Claude Desktop, or any MCP host:

```bash
node packages/core/dist/run-mcp.js
# or
npx @relay/core
```

Configure your IDE’s MCP settings to point to this command and set env vars (`RELAY_JIRA_*`, `RELAY_DEVELOPER_ID`, etc.).

## As library

```ts
import { DatabaseManager, JiraClient, GitClient, WorkflowManager } from "@relay/core";

const db = new DatabaseManager();
const jira = new JiraClient();
jira.configure();
const wm = new WorkflowManager(db, jira, new GitClient());

const result = await wm.morningCheckin("dev1");
```

## Build

```bash
npm run build
```

Builds all `src/**/*.ts` to `dist/` (CJS + sourcemaps + dts).
