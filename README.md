# Playwright Transaction System Quality Demo

A multi-layer test automation strategy demonstrating quality validation beyond
simple UI confirmation messages. Tests target [The Internet Herokuapp](https://the-internet.herokuapp.com).

## Core Principle

> A successful popup is not enough. We must prove that the action completed
> correctly in the system.

## Test Pyramid

```
         ┌──────────────┐
         │   VISUAL (V) │  ← stable UI guardrails (6 tests)
        ┌┴──────────────┴┐
        │   E2E (E)       │ ← critical business workflows (5 tests)
       ┌┴─────────────────┴┐
       │  INTEGRATION (I)   │ ← cross-layer validation (8 tests)
      ┌┴───────────────────┴┐
      │      API (A)         │ ← direct backend validation (7 tests)
     ┌┴─────────────────────┴┐
     │      SMOKE (S)         │ ← fast deployment gate (6 tests)
     └────────────────────────┘
```

## Suite Structure

| Suite | Dir | Count | Purpose |
|---|---|---|---|
| Smoke | `tests/smoke/` | 6 | Fast deployment gate — is the app alive? |
| API | `tests/api/` | 7 | HTTP-layer validation — what did the server process? |
| Integration | `tests/integration/` | 8 | Cross-layer — does UI→API→state work correctly? |
| E2E | `tests/e2e/` | 5 | Full business workflows end-to-end |
| Visual | `tests/visual/` | 6 | Stable UI regression snapshots |

## Running Tests

```bash
npm install
npx playwright install chromium

# Run a specific suite
npm run test:smoke
npm run test:api
npm run test:integration
npm run test:e2e
npm run test:visual

# Run all suites
npm test

# Update visual baselines after intentional UI changes
npm run test:update-snapshots

# Open HTML report
npm run report
```

## Authentication Strategy

One smoke test (`S3`) validates the real UI login path end-to-end.
All other suites authenticate via API or session reuse because it is:
- Faster (no browser rendering of the login form)
- Less flaky (no timing dependencies on form interactions)
- More focused (test intent is on the feature, not the login flow)

## Project Structure

```
├── playwright.config.ts       # Project definitions, one per suite type
├── pages/                     # Page Objects (encapsulate selectors)
│   ├── LoginPage.ts
│   ├── SecureAreaPage.ts
│   ├── AddRemoveElementsPage.ts
│   └── FormAuthPage.ts        # API contract constants
├── utils/
│   ├── auth.ts                # UI login, API login, session injection
│   └── assertions.ts          # Cross-layer assertion helpers
└── tests/
    ├── smoke/smoke.spec.ts
    ├── api/api.spec.ts
    ├── integration/integration.spec.ts
    ├── e2e/e2e.spec.ts
    └── visual/visual.spec.ts
```
