# Phase 3 Summary

Delivered:

- Added a registry-driven deterministic classifier, with Unicode-safe alias
  boundaries, alias punctuation handling, context rules, materiality rejection,
  bounded approved implications, roles, stable fingerprints, and source spans.
- Wired classification into the durable crawler after all eligible clusters are
  stored, without changing legacy public hashtag presentation.
- Added D1 provenance, article-mention writes, desired-state reconciliation,
  unchanged-input reuse, curator-lock protection, and private exact-span review
  candidates. Published topics become effective assignments; provisional topics
  remain shadow decisions.
- Added a reviewed Phase 3 registry seed migration and focused unit/migration
  coverage. Regenerated `d1/schema.sql`.

Verification:

- `npm run typecheck`
- `npm run check:contracts`
- `npm run check:crawler`
- `npm run check:css`
- Focused deterministic-classifier and D1 migration tests

Tech debt discovered:

- Initial acronym matching did not accept dotted acronyms, role proximity could
  misclassify actors, and one proposed implication formed a cycle with an
  existing rule.

Resolution:

- Added dotted acronym matching, directional role checks, and rejected the
  cyclic rule. The remaining contextual corpus and production assertions are
  explicitly carried forward in Phase 14 rather than silently approximated.

Known limitations:

- See Phase 14 in `canonical-topic-knowledge-base-execution-plan.md`.

Build status:

- `npm run check` passed, including the production build, bundle budget, and
  security scan.

Test status:

- 190 test files and 1,446 tests passed. No tests were skipped or quarantined.
