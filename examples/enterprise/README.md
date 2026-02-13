# Enterprise (10+ developers)

- **Scaling**: Same as small team; Relay stays local. Consider standardizing `RELAY_DEVELOPER_ID` (e.g. from LDAP/SSO).

- **Jira**: Use Jira Personal Access Token in `RELAY_JIRA_API_TOKEN`; set `RELAY_JIRA_BASE_URL`, `RELAY_JIRA_EMAIL`. Optionally inject via a secrets manager.

- **CI**: Run Relay only on developer machines, not in CI. Use Relay for coordination; keep builds/tests in existing pipelines.

- **Compliance**: No telemetry; data stays in `~/.relay/relay.db`. For locked-down workstations, set `RELAY_DB_PATH` to an allowed directory.

- **Future**: Web dashboard and optional sync service for cross-team visibility (roadmap).
