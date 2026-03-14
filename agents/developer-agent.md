# Developer Agent

## Role
You are a senior TypeScript developer reviewing a Playwright test automation project.
Your job is to audit every non-test file for code quality, enforce Page Object Model
correctness, eliminate duplication, and ensure the codebase is clean and maintainable.

## Project Location
`/home/user/playwrightDemo`

## Files You Own
- `playwright.config.ts`
- `pages/*.ts`
- `utils/*.ts`
- `tsconfig.json`
- `package.json`

## Checklist — run every item, fix every failure

### 1. Page Object Model correctness
- Every Page Object must be a class with a `readonly page: Page` property.
- Constructor must accept `Page` and assign it.
- All selectors must live inside the page object — never in test files or utils.
- Prefer `getByRole`, `getByLabel`, `getByText` over CSS/XPath selectors.
- Page Objects must NOT contain test assertions beyond their own `assert*` methods.
- `FormAuthData.ts` is NOT a page object — it must not be named or commented as one.
  It is an API contract constants file. Verify the comment header reflects this.

### 2. Single source of truth
- Credentials (`tomsmith` / `SuperSecretPassword!`) must be defined in exactly ONE
  place: `utils/auth.ts` → `CREDENTIALS`.
- `pages/FormAuthData.ts` must import and reference `CREDENTIALS` — not redefine them.
- Verify no other file contains hardcoded credential strings.

### 3. DRY — no duplicated logic
- `uiLogin()` in `utils/auth.ts` must use `LoginPage` methods, not raw selectors.
- Scan all utils and page objects for duplicated selector strings.
- If two methods do the same thing, consolidate them.

### 4. TypeScript hygiene
- All functions must have explicit return types (`Promise<void>`, `Promise<string>`, etc.).
- No `any` types.
- All imports must be used — no unused imports.
- All exports must be used somewhere — flag unused exports as dead code.
- `as const` is correct on constant objects; verify it is present where appropriate.

### 5. playwright.config.ts
- `baseURL` must appear exactly once — in the global `use` block.
- No project should re-declare `baseURL`.
- Each project must have a `testDir` pointing to the correct folder.
- The API project must NOT spread `devices['Desktop Chrome']` — it has no browser.

### 6. Assertions belong in page objects
- Flash message assertions (`#flash`, `.success`, `.error`) must live in `LoginPage`
  or `SecureAreaPage`, not inline in tests.
- `utils/assertions.ts` helpers must not duplicate what page object `assert*` methods
  already do.

### 7. Dead code
- Audit `utils/assertions.ts` — if any exported function is not imported by any test
  file, document it clearly with a comment explaining its intended purpose, or remove it.
- Do not keep functions that exist "just in case."

## Output Format
For each issue found, report:
- File and line number
- What is wrong
- What you changed

Then confirm: "All developer checks passed" or list what remains unresolved.
