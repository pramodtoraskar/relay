# ADR-005: Credentials via MCP environment

**Status:** Accepted  
**Date:** 2025-02-16

## Context

Jira (and potentially Git/GitLab) require credentials. Relay could read and store them (e.g. in config or a keychain), or delegate to the MCPs that actually perform the authenticated calls.

## Decision

**Relay does not read or store credentials.** Credentials are passed to each MCP via **environment variables** (or equivalent mechanism provided by the host). Each MCP runs in its own process and is responsible for using those credentials when calling Jira API, Git remotes, etc. Relay only invokes MCP tools; it never sees or persists tokens or passwords.

## Consequences

### Positive

- Minimal credential surface in Relay; no accidental logging or persistence of secrets.
- Aligns with how many MCP hosts already pass env to subprocesses; no custom secret store required in Relay.
- Each MCP can use its preferred auth method (env, config file, etc.) without Relay changes.

### Negative

- Misconfiguration (missing or wrong env) is visible only when the MCP is called; Relay cannot “pre-validate” credentials.

### Neutral

- SQLite MCP typically uses a DB path (and optionally env for encryption); no sensitive credentials in the same way as Jira/Git.

## Notes

- Architecture: [docs/architecture.md](../architecture.md#security-and-failure-modes).
