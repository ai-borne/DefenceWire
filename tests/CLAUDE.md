# CLAUDE.md — tests/

Inherits all rules from the root `CLAUDE.md`. Covers `unit/`, `integration/`, and `e2e/`.

- Tests verify intent, not just behavior (Rule 9): a new test must be able to fail if the business rule it targets is broken. If it can't, rewrite it.
- 100% of tests must pass before a phase is marked complete — no skipped/pending tests reported as "passing" (Rule 12).
- Don't touch unrelated test files while fixing one test (Rule 3: Surgical Changes).
