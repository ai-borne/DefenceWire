# Phase 1 Summary

Date: 2026-09-13

## Delivered

- Six ordered D1 migrations and Wrangler's migration ledger replace direct
  deployment of the monolithic schema snapshot.
- The generated `d1/schema.sql` remains available only as a reproducible clean
  bootstrap artifact.
- All 16 Phase 1 tables are present: ingestion runs, durable articles and
  clusters, source membership and lineage, canonical topics and aliases,
  relations and implication rules, private candidates, immutable assignment
  provenance, effective assignments, evidence mentions, curator audit, and the
  reclassification queue.
- A reviewed 22-topic bootstrap taxonomy and normalized aliases are seeded
  idempotently. Verified conditional LAC implications are seeded separately
  from descriptive relations.
- Existing canonical and discovered entities migrate only into the private
  review-candidate queue; they cannot silently become public topics.
- Typed, parameterized read services cover article, cluster, redirect, topic,
  alias, verified relation, and verified implication records. The crawler topic
  loader uses one bounded batch operation.
- Durable source IDs use normalized canonical URLs or the reviewed URL-less
  fallback with a collision-resistant SHA-256 digest. Cluster IDs are random
  UUIDs minted independently of primary sources, fingerprints, and model text.
- No current ingestion, classification, public endpoint, hashtag, or UI path was
  connected to these foundations in Phase 1.

## Deep goal audit

| Phase 1 requirement | Evidence | Result |
|---|---|---|
| All required tables and representative fields | Migrations 0003–0005; migration integration test | Complete |
| Unique IDs, hashtags, URLs, memberships, aliases, mentions, relations, rules | Primary keys, unique indexes, and constraint tests | Complete |
| Controlled types, roles, statuses, verification states, sources, confidence, and evidence offsets | D1 checks and negative-path integration tests | Complete |
| Topic and cluster redirects, merge/split lineage, and cycle prevention | Recursive triggers, bounded read queries, integration tests | Complete |
| Topic lifecycle validation | Transition trigger and rejection test | Complete |
| Bounded implication traversal | Maximum depth check plus insert/update cycle triggers | Complete |
| Effective membership isolated from private decision history | Publication/acceptance triggers and shadow/provisional/rejected/suppressed/superseded tests | Complete |
| Curator locks cannot be overwritten by ingestion-style writes | Update/delete guards and integration tests | Complete |
| Corroboration counts derive from evidence and editorial owners | `topic_corroboration_counts` view and syndication-owner test | Complete |
| Legacy entity ownership preserved | Private candidate import test; no legacy master-table replacement | Complete |
| Stable article identity after URL normalization | SHA-256 identity unit tests | Complete |
| Stable cluster identity across primary-source changes | UUID minting and database primary-change tests | Complete |
| Numbered, additive migrations with a ledger | Wrangler config/scripts and fresh local D1 runs | Complete |
| Empty and representative prior schemas migrate | SQLite integration tests and clean Wrangler emulator run | Complete |
| Foreign keys enabled and valid | Test setup, migration checks, and `foreign_key_check` assertions | Complete |
| Reviewed seed is idempotent and not a compiled allowlist | Seed migration plus D1-backed loader | Complete |
| Article, cluster, and topic registries are readable without behavior changes | Typed services/query builders; full regression suite | Complete |
| Files remain within the 300-line rule | Migrations split below 300 lines; generated snapshot carries its SRP justification | Complete |

## Verification

- Fresh Wrangler local D1: all six migrations applied successfully.
- Repeated Wrangler local D1 run: no migrations to apply.
- SQLite migration suite: clean database and representative legacy database
  passed with no foreign-key violations.
- Phase 1 tests: 25 focused unit/integration tests passed.
- Full `npm run check`: passed after implementation and dependency remediation.
- Full tests: 184 files and 1,428 tests passed.
- Production build: passed; 161 modules transformed.
- Bundle budget: main reader bundle 40.58 KB gzip against the 100 KB limit.
- Security: `npm audit` and the repository security gate report zero vulnerabilities.

## Tech debt discovered

1. The pre-Phase 1 workflow deployed `d1/schema.sql` directly and had no
   migration ledger.
2. The legacy bootstrap carried stale manual one-off migration instructions and
   exceeded the 300-line limit.
3. The installed Wrangler runtime failed to spawn its local emulator.
4. Refreshing Wrangler exposed a moderate path-traversal advisory in the prior
   Vitest toolchain and revealed that scripts depended on transitive `vite-node`.
5. The first registry draft used multiple reads, omitted article/cluster read
   facades, over-normalized URL schemes, and reused the legacy 32-bit ID hash.

## Resolution

1. Adopted ordered migrations, configured Wrangler's ledger, and made the
   schema snapshot generated-only.
2. Removed obsolete manual SQL, split legacy migrations below 300 lines, and
   documented the generated snapshot's single-responsibility exception.
3. Upgraded Wrangler to 4.131.1 and verified clean and repeated emulator runs.
4. Upgraded Vitest to the patched major release and declared `vite-node`
   directly; the entire suite passes and the audit is clean.
5. Added one-batch registry loading, durable read services, policy-faithful URL
   normalization, SHA-256 article IDs, and UUID-based cluster minting.

No unresolved Phase 1 implementation debt remains.

## Known limitations

- The numbered migrations were not applied to the remote production D1 database
  because this repository implementation did not include separate production
  deployment authority. This external action and its parity evidence are
  carried forward explicitly to Phase 12 in the execution plan.
- Phase 1 intentionally does not connect the new tables to ingestion,
  classification, public APIs, compatibility hashtags, or UI; those are planned
  behaviors in later phases rather than incomplete Phase 1 work.

## Build status

Passed.

## Test status

Passed. No skipped, pending, or quarantined tests.
