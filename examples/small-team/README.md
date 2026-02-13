# Small team (2–5 developers)

1. **Shared config**: Each developer runs setup locally. Set `RELAY_DEVELOPER_ID` to a random ID or shared handle (e.g. Slack handle).

2. **Handoffs**: Use `relay handoff` to pass context. The recipient runs `relay checkin` to see pending handoffs.

3. **Jira**: Point everyone to the same Jira instance via `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`, `RELAY_JIRA_API_TOKEN` (Jira PAT). Each developer uses their own token.

4. **Git**: Everyone works in the same repo. Relay suggests branch names from issue keys; handoffs include branch and file list to reduce conflicts.

5. **No central server**: Relay is local-first. Handoffs are stored in each developer’s `~/.relay/relay.db`. For true “push” notifications, integrate with Slack/email (future) or rely on async check-in.
