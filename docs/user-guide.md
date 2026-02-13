# Relay user guide

Daily workflows with Relay: check-in, tasks, progress, handoffs, and end of day.

## Morning check-in

**Goal**: See what’s on your plate before you start coding.

1. Run **`relay checkin`** (or ask the AI in Cursor to run morning check-in).
2. You’ll see:
   - **Pending handoffs** — work passed to you (by others or by you from yesterday); address these first if needed.
   - **Assigned Jira issues** — your backlog (if Jira is configured).
   - **Git** — current branch and recent commits.
   - **Active session** — if you have an open work session, continue or hand it off.

Use this to decide: finish a handoff, continue an active task, or start a new one.

## Starting a task

1. Run **`relay start PROJ-42`** (replace with your issue key).
2. Relay creates a work session, fetches the Jira summary (if configured), suggests a branch name, and adds micro-tasks (default or `--tasks "A,B,C"`).
3. Optionally create a branch: `git checkout -b <suggested_branch>`.
4. Work on the micro-tasks; use **`relay update "message"`** to log progress or **`relay update ... --complete_micro_task_id <id>`** when the tool supports it (or mark in UI).

## Updating progress

- **`relay update "Implemented login API"`** — attaches a note to the active session.
- **`relay update "Tests done" --minutes 45`** — logs time.
- **`relay update "Commit" --commit abc1234`** — links a commit to the session.

Progress is stored locally; no Jira update until you complete the task.

## Completing a task

1. Ensure the work is merged or ready (e.g. MR/PR open).
2. Run **`relay complete`** (uses active session) or **`relay complete <session_id>`**.
3. Optionally add **`--url <MR_URL>`** and **`--minutes <n>`**.
4. Relay marks the session done and, if Jira is configured, transitions the issue to Done.

## Creating a handoff

When you need to pass work to someone else—or to **yourself** (e.g. end of day so you can pick up tomorrow):

1. Run **`relay handoff`** (interactive) or **`relay handoff --to <dev_id> --title "Auth work"`**.
2. Fill in (or pass):
   - **To** — recipient’s `RELAY_DEVELOPER_ID` (e.g. Slack handle). **Solo developer:** use your *own* `RELAY_DEVELOPER_ID` so the handoff shows up at your next **`relay checkin`**.
   - **Title** — short label.
   - **What’s done** / **What’s next** — context.
   - **Branch** — current branch (defaults to Git).
3. Relay creates the handoff and marks your current session as “handed off”. The recipient (or you, next morning) sees it on the next **`relay checkin`**.

## End of day

1. Run **`relay eod`** (or “Relay end of day” in Cursor).
2. You’ll get a summary and a reminder to create handoffs for any active session.
3. If you have an active task, run **`relay handoff`** so the next person (or you tomorrow) has context. **Solo:** hand off to your own `RELAY_DEVELOPER_ID`.

## Tips

- **One active session** — Relay assumes one active session per developer; starting a new task doesn’t auto-close the previous one. Complete or hand off before starting another.
- **Developer ID** — Set `RELAY_DEVELOPER_ID` to a stable value (e.g. random ID or handle). Handoffs are matched by this id: use the *same* id as recipient when handing off to yourself so pending handoffs appear at check-in.
- **Offline** — Relay works offline; Jira updates and issue fetch happen when the network and config are available.
