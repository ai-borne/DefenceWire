# Phase 2 Summary

Date: 2026-09-13

## Delivered

- The crawler now persists and enriches every eligible cluster before applying
  the homepage limit. The final `slice(0, maxClusters)` is a presentation
  projection rather than an ingestion boundary.
- Durable article IDs use canonical URLs and SHA-256 identity. Durable cluster
  IDs are random UUIDs reused through stored article membership, event
  fingerprints, and retry manifests; they no longer depend on the primary
  publisher.
- Migration `0007_durable_ingestion.sql` adds strict ingestion transitions,
  exact per-run article/cluster/homepage counters, run/article membership,
  retry manifests, deterministic R2 payload references, and orphan lifecycle
  records.
- Every cluster payload is written to R2 before the transactional D1 batch can
  expose its metadata reference. Failed commits record adoptable orphan
  candidates; retries reuse the same run fingerprint, cluster UUID, and object
  key.
- Merge and split planning records lineage. Curator-locked topic memberships
  are propagated through new immutable lineage decisions while the original
  decisions remain intact.
- Rank-excluded clusters are written to the existing archive path, so a
  rank-31 story remains searchable instead of disappearing when the homepage
  selects 30 stories.
- Incomplete durable or archive writes block the homepage snapshot. The CLI
  exits non-zero on failure, and the local JSON snapshot is replaced atomically.

## Deep goal audit

| Phase 2 requirement | Evidence | Result |
|---|---|---|
| Persist before homepage ranking | Pipeline integration test observes 50 durable/enriched clusters before the 30-cluster projection | Complete |
| Durable ID for every accepted article | Run/article ledger plus canonical URL and URL-less identity primitives | Complete |
| Persist every eligible cluster | Run manifest and eligible-cluster counter are written before ranking | Complete |
| Stable cluster ID across primary changes | Source-membership lookup and planner test with replacement primary | Complete |
| Preserve multiple publications | `cluster_sources` upserts primary, related, and social membership with authority and joined publication time | Complete |
| Merge/split lineage and curator locks | Lineage planner tests and SQLite integration test for immutable decision retention and lock propagation | Complete |
| R2-before-D1 visibility | Service call-order test and fail-closed write path | Complete |
| Transactional bounded D1 writes | Maximum 100-statement REST batches with per-result success validation | Complete |
| D1 partial failure blocks publication | Failure-path test records `failed_retryable` and rejects the run | Complete |
| Detect/adopt R2 orphan | Deterministic manifest/orphan rows and retry test | Complete |
| Resume interrupted ingestion | Monotonic persisted stages and idempotent stage guards | Complete locally; production drill carried to Phase 13 |
| Repeated crawl creates no duplicates | Stable run fingerprint, conflict-safe writes, retry manifest, and no-mutation rerun test | Complete |
| Rank-31 remains available | Pipeline sends all 50 clusters to archive and only 30 to homepage | Complete for durable/archive paths; public canonical topic-page assertion waits for Phases 3 and 8 |
| Homepage/archive compatibility | Existing crawler and archive tests pass; payload keys retain the archive reader's `<cluster-id>.json` contract | Complete |
| No incomplete run is published | State transition guard, archive failure gate, atomic file writer, and non-zero CLI failure | Complete |

## Verification

- Migration `0007_durable_ingestion.sql` applied successfully to a local
  Wrangler D1 database; the repeated migration run reported no pending files.
- Focused Phase 2 unit/integration tests pass, including pipeline ordering,
  state constraints, merge/lock preservation, orphan recovery, idempotency,
  R2 ordering, archive failures, and atomic snapshot replacement.
- The generated `d1/schema.sql` contains migration 0007 and remains reproducible.
- Full `npm run check`: passed. It includes TypeScript, contracts, crawler
  dry-run, CSS, all tests, production build, bundle budget, and security.
- Full tests: 189 files and 1,443 tests passed. No skipped, pending, or
  quarantined tests were introduced.
- Production bundle: main reader bundle is 40.58 KB gzip against the 100 KB
  budget; the security gate reports zero vulnerabilities.

## Tech debt discovered

1. The shared D1 REST client treated every HTTP 200 response as success even
   when D1 reported a failed statement in the response body.
2. The crawler's JSON output used a direct file write despite describing the
   operation as atomic.
3. The initial Phase 2 draft had no durable manifest for recovering a randomly
   minted cluster ID after R2 succeeded and D1 failed.
4. Run metadata could not prove exact eligible-article and pre-ranking-cluster
   counts needed by the later production baseline.
5. The setup guide documented D1 credentials but omitted the R2 configuration
   now required by fail-closed durable ingestion.

## Resolution

1. D1 responses now validate both top-level and per-statement success.
2. Snapshot output now writes a same-directory temporary file and atomically
   renames it into place, cleaning the temporary file on failure.
3. Retry manifests persist the random UUID and deterministic object key before
   payload upload; orphan rows are adopted only after the D1 cluster batch
   succeeds.
4. Added authoritative run/article membership and explicit eligible article,
   eligible cluster, and homepage cluster counts.
5. Updated `d1/README.md` with scoped R2 setup and all required CI secrets.

No unresolved repository implementation debt remains from Phase 2.

## Known limitations

- Production migration, real failure injection, and recovery drills require
  external authority and are explicitly carried to Phase 13.
- Public canonical topic pages intentionally do not consume `cluster_topics`
  until the later classification/API phases. The rank-31 canonical topic-page
  assertion is therefore carried to Phase 13; Phase 2 already preserves and
  archives the underlying cluster.
- Arbitrary publisher redirects require safe article acquisition and learned
  redirect aliases. That production-integrated validation is carried to Phase
  13 rather than guessed from feed URLs.

## Build status

Passed.

## Test status

Passed: 189 files, 1,443 tests. No skipped, pending, or quarantined tests.
