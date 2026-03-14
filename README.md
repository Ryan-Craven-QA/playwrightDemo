# Playwright Transaction System Quality Demo

A multi-layer test automation strategy demonstrating quality validation beyond
simple UI confirmation messages. Tests target [The Internet Herokuapp](https://the-internet.herokuapp.com).

---

## Core Principle

> A successful popup is not enough. We must prove that the action completed
> correctly in the system.

Most test suites stop at "the success message appeared." This demo shows what
the next level looks like: verifying state at the HTTP layer, checking that
the correct data was sent, confirming the server actually processed the action,
and proving that sessions are created and destroyed correctly.

---

## Test Pyramid

```
         ┌──────────────┐
         │   VISUAL (V) │  ← stable UI guardrails        (5 tests)
        ┌┴──────────────┴┐
        │     E2E (E)     │ ← critical business workflows (3 tests)
       ┌┴─────────────────┴┐
       │  INTEGRATION (I)   │ ← cross-layer validation    (3 tests)
      ┌┴───────────────────┴┐
      │       API (A)        │ ← direct backend validation (4 tests)
     ┌┴─────────────────────┴┐
     │       SMOKE (S)        │ ← fast deployment gate     (3 tests)
     └────────────────────────┘
                                                    Total: 18 tests
```

Each layer has a specific job. Tests do not duplicate work done by a lower
layer — they build on it.

---

## Suite Structure

| Suite | Dir | Tests | Purpose |
|---|---|---|---|
| Smoke | `tests/smoke/` | 3 | Is the app alive and the critical path working? |
| API | `tests/api/` | 4 | What did the server actually accept or reject? |
| Integration | `tests/integration/` | 3 | Does a UI action produce the correct HTTP exchange or DOM state? |
| E2E | `tests/e2e/` | 3 | Do complete user journeys work end-to-end? |
| Visual | `tests/visual/` | 5 | Did any stable screen change unexpectedly? |

---

## How the Tests Work

### Smoke Suite — "Is the app alive?"

**S1 — Application health check**
Navigates to the homepage and confirms the server responds with HTTP 200, the
page title is correct, and the main heading is visible. This is the most basic
gate: if S1 fails, there is no point running anything else.

**S2 — UI login (the only real browser login in the entire suite)**
Fills the login form with valid credentials, clicks submit, and confirms the
browser lands on `/secure` with the welcome message visible and the Logout link
present. This is deliberately the only test that exercises the full UI login
flow — all other suites authenticate faster via the API layer.

**S3 — Transactional feature is operational**
Confirms the Add Element button is visible and enabled, clicks it, and then
asserts that exactly one Delete button exists. Visibility alone is not enough:
a broken or disabled button can still be visible.

---

### API Suite — "What did the server process?"

These tests send HTTP requests directly — no browser, no page rendering —
and inspect the raw responses.

**A1 — Valid credentials produce a session cookie**
POSTs valid credentials to `/authenticate` with redirects disabled so we can
inspect the raw response. Confirms the server set a `set-cookie` header,
proving a session was actually established.

**A2 — Invalid credentials are rejected**
POSTs bad credentials and checks that the redirect target (if any) is not
`/secure`. This is the meaningful assertion: a session cookie appears on
failed logins too (Rack uses it for flash messages), so only the redirect
destination proves whether access was granted or denied.

**A3 — Unauthenticated access to a protected resource is blocked**
GETs `/secure` without a session cookie. Expects a redirect (302/303) or an
access-denied response (401/403) — never a 200. A 200 here means the
protected page is publicly accessible, which is a security failure.

**A4 — API-established session grants access**
Logs in via POST, then immediately GETs `/secure` in the same request context.
Expects HTTP 200 and the page body to contain "Secure Area". This proves the
session mechanism works at the HTTP layer and is the foundation for efficient
session reuse in other suites.

---

### Integration Suite — "Do the layers talk to each other correctly?"

Integration tests answer a specific question: did the action at one layer
produce the correct result at the next layer? Each test stops at a boundary
and inspects it — no full journeys, no session lifecycle.

**I1 — UI login sends the correct HTTP exchange**
Registers a `request` event listener before logging in. After the redirect
completes, inspects the captured request to verify: the method was POST, the
content-type was `application/x-www-form-urlencoded` (not JSON), and both
credential fields decoded correctly. A mismatch here would break authentication
silently — the UI would appear to submit but the server would reject the
request. This is the only test in the entire suite that checks the wire.

**I2 — Server rejection is reflected correctly in the UI**
Submits invalid credentials and confirms two things: the browser stays on
`/login`, and the error flash has the `error` CSS class applied. This validates
the seam from server response to UI rendering — the server's rejection must
travel correctly up to the screen.

**I3 — Add element produces exactly the correct DOM state change**
Clicks Add Element once and asserts the DOM contains exactly 1 Delete button.
One action, one assertion at the resulting layer. This is the layer-boundary
check for the transaction feature: the click was received, processed, and the
UI reflects the exact state change — not approximately, not "at least one."

---

### E2E Suite — "Does the complete user journey work?"

E2E tests cover scenarios that span multiple features or lifecycle stages.
Each test must cover something that cannot be validated by a lower layer alone —
no single-action tests, no duplicates of integration concerns.

**E1 — Complete session lifecycle**
Login → access secure content → logout → confirm session is gone. The lower
layers validate each step individually. This test proves they work as a
connected sequence: authentication leads to access, logout terminates the
session at the server (not just the UI), and direct navigation after logout
is blocked.

**E2 — Error recovery after a failed login**
Submits wrong credentials, confirms the error state and that the form is still
actionable, then submits correct credentials and confirms successful
authentication. I2 proves the server rejects bad credentials. This test goes
further: the rejection must not corrupt form state or prevent a valid retry.
A broken implementation might lock the form, cache the error session, or clear
the input fields.

**E3 — Full feature journey: auth + transaction feature + session cleanup**
The demo's signature test. Logs in, navigates to the transaction feature, adds
3 elements (verifying the count after each), deletes all 3 (verifying the count
after each), then logs out and confirms the session is terminated. No lower
layer can validate this as a single connected flow — it spans authentication,
the transactional feature, state integrity across 6 operations, and session
cleanup in one unbroken journey.

---

### Visual Suite — "Did anything stable change unexpectedly?"

Visual tests take component-level screenshots and compare them to stored
baselines. They are a lightweight guardrail — not the primary validation layer,
but an early warning for unintended UI regressions.

**V1** — Login form component (`#login` element)
**V2** — Add/Remove Elements page before any interaction
**V3** — Add/Remove Elements page after one element is added
**V4** — Secure area content after login (flash message excluded — it's dynamic)
**V5** — Homepage layout

---

## Authentication Strategy

**S2** is the only test that validates the real browser-based login form
end-to-end. All other tests that need an authenticated session call
`LoginPage.loginWith(CREDENTIALS)` directly — which is fast, stable, and keeps
the test focused on the feature under test rather than the login flow.

`CREDENTIALS` is defined once in `utils/auth.ts` and imported everywhere it
is needed. Credentials are never hardcoded in test files.

---

## Running Tests

### Setup

```bash
npm install
npx playwright install chromium
```

### Run by suite

```bash
npm run test:smoke          # S1–S3 only (fastest, run on every deploy)
npm run test:api            # A1–A4 only
npm run test:integration    # I1–I5 only
npm run test:e2e            # E1–E4 only
npm run test:visual         # V1–V5 only (requires baselines to exist)
npm test                    # all 21 tests, all suites
```

### Headless vs. headed (browser window visible)

```bash
# Headless is the default — no browser window opens
npm test

# Headed — opens a real Chrome window so you can watch the tests run
npx playwright test --headed

# Headed for a specific suite
npx playwright test --project=e2e --headed
```

### Run in a specific browser

```bash
npx playwright test --project=smoke                     # Chrome (Desktop Chrome profile)
npx playwright test --browser=firefox                   # Firefox
npx playwright test --browser=webkit                    # Safari engine
npx playwright test --browser=chromium --headed         # Chromium, headed
```

### Run a single test by name

```bash
# Match by title string (partial match works)
npx playwright test --grep "S2"
npx playwright test --grep "full transaction lifecycle"
npx playwright test --grep "E4"
```

### Run a single file

```bash
npx playwright test tests/smoke/smoke.spec.ts
npx playwright test tests/api/api.spec.ts
npx playwright test tests/e2e/e2e.spec.ts
```

### Parallelism and workers

```bash
# Default: fully parallel (uses all available CPU cores)
npm test

# Limit to 2 parallel workers
npx playwright test --workers=2

# Run serially (one test at a time) — useful for debugging
npx playwright test --workers=1
```

### Debug mode (step through test line by line)

```bash
# Opens Playwright Inspector — pause, step, and inspect selectors
npx playwright test --debug

# Debug a specific test
npx playwright test --grep "S2" --debug
```

### Interactive UI mode (recommended for exploration and demo)

```bash
# Opens the Playwright UI — browse tests, run individually, watch traces
npx playwright test --ui
```

### Reporters

```bash
# Default: list in terminal + HTML report saved to playwright-report/
npm test

# Open the HTML report after a run
npm run report

# Dot reporter (minimal output, good for CI)
npx playwright test --reporter=dot

# Line reporter (one line per test)
npx playwright test --reporter=line
```

### Visual baseline management

```bash
# First run (no baselines exist yet) — creates the .png baseline files
npx playwright test --project=visual --update-snapshots

# After an intentional UI change — update baselines to the new state
npm run test:update-snapshots
```

---

## Project Structure

```
├── playwright.config.ts               # Project definitions, one per suite type
├── pages/                             # Page Objects — encapsulate selectors and actions
│   ├── LoginPage.ts                   # /login form interactions and assertions
│   ├── SecureAreaPage.ts              # /secure page — load check, logout
│   ├── AddRemoveElementsPage.ts       # /add_remove_elements — add/delete/count
│   └── FormAuthPage.ts               # API contract constants for /authenticate
├── utils/
│   ├── auth.ts                        # CREDENTIALS, uiLogin(), apiLogin(), injectSession()
│   └── assertions.ts                  # Reusable flash, API response, and cross-layer assertions
└── tests/
    ├── smoke/smoke.spec.ts            # S1–S3
    ├── api/api.spec.ts                # A1–A4
    ├── integration/integration.spec.ts # I1–I5
    ├── e2e/e2e.spec.ts                # E1–E4
    └── visual/visual.spec.ts          # V1–V5
```
