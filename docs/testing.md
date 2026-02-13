# Testing Relay

## Automated tests

From repo root:

```bash
npm install
npm test
```

Runs Jest and WorkflowManager tests using a temporary SQLite DB. Options:

- `npm run test:unit` — unit tests only
- `npx jest --config jest.config.js --coverage` — with coverage
- `npm run test:e2e` — E2E script (shared-DB, multi-developer handoff scenarios)

## Manual CLI test

Use a separate DB so you don’t touch `~/.relay/relay.db`:

```bash
export RELAY_DB_PATH=/tmp/relay-test.db
export RELAY_DEVELOPER_ID=test-dev
npx relay checkin
npx relay start PROJ-99
npx relay update "Implemented API"
npx relay complete --url "https://gitlab.com/example/merge_requests/1"
npx relay handoff   # interactive: To=other-dev, Title=Test handoff
export RELAY_DEVELOPER_ID=other-dev && npx relay checkin   # see pending handoff
```

## MCP in Cursor

Add Relay to `~/.cursor/mcp.json` with `RELAY_DB_PATH=/tmp/relay-test.db`, restart Cursor, then in chat: “Run my morning check-in”, “Start task PROJ-99”, “End of day summary”.
