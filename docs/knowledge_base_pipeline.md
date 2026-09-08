# Living Hashtag Knowledge Base & Compounding Intelligence Pipeline

## 1. Core Mental Model & Strategic MOAT

DefenceWire operates on a continuous, compounding pipeline that converts ephemeral, 24-to-72-hour wire reports into an institutional, long-arc defence intelligence knowledge base.

Standard news aggregators and social feeds treat defense news as disposable streams. DefenceWire's **MOAT (Defensible Competitive Advantage)** is created by an autonomous, multi-layered pipeline:
1. **Dynamic Entity & Hashtag Ingestion**: Automatically detects, extracts, and canonicalizes sovereign platforms, tenders, operational theaters, and programs (`#DACClearance`, `#LAC`, `#HIMARS`, `#Su57`, `#TASL`).
2. **Autonomous Chronological Lineage (Story Threads)**: Builds multi-month, git-style evolutionary arcs in Cloudflare D1 with delta summaries and milestone tracking.
3. **Semantic Knowledge Graph**: Ingests relational triplets with epistemic truth states (`CONFIRMED`, `DISPUTED`, `SUPERSEDED`, `RETRACTED`), linking platforms, facilities, locations, and threats.
4. **Cross-Thread Pattern Synthesis**: Detects systemic multi-domain convergences across seemingly isolated news events.

```
+-----------------------------------------------------------------------------------+
| RAW WIRE INGESTION (RSS, ATOM, PIB, Press Releases, Curator Ingest)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| DUAL-ENGINE HARVESTING & AI ENRICHMENT                                            |
| 1. Feed Extractor (feedTagExtractor.ts): Extracts <category>, <dc:subject>, #tags |
| 2. LLM Ingestion (summarizerPrompt.ts): Structured output for primaryTag, hashtags|
| 3. AI Salvage (geminiSalvage.ts): Sanitizes & preserves tags on validation retry  |
| 4. Noise Filter (hashtagUtils.ts): Drops #News, #India, #Defence, #Security       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| CLUSTERING & CANONICAL SSOT (clusterEngine.ts, hashtagUtils.ts)                   |
| - Consolidates source items into StoryCluster (cluster.hashtags, primaryTag)      |
| - Normalizes variants: #Su57 / Su-57 -> canonical "Su-57", slug "th_su-57"        |
+-----------------------------------------------------------------------------------+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
+---------------------------+                             +-------------------------+
| TEMPORAL STORY THREADING  |                             | SEMANTIC GRAPH ENGINE   |
| (threadContinuityEngine)  |                             | (tripletExtractor.ts)   |
| - Matches existing thread |                             | - Graph Stop-Nodes      |
|   or spawns dynamic arc   |                             | - Relational Predicates |
| - Git-style x1.1.1 Arcs   |                             |   (DEPLOYED_TO, etc.)   |
| - Jaccard Similarity (0.35|                             | - Epistemic Truth State |
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
| - Pattern Review & Promotion    |             | - Card Hashtag Badges (#Tag)      |
| - Knowledge Base D1 Table Audit |             | - Story Threads Tab (Timeline)    |
| - Overrides & Tombstones        |             | - Thread Detail Modal             |
+---------------------------------+             | - Intel Graph Tab (Canvas Engine) |
                                                | - Public Situational Banner       |
                                                +-----------------------------------+
```

---

## 2. Ingestion, Hashtag Extraction & Noise Suppression

* **Primary Modules**:
  - `crawler/feedTagExtractor.ts`: Parses XML feeds for `<category>`, `<dc:subject>`, and inline `#hashtag` occurrences.
  - `crawler/summarizerPrompt.ts`: Guides Gemini to return structured `primaryTag` and `hashtags` properties.
  - `crawler/geminiSalvage.ts`: Sanitizes Gemini structured output, drops invalid entries, and enforces clean `#Tag` tokens.
  - `src/utils/hashtagUtils.ts`: SSOT for noise tag filtering, slug generation, and canonical entity formatting.
  - `src/engine/clusterEngine.ts`: Aggregates feed tags across clustered articles into `cluster.hashtags` and `cluster.primaryTag`.

### Noise Suppression & Stop-Tag Filtering (`isNoiseTag`)
To prevent feed polluters and generic labels from collapsing disparate stories into single meaningless threads (e.g. `th_news`, `th_defence`), generic keywords are filtered at ingestion:
- **Noise Blocklist**: `news`, `india`, `indian`, `defence`, `defense`, `security`, `update`, `updates`, `topnews`, `breakingnews`, `national`, `international`, `general`, `latest`, `article`, `articles`, `pressrelease`, `world`, `asia`, `mod`, `briefing`, `analysis`, `exclusive`.
- **Length Filter**: Any tag with normalized length $\le 1$ is immediately rejected.

### Canonical Normalization (`canonicalizeTag`, `hashtagToSlug`)
Unifies disparate naming conventions across feeds, news outlets, and user queries:
- `#Su57`, `Su-57`, `su57`, `th_su-57` $\rightarrow$ Canonical Entity: `Su-57`, Slug: `th_su-57`.
- `#INSSudarshini` $\rightarrow$ `INS-Sudarshini`, Slug: `th_ins-sudarshini`.
- `#EOS05` $\rightarrow$ `EOS-05`, Slug: `th_eos-05`.
- `#DACClearance`, `#DAC Clearance` $\rightarrow$ `DAC Clearance`, Slug: `th_dac-clearance`.

---

## 3. Pillar 1: Temporal Story Threading (Living Lineage Arcs)

* **Engine**: `crawler/threadContinuityEngine.ts`
* **Sync Layer**: `crawler/threadSync.ts`
* **Storage**: Cloudflare D1 tables `story_threads` and `story_thread_events`
* **Consumer**: `src/components/threads/ThreadDetailModal.ts` & `src/components/threads/ThreadExplorerView.ts`

### How It Works:
1. **Candidate Extraction (`extractCanonicalEntities`)**:
   - Inspects `cluster.primaryTag`, `cluster.hashtags`, `cluster.programTags`, `cluster.ssbIntel.defenceTechTakeaway.platformOrSystem`, and `cluster.entities`.
   - Filters candidates through `isNoiseTag()`.
2. **Thread Matching & Dynamic Creation (`scoreMatch`, `generateThreadTitle`)**:
   - Computes Jaccard similarity and exact entity overlaps against existing active/dormant D1 threads.
   - If Jaccard score $\ge 0.35$, links to existing thread.
   - If no match is found, **dynamically births a new thread** with domain-adaptive naming:
     - Procurement / Tenders: `"${displayEntity} Acquisition & Delivery Arc"`
     - Air Force / Army / Navy / Strategic: `"${displayEntity} Operational & Strategic Arc"`
     - Tech / Space: `"${displayEntity} Technology & Systems Arc"`
     - General / Geopolitics: `"${displayEntity} Intelligence & Strategic Arc"`
3. **Chronological Sorting & Git-Style Indexing (`sortAndIndexEvents`)**:
   - Events are sorted chronologically by `publishedAt`.
   - Milestone sequence codes:
     - First sighting: `x1.1.1`
     - Subsequent updates: `x1.1.2`, `x1.1.3`
     - Branch / Program split: `x1.2.1`
4. **Key Delta Extraction**:
   - Synthesizes what changed in the latest event relative to previous milestones.
5. **Lifecycle State Machine**:
   - `active`: Event observed within the last 60 days.
   - `dormant`: No event for $\ge 60$ days. Reactivates to `active` automatically when a new cluster matches.
   - `concluded`: Formally closed program or milestone sequence.

---

## 4. Pillar 2: Semantic Knowledge Graph & Epistemic Triples

* **Extractor**: `crawler/tripletExtractor.ts`
* **Stop-Node Filtering**: `crawler/graphStopNodes.ts`
* **Sync Layer**: `crawler/graphSync.ts`
* **Storage**: Cloudflare D1 tables `graph_nodes` and `graph_edges`
* **Consumer**: `src/components/graph/KnowledgeGraphView.ts` (Micro-Canvas Engine)

### How It Works:
1. **Stop-Node Suppression (`isGraphStopNode`)**:
   - High-frequency super-hubs (`"India"`, `"Indian Army"`, `"MoD"`, `"IAF"`, `"Government"`) are suppressed from the graph topology. This prevents unreadable combinatorial "hairballs" while preserving specific platforms (`Su-57`, `Akash-NG`, `HIMARS`), locations (`Ladakh`, `LAC`, `Chandipur`), and facilities.
2. **Hashtag & Entity Node Induction**:
   - Newly discovered hashtags (`cluster.hashtags`, `cluster.primaryTag`) automatically induce new active nodes in the Knowledge Graph.
3. **Relational Predicate Inference**:
   - `DEPLOYED_TO`: Platform moved to operational sector or location (e.g. `Su-30MKI` $\to$ `Ladakh`).
   - `TESTED_AT`: Platform fired or trialed at a testing facility (e.g. `BrahMos` $\to$ `ITR Chandipur`).
   - `PROCURES` / `SUPPLIES`: Acquisition Council (DAC), MoD, or foreign partner ordering/delivering a system.
   - `TARGETS`: Air defense or weapon system intercepting a threat (e.g. `Akash-NG` $\to$ `Drone Infiltration`).
   - `CONNECTED_TO`: Correlated platform, program, or operational linkage.
4. **Epistemic Truth State Machine (`detectEpistemicState`)**:
   - `CONFIRMED`: Official announcement, signed contract, verified test.
   - `CONTESTED`: Unconfirmed leaks, conflicting media claims, speculation.
   - `SUPERSEDED`: Contract order replaced, updated timeline, revised specs.
   - `DISPUTED`: Official ministry refutation, clarified false report.
   - `RETRACTED`: News publication withdrawn or retracted.
5. **Compounding Edge Weights & Auditing**:
   - Repeated co-occurrences increment edge weight (`weight += 1.0`).
   - `firstObservedAt` preserves original origin timestamp, while `lastObservedAt` tracks the latest intelligence signal.

---

## 5. Pillar 3: Emergent Pattern & Hypothesis Synthesizer

* **Detector**: `crawler/patternDetector.ts`
* **Synthesizer**: `crawler/patternSynthesizer.ts`
* **Sync Layer**: `crawler/patternSync.ts`
* **Storage**: Cloudflare D1 table `emergent_patterns`
* **Consumer**: `src/components/patterns/PublicPatternBanner.ts` & `src/components/editor/PatternReviewView.ts`

### How It Works:
1. **Cross-Story Convergence Detection**:
   - Evaluates spatiotemporal subgraphs across independent story clusters within a rolling 72-hour window.
   - Detects when multi-thread events correlate (e.g. border tensions at `#LAC` + rapid procurement at `#DACClearance` + OEM supplier contracts).
2. **Hypothesis Synthesis**:
   - Synthesizes a 2-sentence actionable intelligence briefing.
   - Free Tier Cascading Engine:
     1. **Primary**: Gemini Flash
     2. **Fallback 1**: Cloudflare Workers AI (`@cf/meta/llama-3-8b-instruct`)
     3. **Fallback 2**: Deterministic Template NLP Heuristic
3. **Curator-in-the-Loop Verification**:
   - Newly detected patterns are staged with `status = 'draft'`.
   - Editorial desk reviews, modifies, approves, or rejects patterns.
   - Approved patterns immediately broadcast via the public banner on the homepage.

---

## 6. Edge API & Frontend Integration

| Endpoint | Method | Backend Handler | Description |
| :--- | :--- | :--- | :--- |
| `/api/threads/list` | `GET` | `threadHandler.ts` | Filterable list of story threads with status, pagination, and search. |
| `/api/threads/[id]` | `GET` | `threadHandler.ts` | Complete chronological event evolution branch for a thread, resolving IDs, hashtags, or canonical labels. |
| `/api/graph/subgraph` | `GET` | `graphQueryHandler.ts` | 1-hop / 2-hop graph neighborhood traversal with date bounds and filters. |
| `/api/curator/patterns` | `GET/POST` | `curatorPatternHandler.ts` | Review, approve, edit, or reject emergent pattern candidates. |
| `/api/curator/knowledge-base`| `GET` | `curatorKnowledgeBaseHandler.ts`| Read-only paginated table viewer for all underlying D1 data. |

### Frontend UI Components:
* **Card Hashtag Badges** (`src/components/StoryClusterView.ts`):
  - Renders clean, un-pinned entity badges (e.g. `#DAC Clearance`, `#LAC`, `#HIMARS`).
  - Clicking any badge instantly opens the **Thread Detail Modal**.
* **Thread Detail Modal** (`src/components/threads/ThreadDetailModal.ts`):
  - Displays the complete milestone progression, delta summaries, and primary sources.
  - Automatically displays a graceful "Compiling Chronological Arc" state if signals are actively indexing.
* **Story Threads View** (`src/components/threads/ThreadExplorerView.ts`):
  - Two-column responsive layout: Master list on the left, chronological git-commit timeline on the right.
* **Intel Graph View** (`src/components/graph/KnowledgeGraphView.ts`):
  - 60fps micro-canvas force simulation (`KnowledgeGraphCanvas.ts`, `forceSimulation.ts`) using custom Euler/Verlet spring mechanics with zero third-party dependencies (< 4 KB gzip).
  - Inspector sidebar detailing degree centrality, epistemic states, and 2-hop linkages with direct links to full Story Threads.

---

## 7. Database Schema Reference (`d1/schema.sql`)

```sql
-- Story Threads
CREATE TABLE IF NOT EXISTS story_threads (
  id TEXT PRIMARY KEY,             -- deterministic slug, e.g. 'th_su-57', 'th_dac-clearance'
  title TEXT NOT NULL,
  canonical_entity TEXT NOT NULL,  -- normalized entity name, e.g. 'Su-57', 'DAC Clearance'
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
  id TEXT PRIMARY KEY,             -- normalized slug, e.g. 'node_su-57'
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
  predicate TEXT NOT NULL,         -- 'DEPLOYED_TO' | 'TESTED_AT' | 'PROCURES' | 'TARGETS' | 'CONNECTED_TO' | etc.
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

## 8. Hard Architectural Invariants

1. **Strict Line Limit ($\le 300$ LOC)**: Every module must stay under 300 lines of code. Sub-helpers (`feedTagExtractor.ts`, `graphStopNodes.ts`, `hashtagUtils.ts`) are used to protect main crawlers and parsers.
2. **Zero Inlined Resources**: UI copy, tab titles, and badges must come from SSOT resource files (`src/resources/threadStrings.ts`, `graphStrings.ts`, `strings.ts`). Colors must strictly consume CSS variables.
3. **Non-Blocking Crawl Fault Isolation**: Failures in thread sync, triplet extraction, or pattern detection must never crash the core news feed crawl in `crawler/ingest.ts`.
4. **Strict SQL Parameterization**: Every D1 statement must use parameterized `?` bindings via query builder utilities (`threadQueryBuilder.ts`). String interpolation in SQL is strictly prohibited.
5. **Client Performance & Micro-Bundle Budget**: The force-directed graph canvas and thread explorer are lazily loaded on demand to keep the initial client bundle light (< 100 KB gzip).

