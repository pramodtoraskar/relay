# MVP: Top 5 Relay Orchestration Tools

Recommendation for the **first 3–5 tools** to prioritize, based on existing Relay code, MCP coverage (Jira + GitLab + SQLite), and impact vs effort.

---

## Recommended MVP (in order)

### 1. **Smart Handoff** — *Complete the flow*

**Why first:** You already have ~80% of it. `handoff_task` adds MR comment and creates the handoff; `create_subtask_from_mr_review` creates Jira sub-tasks from MR notes. What’s missing is **one orchestrated flow** that:

1. Resolve MR for the current task (e.g. GitLab `list_merge_requests` by branch or issue key in title).
2. Optionally call `create_subtask_from_mr_review` if there are review comments.
3. Call `createHandoff` with `merge_request_url` and `jira_issue_key` (from active session).

**Value:** Full context transfer with zero manual steps.  
**Effort:** Low–Medium (one new tool that chains existing APIs; MR discovery may need GitLab MCP args for project/filter).

**Existing code:** `create-handoff.ts`, `create-subtask-from-mr-review.ts`, `workflow-manager.ts` (`createHandoff`, `addMrCommentToJira`, `createSubtaskFromMrReview`).

---

### 2. **Review Readiness Check**

**Flow:** User says “Ready for review on PROJ-42” → Relay:

1. **GitLab:** MR for branch/issue — state (open/mergeable), pipeline status, conflicts.
2. **Jira:** Issue PROJ-42 — sub-tasks all done? (via Jira MCP get issue/subtasks).
3. **SQLite:** Active session for dev — complete or hand off before “ready for review”?

If all pass → “Ready. Consider requesting reviewers.” and optionally add Jira comment. If not → return a short list of blockers (e.g. “Pipeline failing”, “2 sub-tasks incomplete”, “Active session not closed”).

**Value:** Stops premature “ready for review” and keeps Jira/GitLab in sync.  
**Effort:** Low (all data available via existing MCPs; one new tool + small WorkflowManager helper).

---

### 3. **Context Resurrection**

**Flow:** Dev returns after 3+ days → Relay:

1. **SQLite:** Last work session (by `developer_id`, `ended_at` / `started_at`).
2. **Jira:** Updates on that issue since last session (e.g. comments, status change) — Jira MCP get issue or search.
3. **GitLab:** Branch still exists? Any MRs? Conflicts? (Git/GitLab MCP status + list MRs).

Summarize: “You left off at X (issue, branch). Since then: Jira Y, GitLab Z. Conflicts / MR link: …”

**Value:** Instant context recovery; no digging through Jira/GitLab.  
**Effort:** Low. You have `getActiveSession`, `getTaskStatus`, `morningCheckin`; need “last ended session” query in `McpDbAdapter` and one new tool that composes Jira + GitLab + that session.

---

### 4. **Blockers Resolver**

**Flow:** Dev marks task blocked (e.g. “Waiting for API key”) → Relay:

1. **Jira:** Transition issue to “Blocked” (or add label) and add comment with blocker reason.
2. **Jira:** Create a small “Unblock: PROJ-42 – API key” task and assign to whoever can fix (e.g. ops, tech lead) — or assign to a default “unblock” assignee.
3. **SQLite:** Log blocker on the work session (e.g. new progress log type or reuse `progress_logs.note`).

**Value:** Clear ownership of unblocking and visibility in Jira.  
**Effort:** Low. Jira MCP: transition + create_issue + (if available) assign. One new tool + optional DB log.

---

### 5. **Pre-Deploy Checklist**

**Flow:** Before deploy → Relay:

1. **Jira:** Stories in scope (e.g. sprint or filter) — all “Done”?
2. **GitLab:** MRs for release branch merged? Pipeline green?
3. **SQLite:** No active work sessions for those issues (or warn).

If any check fails → list blockers. If all pass → “Pre-deploy checks passed.”

**Value:** Avoids deploying with open work or failing pipelines.  
**Effort:** Low. Read-only checks across three MCPs; one new tool.

---

## Why these 5?

| Tool                    | Builds on existing?        | Value              | Effort  |
|-------------------------|----------------------------|--------------------|---------|
| Smart Handoff           | Yes (handoff + MR + subtask) | Very high          | Low–Med |
| Review Readiness Check  | Yes (checkin, Jira, Git)   | High               | Low     |
| Context Resurrection    | Yes (sessions, Jira, Git)  | High               | Low     |
| Blockers Resolver       | Yes (Jira, sessions)       | High               | Low     |
| Pre-Deploy Checklist    | Yes (Jira, GitLab, SQLite) | Medium (safety)    | Low     |

Together they cover: **handoffs**, **reviews**, **return-to-work**, **blockers**, and **deploy safety** with minimal new surface area.

---

## What to build first (suggested order)

1. **Smart Handoff** — One “smart handoff” tool that finds MR → (optional) subtasks from review → Jira comment → handoff. Ship as the flagship orchestration.
2. **Review Readiness Check** — Single tool: “ready for review PROJ-42” → gates + blocker list.
3. **Context Resurrection** — “Resurrect my context” using last session + Jira + GitLab.
4. **Blockers Resolver** — “Mark PROJ-42 blocked: waiting for API key” → Jira + optional SQLite.
5. **Pre-Deploy Checklist** — “Pre-deploy check” for a given release/sprint.

---

## Out of scope for MVP (do later)

- **Auto-Review Assignment** (needs “who touched these files” from GitLab + SQLite or Jira).
- **Sprint Auto-Planning / Capacity / Risk** (more product and data model work).
- **Technical Debt Tracker** (needs repo scan + Jira create; good Phase 2).
- **Merge Conflict Predictor** (needs file-level or branch awareness; more GitLab API).

These stay on the roadmap for Phase 2–4 after the five above are in use.
