# Phase 0 Summary

Date: 2026-09-13

## Delivered

- Accepted architecture decision: `docs/architecture/ADR-001-canonical-topic-domain-boundaries.md`.
- Reviewed and versioned classification corpus: `tests/fixtures/topics/classification-corpus.json`.
- Reproducible repository baseline command: `npm run baseline:topics`.
- Source-fingerprinted baseline report: `docs/Plans/canonical-topic-phase-0-baseline.md`.
- Corpus and baseline contract tests: `tests/unit/topicPhase0Corpus.test.ts`.
- Updated execution plan with Phase 11 for external production-state measurements that cannot be recovered from the Phase 0 repository snapshot.

## Goal audit

Phase 0's goal was to establish measurable current behavior and encode product rules without changing production behavior.

| Phase 0 requirement | Evidence | Result |
|---|---|---|
| Separate articles, mentions, clusters, topics, assignments, threads, and graph relationships | ADR sections 1–2 | Complete |
| Resolve ownership against legacy entities, graph, programmes, and suppliers | ADR section 1 | Complete |
| Reviewed positive and negative corpus | 23 cases, 42 positive annotations, 10 negative annotations, and 6 stability scenarios | Complete |
| Required LAC cases | Corpus cases `lac-*` | Complete |
| Required Iran/US/Jordan cases | Corpus cases `iran-*` and `us-aircraft-*` | Complete |
| US and Su-57 alias convergence | Seven alias cases and contract tests | Complete |
| Ambiguity, homonym, transliteration, renamed programme, syndication, and lifecycle cases | Corpus and stability scenarios | Complete |
| Current tagged-cluster percentage | 17/31, or 54.84% | Complete |
| Current generated tag variants | 22 spellings, 17 normalized keys, 5 extra variants | Complete |
| Current repository orphan clusters | 18 of 31 compared with the committed thread seed | Complete within declared repository scope |
| Articles affected by current top-N retention | 45 eligible river URLs observably absent from retained cluster sources | Complete within recoverable snapshot scope |
| Existing repository threads and events | 11 threads and 14 events | Complete |
| Existing canonical aliases | Zero seeded canonical rows; five observed spelling-variant groups documented | Complete within repository scope |
| Canonical topic types and assignment roles | ADR sections 3–4 | Complete |
| Relevance and incidental-mention rules | ADR section 5 | Complete |
| Stable article and cluster identity, merge/split lineage | ADR sections 6–7 | Complete |
| Evidence, text-tier, source-authority, and independence rules | ADR sections 8–10 | Complete |
| Cross-run determinism and desired-state reconciliation | ADR section 11 | Complete |
| Conditional implication and public lifecycle rules | ADR sections 12–13 | Complete |
| Numeric quality, stability, latency, write, and cost gates | ADR section 14 and execution plan | Complete |
| No production behavior changes | Only documentation, fixture, test, and measurement tooling changed | Complete |

## Verification

- `npm run baseline:topics`: passed and reproduced the committed baseline.
- `npm run check`: passed in full after the final debt sweep.
- TypeScript typecheck: passed.
- Architecture and contract checks: passed; 459 files checked with zero LOC violations.
- Crawler dry run: passed; 76 feeds across four tiers.
- CSS validation: passed.
- Tests: 179 files passed; 1,403 tests passed; zero skipped or pending tests reported.
- Production build: passed; 161 modules transformed.
- Main reader bundle: 40.58 KB gzip against the 100 KB budget.
- Security audit: passed; zero vulnerabilities.

Expected stderr emitted by negative-path tests was inspected and did not represent suite failures.

## Tech debt discovered

1. The initial corpus omitted an ordinary-word Jaguar case, a diacritic/transliteration case, and a renamed-programme case.
2. The first Unicode test incorrectly treated mechanical diacritic folding as linguistic transliteration.
3. Remote D1 learned aliases, exact historical pre-truncation clusters, and production D1/R2 counts are not present in the repository snapshot, and no Cloudflare credentials were available.

## Resolution

1. Added all missing corpus cases and made their presence a contract test.
2. Kept baseline normalization explicitly measurement-only, corrected its Unicode expectation, and documented that linguistic equivalence belongs in reviewed aliases.
3. Reported only reproducible repository evidence, fingerprinted the inputs, documented all limitations, and added Phase 11 to close external production-state measurements after the required durable ledgers exist.

No unresolved Phase 0 implementation debt remains.

## Known limitations

- The 45-article cutoff measurement is the observable count recoverable from the committed river and retained cluster sources, not the discarded historical `allClusters` array.
- Thread/event/orphan numbers describe the committed thread seed, not current remote D1.
- Learned production aliases cannot be counted from the committed repository.

These are external-state/data-retention limitations, not silently skipped Phase 0 work. They are explicitly assigned to Phase 11 in the execution plan.

## Build status

Passed.

## Test status

Passed: 1,403/1,403 tests across 179/179 files, with the complete `npm run check` gate successful.
