# Team setup

Relay is designed for **async collaboration**: handoffs, shared Jira, and optional conventions. It also works for **solo developers** using handoffs to yourself.

## Solo developer

1. **Developer ID**: Set `RELAY_DEVELOPER_ID` to a stable value (e.g. `node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"`). You need this so *self-handoffs* work.
2. **Handoffs to yourself**: At end of day, run **`relay handoff`** and set **To** to your *own* `RELAY_DEVELOPER_ID`. The handoff will appear under “Pending handoffs” at your next **`relay checkin`**.
3. **Jira**: Optional. If you use it, set `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, and `RELAY_JIRA_API_TOKEN` as in [getting-started](getting-started.md).
4. **Flow**: Morning **`relay checkin`** → see your self-handoff and branch/files; continue work. EOD **`relay eod`** → **`relay handoff`** to your own id with what’s done / what’s next.

## Small team (2–5)

1. **Developer ID**: Standardize `RELAY_DEVELOPER_ID` (e.g. Slack handle or email). Everyone sets it in their environment.
2. **Jira**: Same instance; each developer uses their own Jira Personal Access Token. Set `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, `RELAY_JIRA_API_TOKEN` per machine.
3. **Handoffs**: Use **`relay handoff`** when pausing or passing work. Recipients run **`relay checkin`** to see pending handoffs.
4. **Branches**: Relay suggests `feature/PROJ-42-slug`; teams can keep their existing branch naming and still use handoff branch/file list for context.

## Medium team (6–10)

- Same as above. Consider a short doc or Slack pin with:
  - How to set `RELAY_DEVELOPER_ID`
  - Where to get Jira API token / PAT
  - When to create handoffs (EOD, context switch)
- Relay stays **local**; there is no central Relay server. Handoff “delivery” is the recipient running check-in (or, in the future, a sync/notification layer).

## Cross-timezone

- Handoffs are ideal for overnight or timezone gaps: create a handoff before you leave; the other dev sees it at their next check-in.
- Use **what’s done** and **what’s next** clearly so the next person can continue without re-reading the whole ticket.

## Conventions (suggested)

- **Morning**: Run **`relay checkin`** at the start of the day.
- **Before EOD**: Run **`relay eod`**; create handoffs for any work in progress.
- **Branch + files**: When creating a handoff, include the branch name and key files so the recipient knows where to look.

## No central server

Relay does not run a shared backend. Each developer’s DB is independent. Handoffs are stored in the **sender’s** DB with a recipient id; the **recipient** sees them only when they run Relay (same machine or a future sync). For “push” notifications, teams can add Slack/email hooks later or rely on async check-in.
