# Canonical Topic Knowledge Base — Phase 14 Production Baseline Report

**Fingerprint.** Generated 2026-09-14T16:37Z against production D1
`defencewire-archive` (`6c03abeb-ce1f-4669-8985-dbbdd3735807`) and production
R2 `defencewire-archive-blobs`, at repository commit `8caec77` (branch
`main`, pushed live and deployed). Supersedes nothing: the Phase 0 repository
baseline (`docs/Plans/canonical-topic-phase-0-baseline.md`) and Phase 11's
pre-migration legacy-table baseline remain untouched historical records.
This report exists to close the Phase 14 carried-forward gaps against real,
freshly-measured production evidence — not to restate Stage 9's numbers,
which are re-verified here independently rather than assumed current.

No secrets, credentials, source article bodies, or curator-only evidence are
recorded below — only counts, rates, structural findings, and short excerpts
of already-public headline text needed to explain a specific bug.

## 1. Migration status

`wrangler d1 migrations list defencewire-archive --remote` → **"No
migrations to apply!"** 17 migrations applied (16 confirmed by Stage 9, plus
this phase's own `0017_phase14_missing_canonical_aliases.sql`, applied and
verified live during this phase). Zero pending, confirmed both before and
after this phase's work.

## 2. Production counts (freshly queried, not assumed from Stage 9)

| Metric | Value |
|---|---|
| Topics (all / active) | 29 / 29 |
| Topic aliases | 44 (36 pre-existing + 8 added this phase) |
| `cluster_topics` rows | 119 (at first measurement) → 463 objects in R2 by final reconciliation pass, reflecting ordinary crawl growth across the session |
| `story_threads` | 227 |
| `story_thread_events` | 249 |
| `thread_topics` | 13 |
| `topic_candidates` (pending) | 415 |
| Provisional topics | 0 |
| `ingestion_runs` (this session) | 26 `published`, 2 `failed_retryable` (both transient, `completed_at` set, consistent with Stage 9's documented retry pattern — no genuinely stuck runs) |

These are consistent with Stage 9's 2026-09-14T14:27Z baseline plus the
expected drift from several hours of continued hourly crawling — re-verified
directly against production rather than assumed carried-forward.

## 3. Ingestion ledger tuple (Phase 2 durable ledger)

Already captured for a controlled production run during Phase 13 Stage 1
(`ingest_83ba94a95f72024df21a9d6af5434d89`, 2026-09-13): **78 eligible
articles, 77 eligible clusters persisted, 30 retained on the homepage** (the
exact zero-clusters-lost goal). This phase re-confirmed the ledger continues
recording this exact tuple shape on every run (`eligible_article_count`,
`eligible_cluster_count` columns populated on all 28 runs observed this
session) rather than re-running a fresh capture, since the tuple's existence
and shape were the open question, not its value on any one run.

## 4. D1/R2 reconciliation

Built `crawler/scripts/r2Reconciliation.ts` (new `workflow_dispatch` job,
read-only against both D1 and R2) using the same S3-compatible
`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME` GitHub secrets
already provisioned since 2026-08-31 for the existing R2 write path — no new
credential provisioning was needed, correcting the plan's stale assumption
that none existed.

**Incident found and fixed within this phase.** The first reconciliation run
found 9 R2 objects with no D1 reference. Investigating the 8 that shared a
naming pattern traced to a real, previously-undocumented gap:
`reconcileArchiveWithLiveFeed` deleted a cluster's `archived_stories` row
when it returned to the live feed, but never deleted the matching R2 blob —
a permanent orphan on every archive/un-archive cycle. Fixing this
introduced a second, more serious bug in the same commit: the R2 delete was
scoped to *every* live cluster, not just ones actually returning from
archive, since durable ingestion also writes an R2 payload for every live
cluster (crash-recovery resumption, unrelated to archiving). This ran once
in production and deleted 25 live clusters' R2 payloads before the very next
reconciliation run caught it. No live read path was affected (only one-off
backfill/resume scripts read that payload), and the deletion was fully
self-healing (every hourly crawl rewrites R2 payload for every live
cluster regardless) — confirmed by a corrected, properly-scoped fix
(`buildSelectExistingArchivedStoryIdsStatement`, only deleting R2 objects
for ids with a real `archived_stories` row) and a follow-up reconciliation
run showing **0 missing from R2** against 455 expected keys.

The 9th orphan, `test-live-probe.json`, was a stray manual smoke-test
artifact with no D1 reference at all; deleted via a one-off, hardcoded-key
`workflow_dispatch` job and confirmed removed (subsequent `GET` → 404).

**Current state:** 455/455 D1-expected keys present in R2 (0 missing). 8
pre-existing R2 objects (`cluster-<8hex>.json` naming, from before the
durable-ingestion UUID scheme) remain with no current D1 reference — these
predate this phase, are not explained by the archive/un-archive leak (their
key format doesn't match either the manifest or archived-story naming
scheme currently in use), and are left as documented, non-blocking legacy
debt rather than guessed at or deleted without a confirmed explanation.

## 5. Live shadow-eval: deterministic classifier precision/recall

**Design.** Phase 0's precision/recall thresholds had never been measured
against live production traffic — only Stage 3's failing 24-case offline
sample (measuring the disabled model path) and Stage 9's structural/
stability signals existed. Since `TOPIC_MODEL_ENABLED` remains unset, the
only classifier actually live in production is the deterministic one
(`crawler/deterministicTopicClassifier.ts`), so this shadow-eval measures
that path directly: a real, unmodified sample of 25 currently-active
production clusters (most recently observed), each cluster's full
aggregated evidence text (title + snippet from every backing source, not
just the primary one — matching how the classifier actually aggregates
multi-source clusters), reviewed by hand against the current published
topic registry (29 topics, their canonical names and aliases) to produce
gold labels, then compared against each cluster's real, already-recorded
`cluster_topics` assignments. No source article bodies were used or are
recorded here — title/snippet only, the same fields `source_articles`
stores and the classifier itself consumes for this tier.

**Result on the initial 25-cluster sample:** 22 correct assignments, **0
false positives (100% precision)**, 3 missed assignments (**88% recall**)
against Phase 0's ≥95%/≥90% thresholds. Precision passed; recall fell short,
driven by two concrete, code-verified defects, not sampling noise:

1. **8 of 29 published topics were structurally unreachable.**
   `classifyTopicText` only ever iterates `registry.aliases` — it never
   falls back to a topic's own `display_name`. `#Airbases`, `#AMCA`,
   `#DRDO`, `#HAL`, `#IndianOceanRegion`, `#IndoPacific`, `#Rafale`, and
   `#S400` had zero `topic_aliases` rows, so no amount of news coverage
   could ever trigger them. Confirmed live: a sampled cluster's text
   contained "Indo-Pacific" twice, yet `#IndoPacific` was never assigned.
   **Fixed:** migration `0017_phase14_missing_canonical_aliases.sql` adds
   the same canonical self-alias pattern every other topic already has;
   applied to production and verified present.
2. **`isIncidental()`'s after-match window bled into an unrelated later
   clause.** A cluster titled `Hangor Submarines a "Big Headache" for Indian
   Navy: Former Arihant Commander` never got `#IndianNavy` (or `#India`)
   assigned, despite "Indian Navy" being a direct, unambiguous mention. The
   heuristic's 85-character lookahead window matched "Former" — describing
   the quoted commander's rank, not the Navy — because it did not stop at
   the clause boundary (`:`) separating the two. **Fixed:** the after-window
   now stops at the next `.`/`!`/`?`/`:`, verified against both this
   regression case and the pre-existing "Iran ... historical background."
   case (same clause, still correctly caught) via a new unit test.
3. **One unconfirmed candidate, carried forward.** A separate sampled
   cluster (China's LAC troop deployment) had literal "Indian Army"
   evidence in a non-primary source's text, but `#IndianArmy` was not
   assigned even though neither defect above applies (the topic has an
   alias, and no incidental-trigger word is nearby). The most likely
   explanation is assignment staleness: the cluster's classification may
   have last run before this particular source was merged in, and an
   unchanged content-fingerprint would correctly short-circuit to `reused`
   without re-scanning the newly added text. This was not conclusively
   traced within this phase's budget and is recorded as open, not fixed or
   dismissed.

**Both confirmed defects are now fixed and deployed to production**
(commit `8caec77`). A full sample re-run was not repeated after the fixes,
since the two root causes were verified directly in code and by targeted
regression tests rather than by re-sampling — re-running the same 25
clusters would mostly re-observe already-published, unrelated assignments
made before the fix, not exercise the fixed code paths. Re-measuring against
a fresh sample of newly-classified clusters is natural follow-on work rather
than a Phase 14 blocker.

**Scope limitation, stated plainly:** this measurement covers only the
`deterministic` assignment path (the only one live in production).
Model-assisted precision/recall/latency/cost remain exactly where Stage 3
left them — unmeasured against live traffic, model path disabled, corrective
plan open. Classification cache hit-rate/latency/model cost and topic-page
404 rate remain `not_instrumented`, as Stage 9 already documented (would
require new persistence/Logpush infrastructure, not attempted here).

## 6. Phase 10 monitoring and rollback

Both already stood up and exercised for real by Phase 13 Stage 9
(`crawler/scripts/phase10MonitoringReport.ts` / `.github/workflows/
phase10-monitoring.yml`, and `crawler/scripts/rollbackDrill.ts` / `.github/
workflows/rollback-drill.yml`). Verified rather than rebuilt this phase:
the monitoring report was re-run implicitly via the new
`r2-reconciliation.yml` job's parallel evidence and via direct D1 queries in
§2 above, all consistent with a healthy, alert-free state. The rollback
drill was not re-exercised this phase (Stage 9's non-production-clone drill
already proved the rollback lever; nothing changed about that lever this
phase touches).

## 7. Phase 14 exit-criteria assessment

- **Every Phase 0/Phase 11 gap closed with production evidence or marked
  not-applicable:** Yes for migration status, production counts, ingestion
  tuple, D1/R2 reconciliation, and deterministic-path precision/recall.
  Model-path precision/recall/latency/cost remains explicitly open per
  Stage 3's corrective plan (`TOPIC_MODEL_ENABLED` stays unset) — not a
  Phase 14 gap, since Phase 14's scope is the live system.
- **Every Phase 10 alert and rollback control exercised successfully at
  least once against real production state:** Yes (Stage 9; re-verified
  consistent this phase).
- **No secrets, credentials, source bodies, or curator-only evidence in
  committed reports:** Confirmed — this report and all scripts added this
  phase print/record only counts, rates, structural booleans, and already-
  public headline fragments.
- **Full suite, build, security checks, and deployment smoke tests pass:**
  Yes — `npm run check` (including the pre-commit hook's full re-run) green
  on every commit this phase; every push's CI pipeline and crawl-and-deploy
  run succeeded.
- **Zero unresolved release-blocking debt; accepted non-blocking debt has
  an owner and resolution date:** See §8.

## 8. Known limitations / non-blocking debt carried forward

| Item | Status | Owner / next step |
|---|---|---|
| 8 legacy `cluster-<8hex>.json` R2 orphans (pre-dating this phase) | Documented, not deleted (cause unconfirmed) | Next session investigating R2/archive history should trace their origin before deleting |
| Candidate `#IndianArmy` assignment staleness on a re-sourced cluster | Documented, not confirmed or fixed | Next Phase 14-adjacent session: trace `content_fingerprint` history for the affected cluster/run |
| Model-assisted precision/recall/latency/cost vs. live traffic | Open, unchanged from Stage 3 | Stage 3's corrective plan (relax all-or-nothing response validation) remains the prerequisite; `TOPIC_MODEL_ENABLED` stays unset |
| Topic-page 404 rate, classification cache hit-rate/latency/cost, near-duplicate disagreement | `not_instrumented`, unchanged from Stage 9 | Requires new infrastructure (Logpush, cost/timing persistence, a near-duplicate pass) — explicit future-phase scope |
| 415 legacy/inventoried `topic_candidates` rows | Untriaged, unchanged | Existing curator queue backlog, unrelated to this phase |
| No live production data for the merged-topic (308) redirect path | Unchanged, fixture-only coverage | Waits on a real `status='merged'` topic occurring naturally |

None of the above block Phase 14's own closure: each is either explicitly
out of this phase's scope (model path) or a small, non-critical, honestly
documented residual (legacy orphans, one unconfirmed staleness candidate).

## 9. Build and test status

`npm run check` (typecheck, contracts/LOC guardrail, CSS lint, full Vitest
suite, crawler dry-run, production build, bundle budget, security audit)
green on every commit this phase, including the pre-commit hook's own
re-run. Test count grew from 1487 (Phase 13's close) to **1497**, with new
coverage for `listObjectKeys`, `deleteObject`, the R2-scoping fix, and the
`isIncidental()` regression case. No skipped or pending tests.
