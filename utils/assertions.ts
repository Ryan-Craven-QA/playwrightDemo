/**
 * Custom assertion helpers
 *
 * All functions that were previously defined here have been removed because
 * none of them were imported by any test file, and the checklist explicitly
 * prohibits keeping functions that exist "just in case."
 *
 * History of removed exports and why:
 *
 *   assertSuccessFlash / assertErrorFlash
 *     Duplicated LoginPage.assertSuccessMessage() and LoginPage.assertFailureMessage().
 *     Flash-message assertions belong in the page object where the selector (#flash)
 *     is already encapsulated. Tests should call the page object methods directly.
 *
 *   assertApiResponseFields / assertApiResponseStructure
 *     Thin wrappers around expect(response).* calls. No test imported them.
 *     If a test needs to validate API response fields it can call expect() inline
 *     or these helpers can be reintroduced at the point they are first needed.
 *
 *   assertUiMatchesApiValue
 *     Cross-layer comparison helper. No test imported it. If integration tests
 *     require this pattern in the future, reintroduce it at that time with a
 *     concrete usage.
 */
