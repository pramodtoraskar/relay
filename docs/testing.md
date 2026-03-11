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
- `npm run test:e2e` — E2E script (CLI workflow; Jira/Git MCP disabled so no external deps)

## End-to-end testing

### 1. E2E script (no external services)

```bash
npm run build
npm run test:e2e
```

Uses `RELAY_DB_PATH=/tmp/relay-e2e.db`, disables Jira and Git MCP, and runs: checkin → start PROJ-99 → update → list → complete → checkin. If `OPENAI_API_KEY` is set, it also runs `relay chat "what is my current git status?"` to exercise the NL engine.

### 2. Manual CLI (classic workflow)

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

### 3. NL engine (relay chat)

**CLI:** Set `RELAY_DB_PATH`, `OPENAI_API_KEY`, then `npm run build` and `npx relay chat "show my open Jira issues"` or `npx relay chat "what branch am I on?"`.

**MCP (Cursor):** Add `RELAY_DB_PATH` and `OPENAI_API_KEY` to the relay block in `~/.cursor/mcp.json`. In chat, ask the model to use the **relay_chat** tool with a natural language message; Relay will route, plan, execute, and narrate.

### 4. Full stack (optional)

With Jira and Git MCP enabled, run the manual CLI flow above, then in Cursor: morning check-in, start task, end of day.

## MCP in Cursor

Add Relay to `~/.cursor/mcp.json` with `RELAY_DB_PATH=/tmp/relay-test.db`, restart Cursor, then in chat: “Run my morning check-in”, “Start task PROJ-99”, “End of day summary”.
