# Step-by-step: How to test Relay

## Prerequisites

- **Node.js 18, 20, or 24** (LTS). `better-sqlite3` v12+ provides prebuilt binaries; if a source build is needed (e.g. custom Node), use Node 18 or 20, or set `CXXFLAGS=-std=c++20` for Node 24.
- Git (optional, for CLI Git features).

---

## Part 1: Run the automated test suite

### Step 1.1 — Clone and install

```bash
cd /path/to/relay
npm install
```

If `npm install` fails on `better-sqlite3` (e.g. “C++20 or later required” on Node 24), either switch to Node 20 (e.g. `nvm use 20`) or install with C++20: `CXXFLAGS=-std=c++20 npm install`.

### Step 1.2 — Run unit tests

From the repo root:

```bash
npm test
```

This runs Jest and the `WorkflowManager` tests (morning check-in, start task, active session, handoff) using a temporary SQLite DB.

To run only unit tests:

```bash
npm run test:unit
```

To run with coverage:

```bash
npx jest --config jest.config.js --coverage
```

---

## Part 2: Manual testing (CLI)

Use a **separate test database** so you don’t touch your real `~/.relay/relay.db`.

### Step 2.1 — Build

```bash
npm run build
```

### Step 2.2 — Set a test database and developer ID

In the same terminal:

```bash
export RELAY_DB_PATH=/tmp/relay-test.db
export RELAY_DEVELOPER_ID=test-dev
```

(Optional) For Jira tests, also set:

```bash
export RELAY_JIRA_BASE_URL=https://your-domain.atlassian.net
export RELAY_JIRA_EMAIL=you@example.com
export RELAY_JIRA_API_TOKEN=your-jira-pat
```

### Step 2.3 — Morning check-in

```bash
npx relay checkin
```

You should see:

- Pending handoffs (empty at first)
- Assigned Jira issues (if configured) or “None”
- Git branch and recent commits (if run inside a Git repo)
- Active session: none

### Step 2.4 — Start a task

```bash
npx relay start PROJ-99
```

Expected:

- A new session ID
- Suggested branch name (e.g. `feature/proj-99-...`)
- At least one micro-task

### Step 2.5 — Update progress

```bash
npx relay update "Implemented API"
```

Expected: “Progress updated.”

Optional: log time and commit:

```bash
npx relay update "Tests written" --minutes 30 --commit abc1234
```

### Step 2.6 — Complete the task

```bash
npx relay complete --url "https://gitlab.com/example/merge_requests/1"
```

Expected: “Session … completed.” If Jira is configured, the issue should move to Done.

### Step 2.7 — Handoff (interactive)

```bash
npx relay handoff
```

When prompted, enter:

- To: `other-dev`
- Title: `Test handoff`
- What’s done / What’s next: any text
- Branch: accept default or type one

Expected: “Handoff created: …”

### Step 2.8 — Check-in as recipient

Simulate the other developer:

```bash
export RELAY_DEVELOPER_ID=other-dev
npx relay checkin
```

You should see the pending handoff “Test handoff” (from `test-dev`).

### Step 2.9 — End of day

```bash
export RELAY_DEVELOPER_ID=test-dev
npx relay eod
```

You should see the EOD summary and any reminder about handoffs.

### Step 2.10 — Clean up test DB (optional)

```bash
rm -f /tmp/relay-test.db
```

---

## Part 3: Test MCP server (Cursor)

### Step 3.1 — Ensure Relay is built

```bash
npm run build
```

### Step 3.2 — Add MCP config

In `~/.cursor/mcp.json` (or your project’s config), add:

```json
{
  "mcpServers": {
    "relay": {
      "command": "node",
      "args": ["/absolute/path/to/relay/packages/core/dist/run-mcp.js"],
      "env": {
        "RELAY_DB_PATH": "/tmp/relay-test.db",
        "RELAY_DEVELOPER_ID": "test-dev",
        "RELAY_JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "RELAY_JIRA_EMAIL": "you@example.com",
        "RELAY_JIRA_API_TOKEN": "your-jira-pat"
      }
    }
  }
}
```

Replace `/absolute/path/to/relay` with your repo path.

### Step 3.3 — Restart Cursor

Quit and reopen Cursor so it loads the Relay MCP server.

### Step 3.4 — Call tools from chat

In Cursor chat, try:

- “Run my morning check-in.”
- “Start task PROJ-99.”
- “What’s my end-of-day summary?”

You should see responses that match the CLI behavior (same DB if you use the same `RELAY_DB_PATH`).

---

## Quick reference

| Goal              | Command / step                                      |
|-------------------|------------------------------------------------------|
| Run all tests     | `npm test`                                          |
| Run unit tests    | `npm run test:unit`                                 |
| Manual CLI test   | `RELAY_DB_PATH=/tmp/relay-test.db npx relay checkin` |
| Test handoff      | Create handoff as dev A, then `RELAY_DEVELOPER_ID=dev-b npx relay checkin` |
| Test MCP in Cursor| Add relay to `mcp.json`, restart Cursor, ask in chat |
