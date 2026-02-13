# Contributing to Relay

Thank you for considering contributing to Relay.

## Branch convention

- **main** — default; production-ready.
- **feature/*** — new work (e.g. `feature/add-linear-support`).
- **release/*** — release prep (e.g. `release/1.0.0`).
- **hotfix/*** — urgent production fixes.

Create a branch from `main` (or the current release branch), make your changes, and open a PR.

## Development setup

```bash
git clone https://github.com/relay-dev/relay.git
cd relay
npm install
npm run build
npm test
npm run lint
```

## What to contribute

- **Bugs**: Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.yml) template.
- **Features**: Use the [feature request](.github/ISSUE_TEMPLATE/feature_request.yml) template.
- **Docs**: Fix typos or improve clarity in `docs/` and README via PR.
- **Code**: Prefer small, focused PRs. Ensure tests and lint pass.

## Code standards

- **TypeScript**: Strict mode; avoid `any` where possible.
- **Tests**: Jest; add unit or integration tests for new behavior.
- **Lint**: ESLint + Prettier; run `npm run lint` and `npm run format:check`.

## Pull requests

1. Branch from `main` with a `feature/` or `hotfix/` name.
2. Update tests and docs if needed.
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
4. Request review; address feedback.

By contributing, you agree that your contributions will be licensed under the project’s MIT License.
