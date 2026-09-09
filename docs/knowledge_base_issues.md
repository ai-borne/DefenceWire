# Knowledge Base — Open Issues & Fix Plan

Tracks the gaps between the pipeline described in `docs/knowledge_base_pipeline.md` and current behavior. Work through items one at a time — mark status as we go.

Legend: `[ ]` open · `[~]` in progress · `[x]` done

---

## Issue 1 — Same story, different hashtags across publications

**Status:** `[ ]` open

**Symptom:** Similar/duplicate stories from different publications appear in the feed with different hashtags instead of sharing one canonical tag.

**Root cause:** This is a clustering gap, not a hashtag gap. Hashtag/tag synthesis happens strictly per `StoryCluster` (`src/engine/clusterEngine.ts:255-264`, `crawler/tagAdjudicator.ts:112-153`), with no reconciliation across clusters. Clustering itself (`src/engine/clusterEngine.ts:63-112`, `areStoriesSimilar`) uses tiered Jaccard title-token similarity (thresholds 0.05–0.32 depending on shared platform/entity signals) with greedy single-linkage grouping. If two publications' headlines are paraphrased enough to miss the threshold, they land in separate clusters — each cluster then runs its own independent Tier1→2→3 tag cascade and can legitimately settle on a different `primaryTag` for the same real-world event. `canonicalizeTag` (`src/utils/hashtagUtils.ts:98-105`) itself is algorithmic and fine — the break is one layer upstream.

**Proposed fix:** Add a low-cost post-hoc merge pass after tagging — compare independently-tagged clusters within a tight time window; if two resolve to the same canonical entity/primaryTag, merge their hashtag sets and thread linkage retroactively rather than re-running clustering.

**Tradeoffs:** Requires a new merge step + dedup key (avoid double-counting in threads/graph once merged). Doesn't fix mis-clustering itself, just its downstream symptom — acceptable given clustering thresholds are tuned deliberately to avoid false merges.

---

## Issue 2 — Regex-based SSOT vs. LLM generalization to new entities

**Status:** `[ ]` open

**Symptom:** Perceived tradeoff between a regex/dictionary approach (stable but blind to new entities) and the LLM cascade (generalizes but is less consistent).

**Root cause:** False dichotomy in the current design. `hashtagUtils.ts` normalization is already algorithmic (title-casing, acronym table, letter/digit boundary splitting), not a rigid lookup table. The real gap: there is no **durable canonical-entity resolution table**. Each cluster resolves its tag fresh via the Tier1-3 cascade with no memory of prior resolutions — so the same real-world entity can be independently "discovered" and canonicalized slightly differently across separate cascade runs. `story_threads.fingerprint_json` already does something structurally similar for thread-matching, but that mechanism isn't reused for tag canonicalization itself.

**Proposed fix:** Introduce a D1 canonical-entity table. Cascade checks it first (exact match, then fuzzy/alias match) before minting a new canonical tag. Regex/dictionary becomes the fast-path cache for known entities; the LLM cascade is only invoked for genuinely new entities, and its resolution gets written back into the table (self-learning SSOT).

**Tradeoffs:** New table + read/write path in the crawl hot path (must stay non-blocking per architectural invariant #3). Needs a fuzzy-match strategy (edit distance / embedding) — pick the cheapest one that's good enough before reaching for embeddings.

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

1. Issue 3 (archival/threading) — actively breaks the stated KB purpose today.
2. Issue 2 (canonical-entity table) — foundational; Issue 1's merge pass benefits from it existing first.
3. Issue 1 (cross-cluster tag merge) — layer on top of Issue 2's canonical table.
