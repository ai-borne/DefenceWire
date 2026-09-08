# Intelligence Knowledge Base Pipeline: Info to Structured Knowledge

## 1. Core Mental Model

DefenceWire operates on a continuous, compounding pipeline that converts ephemeral 72-hour wire reports into an institutional, long-arc defence intelligence knowledge base.

```
+-----------------------------------------------------------------------------------+
| RAW WIRE INGESTION (RSS, ATOM, PIB, Press Releases, Curator Ingest)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| CLUSTERING & SSB EXTRACTION (clusterEngine.ts, rankingEngine.ts)                  |
| - De-duplication, entity extraction, defence tech takeaway, whyItMatters          |
+-----------------------------------------------------------------------------------+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
+---------------------------+                             +-------------------------+
| TEMPORAL STORY THREADING  |                             | SEMANTIC GRAPH ENGINE   |
| (threadContinuityEngine)  |                             | (tripletExtractor.ts)   |
| - Canonical Entity Match  |                             | - Stop-Node Filtering   |
| - Jaccard Similarity      |                             | - Relational Predicates |
| - Git-style x1.1.1 Arcs   |                             | - Epistemic Truth State |
| - Key Delta Synthesis     |                             | - Weight Incrementing   |
+---------------------------+                             +-------------------------+
            |                                                         |
            v                                                         v
    [story_threads]                                             [graph_nodes]
  [story_thread_events]                                         [graph_edges]
            |                                                         |
            +----------------------------+----------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| EMERGENT PATTERN SYNTHESIZER (patternDetector.ts, patternSynthesizer.ts)          |
| - Spatiotemporal & graph density clustering across independent storylines         |
| - Dual-tier hypothesis synthesis (Gemini Flash -> Workers AI -> Heuristic)        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
                                [emergent_patterns]
                                         |
                 +-----------------------+-----------------------+
                 |                                               |
                 v                                               v
+---------------------------------+             +-----------------------------------+
| CURATOR DESK (Human-in-the-Loop)|             | PUBLIC CONSUMPTION INTERFACES     |
| - Pattern Review & Promotion    |             | - Story Threads Tab (Timeline)    |
| - Knowledge Base D1 Table Audit |             | - Intel Graph Tab (Canvas Engine) |
| - Overrides & Tombstones        |             | - Public Situational Banner       |
+---------------------------------+             +-----------------------------------+
```

---

## 2. Ingestion & Clustering (Entry Point)

* **Entry Point**: `crawler/ingest.ts`
* **Trigger**: Scheduled hourly GitHub Actions run or ad-hoc ingestion (`functions/api/curator/ingest.ts`).

### Process:
1. **Fetch & Normalize**: Ingests articles across registered feeds (MoD PIB, service releases, OSINT sources).
2. **Cluster Formation** (`clusterEngine.ts`): Groups related articles across sources within a 72-hour rolling window into a single `StoryCluster`.
3. **Structured Enrichment**: Extracts entities, assigns categories (`airforce`, `navy`, `army`, `tech`, `strategic`, `procurement`), and generates an SSB brief:
   - `whyItMatters`: Concrete tactical or geopolitical impact.
   - `defenceTechTakeaway`: Platform specifications, suppliers, and capabilities.

---

## 3. Pillar 1: Temporal Story Threading (Evolutionary Arcs)

* **Engine**: `crawler/threadContinuityEngine.ts`
* **Sync Layer**: `crawler/threadSync.ts`
* **Storage**: Cloudflare D1 tables `story_threads` and `story_thread_events`

### How It Works:
1. **Canonical Entity Identification**:
   - Inspects `cluster.programTags`, `cluster.ssbIntel.defenceTechTakeaway.platformOrSystem`, and `cluster.entities`.
   - Normalizes candidates into standardized slugs (e.g., `tejas-mk1a`, `s400-triumf`, `netra-aewc`).
2. **Thread Matching (`scoreMatch`)**:
   - Computes intersection and Jaccard similarity between the cluster's normalized entities and existing threads in D1.
   - A score $\ge 0.35$ attaches the cluster to an existing thread. Otherwise, a new thread is spawned with deterministic slug `th_<entity-slug>`.
3. **Chronological Sorting & Git-Style Indexing (`sortAndIndexEvents`)**:
   - Out-of-order crawls are sorted by the verified publish timestamp (`publishedAt`).
   - Sequence codes are assigned deterministically:
     - Initial report: `x1.1.1`
     - Subsequent updates: `x1.1.2`, `x1.1.3`
     - Program split / branch: `x1.2.1`
4. **Key Delta Extraction**:
   - Extracts the delta summary from `cluster.ssbIntel.whyItMatters` or snippet, capturing what changed in this specific event relative to the overall program.
5. **Lifecycle State Machine**:
   - `active`: Received an event update within the last 60 days.
   - `dormant`: No updates for $\ge 60$ days. Reactivates to `active` automatically when a matching story occurs.
   - `concluded`: Explicitly marked by curator or project completion.

---

## 4. Pillar 2: Semantic Knowledge Graph & Epistemic Triples

* **Extractor**: `crawler/tripletExtractor.ts`
* **Stop-Node Filtering**: `crawler/graphStopNodes.ts`
* **Sync Layer**: `crawler/graphSync.ts`
* **Storage**: Cloudflare D1 tables `graph_nodes` and `graph_edges`

### How It Works:
1. **Stop-Node Suppression**:
   - General terms like `"India"`, `"Indian Army"`, `"Ministry of Defence"`, and `"Government"` are suppressed by `isGraphStopNode()`. This prevents giant, uninformative super-hubs from creating graph hairballs.
2. **Predicate & Direction Inference**:
   - Scans text for candidate entities and correlates them with recognized action patterns:
     - `DEPLOYED_TO`: Platform stationed at a location or facility (e.g., `Su-30MKI` $\to$ `Andaman & Nicobar`).
     - `TESTED_AT`: System evaluated at a range (e.g., `BrahMos` $\to$ `ITR Chandipur`).
     - `PROCURES`: Service branch or DAC ordering a system.
     - `DEVELOPED_BY`: System linked to design agency/DPSU (e.g., `DRDO`, `HAL`).
     - `TARGETS` / `ENGAGED_WITH` / `SUPPLIES` / `INTERCEPTED`.
3. **Epistemic Truth State Detection (`detectEpistemicState`)**:
   - `CONFIRMED`: Official announcement, formal clearance, delivered unit.
   - `CONTESTED`: Conflicting claims, unverified leak, speculation.
   - `SUPERSEDED`: Updated contract value, altered delivery target, revised order.
   - `DISPUTED`: Official denial, conflicting ministry statement.
   - `RETRACTED`: Published report withdrawn or clarified false.
4. **Graph Upsert & Compounding Weights**:
   - If an edge already exists, its `weight` increments (`weight = weight + 1.0`), its `last_observed_at` timestamp updates, and the connected nodes' degree centralities are recalculated.

---

## 5. Pillar 3: Emergent Pattern & Hypothesis Synthesizer

* **Detector**: `crawler/patternDetector.ts`
* **Synthesizer**: `crawler/patternSynthesizer.ts`
* **Sync Layer**: `crawler/patternSync.ts`
* **Storage**: Cloudflare D1 table `emergent_patterns`

### How It Works:
1. **Spatiotemporal Graph Clustering**:
   - Evaluates dense subgraphs formed by events occurring within a rolling 72-hour window.
   - Example: A drone sighting in Pathankot + counter-UAS procurement approval + L-70 deployment.
2. **Situational Assessment Synthesis**:
   - Generates a 2-sentence intelligence assessment highlighting the cross-track convergence.
   - Execution hierarchy:
     1. **Primary**: Gemini Flash Free Tier API
     2. **Fallback 1**: Cloudflare Workers AI (`@cf/meta/llama-3-8b-instruct`)
     3. **Fallback 2**: Deterministic template heuristic (no external API dependence)
3. **Curator Review Workflow**:
   - Generated patterns are saved with `status = 'draft'`.
   - Curators inspect drafts in the Curator's Desk (`src/components/editor/PatternReviewView.ts`).
   - Approving a pattern updates `status = 'approved'`, instantly publishing it to the public Situational Matrix banner on the homepage.

---

## 6. Edge API & Consumption Architecture

All graph and thread data is served at the edge using Cloudflare Pages Functions with rate-limiting and CDN edge caching:

| Endpoint | Method | Backend Handler | Description |
| :--- | :--- | :--- | :--- |
| `/api/threads/list` | `GET` | `threadHandler.ts` | Filterable list of story threads with status, pagination, and search. |
| `/api/threads/[id]` | `GET` | `threadHandler.ts` | Complete chronological event evolution branch for a thread. |
| `/api/graph/subgraph` | `GET` | `graphQueryHandler.ts` | 1-hop / 2-hop graph neighborhood traversal with date bounds and filters. |
| `/api/curator/patterns` | `GET/POST` | `curatorPatternHandler.ts` | Review, approve, edit, or reject emergent pattern candidates. |
| `/api/curator/knowledge-base`| `GET` | `curatorKnowledgeBaseHandler.ts`| Read-only paginated table viewer for all underlying D1 data. |

### Frontend UI Components:
* **Story Threads View** (`src/components/threads/ThreadExplorerView.ts`):
  - Two-column responsive layout: Master list on the left, chronological git-commit branch on the right.
  - Rendered via `ThreadTimelineCard.ts` showing sequence badges, source attribution, and synthesized delta boxes.
* **Intel Graph View** (`src/components/graph/KnowledgeGraphView.ts`):
  - 60fps micro-canvas force simulation (`KnowledgeGraphCanvas.ts`, `forceSimulation.ts`) using custom Euler/Verlet spring mechanics with zero third-party dependencies (< 4 KB gzip).
  - Time scrubber (`TimeScrubber.ts`) to scrub through historical dates and observe graph evolution.
  - Inspector sidebar detailing degree centrality, epistemic states, and 2-hop linkages.
* **Public Pattern Banner** (`src/components/patterns/PublicPatternBanner.ts`):
  - Mounted atop the front page to surface approved emergent situational assessments.

---

## 7. Database Schema Reference (`d1/schema.sql`)

```sql
-- Story Threads
CREATE TABLE IF NOT EXISTS story_threads (
  id TEXT PRIMARY KEY,             -- deterministic slug, e.g. 'th_lca-tejas-mk1a'
  title TEXT NOT NULL,
  canonical_entity TEXT NOT NULL,
  category TEXT NOT NULL,         -- 'airforce' | 'navy' | 'army' | 'tech' | 'strategic' | 'procurement'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'dormant' | 'concluded'
  event_count INTEGER NOT NULL DEFAULT 1,
  first_event_at TEXT NOT NULL,
  last_event_at TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Story Thread Events (Milestones)
CREATE TABLE IF NOT EXISTS story_thread_events (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  sequence_code TEXT NOT NULL,     -- e.g. 'x1.1.1', 'x1.1.2'
  sequence_index INTEGER NOT NULL,
  headline TEXT NOT NULL,
  delta_summary TEXT NOT NULL,
  primary_source_name TEXT NOT NULL,
  primary_source_url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  entities TEXT NOT NULL,          -- JSON array of strings
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES story_threads(id) ON DELETE CASCADE
);

-- Graph Nodes
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,             -- normalized slug, e.g. 'node_su-30mki'
  label TEXT NOT NULL,
  category TEXT NOT NULL,         -- 'platform' | 'threat' | 'facility' | 'location' | 'organization' | 'program'
  mention_count INTEGER NOT NULL DEFAULT 1,
  degree INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  metadata_json TEXT
);

-- Graph Directed Edges
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,             -- deterministic: 'edge_${source}_${pred}_${target}'
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  predicate TEXT NOT NULL,         -- 'DEPLOYED_TO' | 'TESTED_AT' | 'PROCURES' | etc.
  epistemic_state TEXT NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED' | 'CONTESTED' | 'SUPERSEDED' | 'DISPUTED' | 'RETRACTED'
  weight REAL NOT NULL DEFAULT 1.0,
  cluster_id TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  source_url TEXT NOT NULL,
  context_snippet TEXT,
  FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

-- Emergent Patterns
CREATE TABLE IF NOT EXISTS emergent_patterns (
  id TEXT PRIMARY KEY,             -- deterministic slug, e.g. 'pat_delhi_air_defence'
  title TEXT NOT NULL,
  synthesis TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  node_ids_json TEXT NOT NULL,      -- JSON array of graph_nodes(id)
  cluster_ids_json TEXT NOT NULL,   -- JSON array of StoryCluster(id)
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'rejected'
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT
);
```

---

## 8. Hard Invariants & Rules for Developers

1. **Strict Line Limit ($\le 300$ LOC)**: Every module must stay under 300 lines of code. Split logic across services, query builders, and view models.
2. **Zero Inlined Resources**:
   - Copy: Centralize in dedicated resource files (`src/resources/threadStrings.ts`, `graphStrings.ts`, `patternStrings.ts`).
   - Colors: Centralize in `src/resources/colors.ts` and CSS variables. Never hardcode hex colors in component code.
3. **Non-Blocking Crawl Execution**:
   - Failures in thread matching, graph triplet extraction, or pattern synthesis must **never** break or abort the core news feed crawl in `crawler/ingest.ts`. All sync operations use non-fatal error boundaries.
4. **Strict SQL Parameterization**:
   - Every D1 statement must use parameterized `?` bindings via `queryBuilder` utilities. Direct string interpolation in SQL is strictly forbidden.
5. **Client Performance & Bundle Budget**:
   - The force-directed graph canvas and thread explorer views must remain lazy-loaded via `createLazyViewModelLoader` so the main homepage bundle remains under the budget cap (< 100 KB gzip).
