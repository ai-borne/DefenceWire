# Knowledge Base — Open Issues & Fix Plan

Tracks the gaps between the pipeline described in `docs/knowledge_base_pipeline.md` and current behavior. Work through items one at a time — mark status as we go.

Legend: `[ ]` open · `[~]` in progress · `[x]` done

---

## Issue 1 — Same story, different hashtags across publications

**Status:** `[x]` done — implemented and tested

**Symptom:** Similar/duplicate stories from different publications appear in the feed with different hashtags instead of sharing one canonical tag.

**Root cause:** This is a clustering gap, not a hashtag gap. Hashtag/tag synthesis happens strictly per `StoryCluster` (`src/engine/clusterEngine.ts:255-264`, `crawler/tagAdjudicator.ts:112-153`), with no reconciliation across clusters. Clustering itself (`src/engine/clusterEngine.ts:63-112`, `areStoriesSimilar`) uses tiered Jaccard title-token similarity (thresholds 0.05–0.32 depending on shared platform/entity signals) with greedy single-linkage grouping. If two publications' headlines are paraphrased enough to miss the threshold, they land in separate clusters — each cluster then runs its own independent Tier1→2→3 tag cascade and can legitimately settle on a different `primaryTag` for the same real-world event. `canonicalizeTag` (`src/utils/hashtagUtils.ts:98-105`) itself is algorithmic and fine — the break is one layer upstream.

**Proposed fix:** Add a low-cost post-hoc merge pass after tagging — compare independently-tagged clusters within a tight time window; if two resolve to the same canonical entity/primaryTag, merge their hashtag sets and thread linkage retroactively rather than re-running clustering.

**Tradeoffs:** Requires a new merge step + dedup key (avoid double-counting in threads/graph once merged). Doesn't fix mis-clustering itself, just its downstream symptom — acceptable given clustering thresholds are tuned deliberately to avoid false merges.

**Implementation:** New `crawler/clusterTagMerge.ts`, run once per crawl after the per-cluster Tier0-3 tag screening loop and before `syncCanonicalRegistryToD1` (`crawler/ingest.ts`):

- `groupClustersForMerge` (pure) — resolves each cluster's `primaryTag` to a merge key: the durable canonical registry's record id (issue #2's `resolveCanonicalTag`, exact-or-fuzzy) when it hits, otherwise the tag's own slug as a self-key so exact-string duplicates still merge with no registry entry. Clusters sharing a key are then greedily chained by `primarySource.publishedAt` into a new, tighter `TAG_MERGE_WINDOW_HOURS = 12` window (deliberately stricter than clustering's own 48h window — cross-cluster merges are a riskier operation than within-cluster grouping).
- `mergeClusterGroup` (pure) — unions every member's `hashtags[]` (deduped by `hashtagToSlug`) and rewrites every member's `primaryTag` to one winning tag: the canonical registry's tag when the group resolved via a registry hit, else the earliest-published member's own tag.
- `mergeDuplicateClusterTags` — orchestrates both, and calls `recordCanonicalResolution` (reused from `crawler/canonicalEntityResolver.ts`) for any cluster whose `primaryTag` actually changed, so the alignment is written back into the same self-learning registry issue #2 built — future runs converge on the first pass instead of relying on this merge pass every time. Non-fatal: a failure logs loudly and returns clusters/registry unchanged.
- Tests: `tests/unit/clusterTagMerge.test.ts` (grouping, merging, orchestration, non-mutation, window/no-match boundaries).

**Known gaps / follow-ups (Rule 12 — surfaced, not silently dropped):**

- Only catches duplicates whose independently-resolved `primaryTag` strings are either identical or clear the canonical registry's 0.6 fuzzy-token threshold. Two clusters that are genuinely the same event but whose Tier1-3 cascades minted semantically-equivalent-but-lexically-distant tags in the *same* run (e.g. both novel, no registry entry yet, low token overlap) are not caught — closing that gap would mean comparing headline/entity similarity across clusters, which is explicitly out of scope (the issue's proposed fix rules out re-running clustering).
- No retroactive backfill for threads/events already synced to D1 before this pass existed, or for archived clusters whose sibling was tagged differently in a prior run — this pass only reconciles clusters within the same crawl invocation. If cross-cluster tag drift is found in already-threaded historical data, a Part-B-style backfill (mirroring issue #3's `threadBackfill.ts`) would be the next step.
- Shares issue #2's unvalidated 0.6 fuzzy-match threshold and 500-entity registry window — see issue #2's own follow-ups for those caveats; this pass inherits them rather than introducing new ones.
- `mergeClusterGroup`'s "winning tag" choice (registry tag, else earliest-published member) is a simple deterministic tiebreak, not a quality judgment — it does not, for example, prefer the tag with richer `ssbIntel` context.

---

## Issue 2 — Regex-based SSOT vs. LLM generalization to new entities

**Status:** `[x]` done — implemented and tested

**Symptom:** Perceived tradeoff between a regex/dictionary approach (stable but blind to new entities) and the LLM cascade (generalizes but is less consistent).

**Root cause:** False dichotomy in the current design. `hashtagUtils.ts` normalization is already algorithmic (title-casing, acronym table, letter/digit boundary splitting), not a rigid lookup table. The real gap: there is no **durable canonical-entity resolution table**. Each cluster resolves its tag fresh via the Tier1-3 cascade with no memory of prior resolutions — so the same real-world entity can be independently "discovered" and canonicalized slightly differently across separate cascade runs. `story_threads.fingerprint_json` already does something structurally similar for thread-matching, but that mechanism isn't reused for tag canonicalization itself.

**Proposed fix:** Introduce a D1 canonical-entity table. Cascade checks it first (exact match, then fuzzy/alias match) before minting a new canonical tag. Regex/dictionary becomes the fast-path cache for known entities; the LLM cascade is only invoked for genuinely new entities, and its resolution gets written back into the table (self-learning SSOT).

**Tradeoffs:** New table + read/write path in the crawl hot path (must stay non-blocking per architectural invariant #3). Needs a fuzzy-match strategy (edit distance / embedding) — pick the cheapest one that's good enough before reaching for embeddings.

**Implementation:** New `canonical_entities` D1 table (`d1/schema.sql`), checked by a genuine Tier 0 step ahead of the existing Tier1-3 cascade:

- `crawler/canonicalEntityResolver.ts` — `resolveCanonicalTag` (pure: exact slug/alias match, then fuzzy token-Jaccard match at a conservative 0.6 threshold, reusing `computeJaccardSimilarity` from `src/engine/clusterEngine.ts` — no embeddings needed), `recordCanonicalResolution` (pure, functional write-back with alias learning), `fetchCanonicalRegistry`/`syncCanonicalRegistryToD1` (one bounded D1 read + one write per crawl run, not per cluster, via the shared `executeD1Query`), and the per-cluster orchestrator `screenClusterTagsWithCanonicalLearning` wired into `crawler/ingest.ts`.
- `crawler/tagAdjudicator.ts` was split: it now holds only the pure Tier1-3 `adjudicateCandidateTag` cascade (back under its own documented 120 LOC budget). The orchestration function `screenClusterTags` moved to a new `crawler/tagScreening.ts`, which gained one optional `resolveCanonical` parameter — a canonical hit is used directly as the final `primaryTag`, skipping Tiers 1-3 (including the paid/rate-limited Tier 3 Cloudflare AI dispatch) entirely for entities already known to the table.
- Tests: `tests/unit/canonicalEntityResolver.test.ts`, `tests/unit/tagScreening.test.ts`; `tests/unit/tagAdjudicator.test.ts` unaffected (tests only the untouched cascade).

**Known gaps / follow-ups (Rule 12 — surfaced, not silently dropped):**

- Scope: only `cluster.primaryTag` is resolved through the canonical table. `cluster.hashtags[]` entries still run the per-cluster Tier1-3 cascade independently with no canonical short-circuit — a deliberate MVP scope cut (primaryTag is the identity-bearing tag referenced throughout Issues 1 & 2), not an oversight, but worth revisiting if hashtag drift across a single cluster's own tag list turns out to matter in practice.
- **Deployment step: done.** `d1/schema.sql`'s `canonical_entities` table has been applied to the remote D1 database (`defencewire-archive`, account `97697a2b...`) via `wrangler d1 execute --remote --file=d1/schema.sql` and confirmed present (`sqlite_master` lookup). `fetchCanonicalRegistry`/`syncCanonicalRegistryToD1` are live as of the next crawl run — no longer no-op'ing.
- The registry fetch is bounded to the 500 most-recently-seen entities per run (same bounded-window tradeoff `discovered_entities`/`story_threads` already accept) — an entity untouched for a very long time could theoretically age out of a single run's in-memory lookup and re-mint before falling back into the window. Not expected to matter in practice given crawl frequency, but worth knowing if canonical drift is ever reported for a long-dormant entity.
- The 0.6 fuzzy-match threshold is a reasoned-but-unvalidated starting point (no historical mis-tagging corpus to tune against yet). If Issue 1's cross-cluster merge pass surfaces false merges or missed merges, this threshold is the first place to look.
- Issue 1 (the cross-cluster hashtag merge pass) has since been implemented on top of this table — see its entry above.

---

## Issue 3 — Archived articles disappear from hashtag/thread feed

**Status:** `[x]` done — implemented and tested

**Symptom:** Clicking a hashtag only shows articles currently in the live news feed; once an article is archived, it drops out of that hashtag's timeline — defeating the point of a knowledge base.

**Root cause:** Confirmed **not** a data-deletion bug — `crawler/archiveSync.ts` only writes/deletes rows in `archived_stories`/`archived_stories_fts`; it never touches `story_threads`/`story_thread_events`, so existing thread events survive archival untouched. The actual gap: `crawler/threadContinuityEngine.ts:137-251` (`matchAndAdvanceThreads`) only advances threads for clusters present in the **current live crawl batch**. A cluster that ages out of the live feed (and is later archived) before ever being matched into a thread is never retroactively threaded — nothing re-scans the archive for unthreaded clusters. The "Compiling chronological intelligence arc..." modal state (`ThreadDetailModal.ts`, on a 404 from `functions/api/threads/[id].ts`) is the graceful rendering of this gap — indistinguishable in the UI from a real pipeline miss.

**Proposed fix:** Decouple thread-matching from "current crawl batch only." Run (or periodically re-run) `threadContinuityEngine` against archived-but-unthreaded clusters as well, so nothing that ages out of the live feed silently skips threading.

**Tradeoffs:** This is the one with real KB-integrity stakes — prioritize first. Needs a way to identify "unthreaded" clusters efficiently (a flag or a join against `story_thread_events.cluster_id`) to avoid re-scanning the entire archive on every run.

**Agreed plan (two parts, both run every crawl invocation):**

- **Part A — close the gap at archival time.** `crawler/ingest.ts` already computes which clusters are popping out of the live feed this run (`findClustersToArchive`, used inside `archivePoppedClusters`). Expose that list back to `ingest.ts` and fold it into the batch passed to `runThreadContinuity` (`crawler/threadSync.ts`), so a cluster gets one last threading pass in the same run it leaves the live feed, before archival. No new reads needed.
- **Part B — backfill already-orphaned archived clusters.** New `crawler/threadBackfill.ts`, called from `ingest.ts` as a non-fatal step every run:
  1. Query D1: `archived_stories LEFT JOIN story_thread_events ON archived_stories.id = story_thread_events.cluster_id WHERE story_thread_events.cluster_id IS NULL ORDER BY archived_at DESC LIMIT 25` (uses the existing `idx_story_thread_events_cluster` index — no schema change).
  2. Fetch each row's `cluster_json` from R2 via a new `getClusterJson` in `crawler/r2ArchiveStore.ts` (only `putClusterJson` exists today).
  3. Reconstruct `StoryCluster[]`, run through `matchAndAdvanceThreads` against existing threads/events, sync via the existing `syncThreadsToD1`.
  4. Small batch size keeps it bounded/non-blocking per the crawler's architectural invariant; failures log loudly (Rule 12) rather than skip silently.

Part A prevents new orphans going forward; Part B self-drains the existing backlog over successive runs (~25/run) without a separate manual script.

---

## Suggested order

1. Issue 3 (archival/threading) — actively breaks the stated KB purpose today. `[x]` done
2. Issue 2 (canonical-entity table) — foundational; Issue 1's merge pass benefits from it existing first. `[x]` done
3. Issue 1 (cross-cluster tag merge) — layer on top of Issue 2's canonical table. `[x]` done

All three tracked issues are implemented and tested as of this session.

---

## Sprint wrap-up — carried-forward gaps (Rule 12 — fail loud)

A deep pass across all three issues after Issue 1 landed. Nothing below was silently dropped; each is a deliberate scope cut already called out in its issue's own "Known gaps" section, restated here in one place per Rule 12 so nothing needs to be re-discovered from scratch:

- **Deployment step still required for issue #2/#1's shared table:** `d1/schema.sql`'s `canonical_entities` table must be applied to the remote D1 database (`npx wrangler d1 execute defencewire-archive --remote --file=d1/schema.sql`) before the next crawl run picks up either issue's fix. Until then, both issue #2's Tier 0 short-circuit and issue #1's merge pass still run (they degrade gracefully to self-key/no-op behavior) but provide zero cross-run benefit.
- **`cluster.hashtags[]` secondary tags** (as opposed to `primaryTag`) still run the per-cluster Tier1-3 cascade with no canonical short-circuit of their own — issue #1's merge pass unions them post-hoc *within a merge group*, but a cluster with no merge partner still mints hashtags independently every run.
- **No historical backfill**: issue #1's merge pass and issue #2's canonical table both only affect clusters processed from this point forward. Already-synced threads/tags from before this session are not retroactively reconciled — only issue #3 has a dedicated backfill (`threadBackfill.ts`) for its specific gap (orphaned archived clusters).
- **Unvalidated fuzzy threshold**: the 0.6 token-Jaccard threshold (`crawler/canonicalEntityResolver.ts`) is shared by issue #2's Tier 0 lookup and issue #1's merge-key resolution. It's a reasoned starting point, not tuned against a mis-tagging corpus — first place to look if either issue's merges are ever reported as too aggressive or too conservative.
- **`d1/schema.sql`'s `canonical_entities` table has no automated migration test** verifying it applies cleanly against a real remote D1 instance — verified only by local logic/unit tests (registry read/write functions), not an actual `wrangler d1 execute` dry run in CI.
