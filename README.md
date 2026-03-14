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
        │     E2E (E)     │ ← critical business workflows (4 tests)
       ┌┴─────────────────┴┐
       │  INTEGRATION (I)   │ ← cross-layer validation    (5 tests)
      ┌┴───────────────────┴┐
      │       API (A)        │ ← direct backend validation (4 tests)
     ┌┴─────────────────────┴┐
     │       SMOKE (S)        │ ← fast deployment gate     (3 tests)
     └────────────────────────┘
                                                    Total: 21 tests
```

Each layer has a specific job. Tests do not duplicate work done by a lower
layer — they build on it.

---

## Suite Structure

| Suite | Dir | Tests | Purpose |
|---|---|---|---|
| Smoke | `tests/smoke/` | 3 | Is the app alive and the critical path working? |
| API | `tests/api/` | 4 | What did the server actually accept or reject? |
| Integration | `tests/integration/` | 5 | Do UI actions produce the correct server exchanges and state? |
| E2E | `tests/e2e/` | 4 | Do complete user journeys work end-to-end? |
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

### Integration Suite — "Do the layers work together correctly?"

Integration tests answer the gap between "the screen said success" and "the
system actually processed it."

**I1 — UI login sends the correct HTTP exchange**
Registers a `request` event listener before logging in. After the redirect
completes, inspects the captured request to verify: the method was POST, the
content-type was `application/x-www-form-urlencoded` (not JSON), and the
username and password fields were populated correctly. A mismatch here would
break authentication silently.

**I2 — Server rejection is reflected correctly in the UI**
Submits invalid credentials and confirms: the browser stays on `/login` (not
redirected to `/secure`), and the error flash message appears with the `error`
CSS class applied. Validates that the server's rejection travels all the way
to the user's screen.

**I3 — Add and delete maintain precise state at every step**
Adds three elements, asserting the count after each one (0→1, 1→2, 2→3),
then deletes one and confirms the count drops to exactly 2 — not all deleted,
not unchanged. Checking the count at each step catches failures that only
checking the final count would miss.

**I4 — Full reversal returns to a clean state**
Adds 3 elements, then deletes all 3 one by one, asserting zero remain. Also
confirms the Add Element button is still enabled after full reversal — the
page must remain functional, not left in a broken state.

**I5 — Logout terminates the server session**
Logs in, logs out, then navigates directly to `/secure`. Confirms the browser
is redirected away. This proves logout is not just a UI state change — the
server actually invalidated the session.

---

### E2E Suite — "Does the complete user journey work?"

E2E tests cover scenarios that span multiple features or lifecycle stages. Each
test must cover something not already proven by a lower layer.

**E1 — Complete session lifecycle**
Login → access secure content → logout → confirm session is gone. The lower
layers validate each step individually. This test proves they work as a
connected sequence.

**E2 — Full transaction lifecycle with state integrity**
The demo's core answer to the central question. Adds 3 elements (verifying
state after each), then deletes all 3 (verifying state after each), ending
with an empty list and a still-functional Add button. State is never assumed —
it is always confirmed.

**E3 — Unauthenticated access as a browser experience**
A3 validates the HTTP redirect. This test validates what the user actually
sees: the browser lands on `/login` and the login form is rendered and
actionable. A redirect that breaks the browser experience would pass A3 but
fail here.

**E4 — Error recovery after a failed login**
Submits wrong credentials, confirms the error state, then submits correct
credentials and confirms successful authentication. A broken implementation
might corrupt form state or cache the error in a way that blocks a valid retry.

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

**S2** is the only test that uses real browser-based UI login. All other tests
that need an authenticated state use `apiLogin()` from `utils/auth.ts`, which
POSTs credentials directly to `/authenticate` and reuses the returned session
cookie. This is:

- **Faster** — no browser rendering of the login form
- **Less flaky** — no timing dependencies on form animations
- **More focused** — the test's intent is on the feature, not the login flow

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
