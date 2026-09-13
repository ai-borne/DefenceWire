-- GENERATED FILE — edit d1/migrations/*.sql, then run npm run d1:schema.
-- Bootstrap snapshot only; deployment uses `wrangler d1 migrations apply`.
-- This generated snapshot intentionally stays whole despite exceeding 300 lines:
-- its single responsibility is reproducibly bootstrapping the complete D1 schema.
-- Source migration: 0001_legacy_core.sql
-- Legacy DefenceWire schema captured as migration 0001.
-- SSOT for the persistent story archive: every cluster that ages out of the
-- live 72-hour / top-30 feed window lands here instead of being discarded,
-- so it stays searchable indefinitely via the Archive tab.
-- Captures the supported pre-topic schema for clean installs and migration adoption.

CREATE TABLE IF NOT EXISTS archived_stories (
  id TEXT PRIMARY KEY,
  synthesized_headline TEXT NOT NULL,
  snippet TEXT,
  primary_source_name TEXT NOT NULL,
  primary_source_url TEXT NOT NULL,
  primary_source_published_at TEXT NOT NULL,
  categories TEXT NOT NULL,       -- JSON array of DomainCategory
  entities TEXT NOT NULL,         -- JSON array of strings
  defence_score INTEGER NOT NULL,
  cluster_json TEXT,              -- nullable because R2 is the payload SSOT
  archived_at TEXT NOT NULL       -- ISO 8601, when this story left the live feed
);

CREATE INDEX IF NOT EXISTS idx_archived_stories_archived_at ON archived_stories (archived_at DESC);

-- Full-text search over headline, snippet, and entities.
CREATE VIRTUAL TABLE IF NOT EXISTS archived_stories_fts USING fts5(
  id UNINDEXED,
  synthesized_headline,
  snippet,
  entities,
  content='archived_stories',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS archived_stories_ai AFTER INSERT ON archived_stories BEGIN
  INSERT INTO archived_stories_fts(rowid, id, synthesized_headline, snippet, entities)
  VALUES (new.rowid, new.id, new.synthesized_headline, new.snippet, new.entities);
END;

CREATE TRIGGER IF NOT EXISTS archived_stories_ad AFTER DELETE ON archived_stories BEGIN
  INSERT INTO archived_stories_fts(archived_stories_fts, rowid, id, synthesized_headline, snippet, entities)
  VALUES('delete', old.rowid, old.id, old.synthesized_headline, old.snippet, old.entities);
END;

CREATE TRIGGER IF NOT EXISTS archived_stories_au AFTER UPDATE ON archived_stories BEGIN
  INSERT INTO archived_stories_fts(archived_stories_fts, rowid, id, synthesized_headline, snippet, entities)
  VALUES('delete', old.rowid, old.id, old.synthesized_headline, old.snippet, old.entities);
  INSERT INTO archived_stories_fts(rowid, id, synthesized_headline, snippet, entities)
  VALUES (new.rowid, new.id, new.synthesized_headline, new.snippet, new.entities);
END;

-- Editorial Curator Overrides Table
-- Stores human-in-the-loop promotions, demotions, custom headlines, and SSB brief edits
-- directly in Cloudflare D1 instead of storing GitHub PATs in browser localStorage.
CREATE TABLE IF NOT EXISTS curator_overrides (
  id TEXT PRIMARY KEY,            -- story cluster ID
  override_type TEXT NOT NULL,    -- 'promote' | 'demote' | 'headline' | 'ssb' | 'ignore' | 'delete' (permanent tombstone, Phase 3)
  payload_json TEXT NOT NULL,     -- JSON representation of the override
  updated_at TEXT NOT NULL,       -- ISO 8601 timestamp
  curator_email TEXT NOT NULL DEFAULT 'curator@institutional.internal' -- Authenticated Zero Trust user identity for audit trail
);

CREATE INDEX IF NOT EXISTS idx_curator_overrides_updated_at ON curator_overrides (updated_at DESC);

-- One-Push "Go Live" Publish History & Kill-Switch Audit Trail
-- Each row is a full {clusters, river} snapshot at the moment a curator hit
-- "Sync to Cloudflare D1". functions/data/news.json.ts serves the most recent
-- via the NEWS_LIVE KV binding; the "Rollback Last Publish" action restores
-- the second-most-recent row into KV. Pruned to the last 20 rows on insert
-- (see curatorPublishHandler.ts) — no separate cron needed.
CREATE TABLE IF NOT EXISTS published_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  curator_email TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_published_snapshots_published_at ON published_snapshots (published_at DESC);

-- Dynamic Discovered Military Entities Table
-- Closed-loop knowledge base: stores newly discovered platforms, missiles, and codenames.
-- When an entity crosses the corroboration threshold (>= 3 mentions across >= 2 sources),
-- it is promoted to is_promoted = 1 and compiled into the crawler's active regex matcher.
CREATE TABLE IF NOT EXISTS discovered_entities (
  id TEXT PRIMARY KEY,            -- slug / canonical id (e.g. 'rudram-ii')
  name TEXT NOT NULL,            -- display name (e.g. 'Rudram-II')
  pattern TEXT NOT NULL,         -- generated regex pattern
  category TEXT NOT NULL,        -- domain category (airforce, navy, army, tech, strategic, procurement)
  source_count INTEGER DEFAULT 1,-- count of distinct publisher domains reporting this entity
  mention_count INTEGER DEFAULT 1,-- total occurrences observed across articles
  is_promoted INTEGER DEFAULT 0, -- 1 when promoted to active in-memory entity trie
  first_seen_at TEXT NOT NULL,   -- ISO 8601 timestamp
  last_seen_at TEXT NOT NULL     -- ISO 8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_discovered_entities_promoted ON discovered_entities (is_promoted, mention_count DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_entities_last_seen ON discovered_entities (last_seen_at DESC);

-- Durable Canonical-Entity Resolution Table (docs/knowledge_base_issues.md#2)
-- Self-learning SSOT for tag canonicalization: the Tier 0 check the tag
-- screening cascade (crawler/canonicalEntityResolver.ts) runs before minting
-- a new tag, so the same real-world entity resolves to the same primaryTag
-- across independently-run cascades instead of drifting per cluster.
CREATE TABLE IF NOT EXISTS canonical_entities (
  id TEXT PRIMARY KEY,            -- canonical slug (hashtagToSlug minus its 'th_' prefix), e.g. 's-400'
  canonical_tag TEXT NOT NULL,    -- display tag, e.g. '#S-400'
  alias_slugs_json TEXT NOT NULL DEFAULT '[]', -- JSON array of other raw slugs learned to resolve here
  mention_count INTEGER DEFAULT 1,
  first_seen_at TEXT NOT NULL,    -- ISO 8601
  last_seen_at TEXT NOT NULL      -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_canonical_entities_last_seen ON canonical_entities (last_seen_at DESC);

-- Dynamic Source Reputation & Scoop Velocity Table
-- Tracks rolling metrics for each news source domain: scoop frequency, corroboration accuracy,
-- and signal-to-noise ratio to compute dynamic ranking weights (0.7x - 1.3x).
CREATE TABLE IF NOT EXISTS source_reputation (
  domain TEXT PRIMARY KEY,               -- e.g. 'livefistdefence.com'
  source_name TEXT NOT NULL,             -- e.g. 'Livefist Defence'
  total_items_ingested INTEGER DEFAULT 0,-- count of all items ingested
  accepted_items_count INTEGER DEFAULT 0,-- items that passed relevance & quality gates
  scoop_count INTEGER DEFAULT 0,         -- count of times this source broke a story first
  corroboration_count INTEGER DEFAULT 0, -- times this source was corroborated by others
  reputation_multiplier REAL DEFAULT 1.0,-- computed multiplier between 0.70 and 1.30
  last_evaluated_at TEXT NOT NULL        -- ISO 8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_source_reputation_multiplier ON source_reputation (reputation_multiplier DESC);

-- ============================================================================
-- Pillar B: Verified Indian Defence MSME & Supplier Directory
-- ============================================================================

-- Verified supplier / vendor profiles (DPSUs, private primes, Tier-2 MSMEs,
-- deep-tech iDEX/SRIJAN startups).
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,             -- 'dpsu' | 'private_prime' | 'tier2_msme' | 'deep_tech_startup'
  hq_city TEXT NOT NULL,
  hq_state TEXT NOT NULL,
  corridor TEXT,                  -- DefenceCorridor, nullable
  website TEXT,
  description TEXT NOT NULL,
  srijan_id TEXT,
  idex_winner INTEGER DEFAULT 0,
  is_listed INTEGER DEFAULT 0,
  stock_symbol TEXT,
  created_at TEXT NOT NULL        -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tier ON suppliers (tier);
CREATE INDEX IF NOT EXISTS idx_suppliers_corridor ON suppliers (corridor);

-- Capability-domain and certification tags per supplier (one row per domain).
CREATE TABLE IF NOT EXISTS supplier_capabilities (
  supplier_id TEXT NOT NULL,
  capability_domain TEXT NOT NULL,
  certifications TEXT NOT NULL,   -- JSON array of DefenceCertification
  PRIMARY KEY (supplier_id, capability_domain),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_capabilities_domain ON supplier_capabilities (capability_domain);

-- Bidirectional program <-> subsystem <-> supplier cross-linking.
-- Note: the 43 Strategic Programs are static TypeScript data, not a D1 table
-- (see src/data/strategicPrograms.ts / src/types/programs.ts), so program_id
-- is a plain string column matching StrategicProgram.id with no D1 FK --
-- the same pattern idexProgramMapper.ts already uses for iDEX challenges.
-- Validated instead via tests/unit/supplierContracts.test.ts.
-- promoted_at is NULL for the original 31-supplier seed batch and set to the
-- approval timestamp only for rows scripts/review-supplier-candidates.mjs
-- promotes from supplier_candidates — this is what the Phase 2.7 coverage
-- strip's "N new links this month" growth signal counts. If this table
-- already exists on a previously-provisioned remote D1 database (re-running
-- this file is a no-op for existing tables), add the column once manually:
--   ALTER TABLE program_suppliers ADD COLUMN promoted_at TEXT;
CREATE TABLE IF NOT EXISTS program_suppliers (
  program_id TEXT NOT NULL,       -- matches StrategicProgram.id (no D1 FK)
  subsystem_name TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  indigenisation_status TEXT NOT NULL,
  promoted_at TEXT,               -- ISO 8601; set only when promoted via the candidate review pipeline
  PRIMARY KEY (program_id, subsystem_name, supplier_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX IF NOT EXISTS idx_program_suppliers_supplier ON program_suppliers (supplier_id);
CREATE INDEX IF NOT EXISTS idx_program_suppliers_program ON program_suppliers (program_id);

-- Full-text search over supplier name, description, capabilities, products.
CREATE VIRTUAL TABLE IF NOT EXISTS suppliers_fts USING fts5(
  id UNINDEXED,
  name,
  description,
  content='suppliers',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS suppliers_ai AFTER INSERT ON suppliers BEGIN
  INSERT INTO suppliers_fts(rowid, id, name, description)
  VALUES (new.rowid, new.id, new.name, new.description);
END;

CREATE TRIGGER IF NOT EXISTS suppliers_ad AFTER DELETE ON suppliers BEGIN
  INSERT INTO suppliers_fts(suppliers_fts, rowid, id, name, description)
  VALUES('delete', old.rowid, old.id, old.name, old.description);
END;

CREATE TRIGGER IF NOT EXISTS suppliers_au AFTER UPDATE ON suppliers BEGIN
  INSERT INTO suppliers_fts(suppliers_fts, rowid, id, name, description)
  VALUES('delete', old.rowid, old.id, old.name, old.description);
  INSERT INTO suppliers_fts(rowid, id, name, description)
  VALUES (new.rowid, new.id, new.name, new.description);
END;

-- ============================================================================
-- Phase 2.6: Autonomous Growth Pipeline — Supplier Candidate Review Queue
-- ============================================================================

-- Draft candidates extracted from wire stories by crawler/supplierCandidateExtractor.ts.
-- Never written to directly by the extractor into suppliers/program_suppliers/
-- supplier_capabilities (Root CLAUDE.md Rule 5: LLM/extraction output requires
-- human promotion before it becomes a "verified" claim). A human reviewer
-- (scripts/review-supplier-candidates.mjs) approves or rejects each row;
-- only 'approved' rows are promoted into the live tables.
CREATE TABLE IF NOT EXISTS supplier_candidates (
  id TEXT PRIMARY KEY,             -- deterministic: <candidate_type>:<supplier_id>:<program_id>[:<subsystem_slug>]
  candidate_type TEXT NOT NULL,    -- 'new_link' (only type extracted as of Phase 2.6 — see extractor header)
  supplier_id TEXT NOT NULL,       -- matches suppliers.id (no FK: candidate may reference a supplier not yet promoted)
  supplier_name TEXT NOT NULL,     -- display name at extraction time, for reviewer legibility
  program_id TEXT NOT NULL,        -- matches StrategicProgram.id (no D1 FK, same pattern as program_suppliers)
  subsystem_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,      -- full draft ProgramSupplierLink fields for promotion
  source_story_id TEXT,            -- one representative story id for reviewer citation
  source_domains TEXT NOT NULL,    -- JSON array of distinct publisher domains that mentioned the pair
  mention_count INTEGER NOT NULL DEFAULT 1,
  source_count INTEGER NOT NULL DEFAULT 1,
  confidence REAL NOT NULL,        -- 0.0 - 1.0, deterministic score (mention + source corroboration)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_supplier_candidates_status ON supplier_candidates (status, confidence DESC);

-- ============================================================================
-- Pillar C: Temporal Story Threading & Lineage Engine (Phase 1)
-- ============================================================================

-- Persistent story threads tracking evolving multi-month defence storylines.
CREATE TABLE IF NOT EXISTS story_threads (
  id TEXT PRIMARY KEY,             -- deterministic slug, e.g. 'th_lca-tejas-mk1a'
  title TEXT NOT NULL,            -- display title, e.g. 'LCA Tejas Mk1A Delivery Arc'
  canonical_entity TEXT NOT NULL, -- primary tracked entity, e.g. 'Tejas Mk1A'
  category TEXT NOT NULL,         -- 'airforce' | 'navy' | 'army' | 'tech' | 'strategic' | 'procurement'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'dormant' | 'concluded'
  event_count INTEGER NOT NULL DEFAULT 1,
  first_event_at TEXT NOT NULL,   -- ISO 8601
  last_event_at TEXT NOT NULL,    -- ISO 8601
  summary TEXT,                   -- short synthesis or description
  fingerprint_json TEXT,          -- semantic fingerprint vocabulary tokens
  created_at TEXT NOT NULL,       -- ISO 8601
  updated_at TEXT NOT NULL        -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_story_threads_status_last_event ON story_threads (status, last_event_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_threads_canonical_entity ON story_threads (canonical_entity);
CREATE INDEX IF NOT EXISTS idx_story_threads_last_event_at ON story_threads (last_event_at DESC);

-- Individual chronological milestones / cluster events within a story thread.
CREATE TABLE IF NOT EXISTS story_thread_events (
  id TEXT PRIMARY KEY,             -- deterministic, e.g. 'ev_<cluster_id>' or '<thread_id>:<sequence_code>'
  thread_id TEXT NOT NULL,         -- references story_threads(id)
  cluster_id TEXT NOT NULL,        -- maps to StoryCluster.id
  sequence_code TEXT NOT NULL,     -- e.g. 'x1.1.1', 'x1.1.2', 'x1.2.1'
  sequence_index INTEGER NOT NULL, -- 1, 2, 3...
  headline TEXT NOT NULL,
  delta_summary TEXT NOT NULL,     -- what changed in this update
  primary_source_name TEXT NOT NULL,
  primary_source_url TEXT NOT NULL,
  published_at TEXT NOT NULL,      -- ground-truth publish timestamp
  entities TEXT NOT NULL,          -- JSON array of strings
  created_at TEXT NOT NULL,        -- ISO 8601
  FOREIGN KEY (thread_id) REFERENCES story_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_thread_events_thread_seq ON story_thread_events (thread_id, sequence_index ASC);
CREATE INDEX IF NOT EXISTS idx_story_thread_events_cluster ON story_thread_events (cluster_id);
CREATE INDEX IF NOT EXISTS idx_story_thread_events_published ON story_thread_events (published_at ASC);

-- Source migration: 0002_legacy_graph.sql
-- ============================================================================
-- Pillar D: Semantic Knowledge Graph & Epistemic Triples (Phase 2)
-- ============================================================================

-- Semantic graph nodes representing platforms, units, facilities, and programs.
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,               -- normalized slug, e.g. 'node_l-70-guns', 'node_delhi'
  label TEXT NOT NULL,              -- display name e.g. 'L-70 Guns'
  category TEXT NOT NULL,           -- 'platform' | 'threat' | 'facility' | 'location' | 'organization' | 'program'
  mention_count INTEGER NOT NULL DEFAULT 1,
  degree INTEGER NOT NULL DEFAULT 0,-- degree centrality (number of connected edges)
  first_seen_at TEXT NOT NULL,      -- ISO 8601
  last_seen_at TEXT NOT NULL,       -- ISO 8601
  metadata_json TEXT                -- optional JSON string
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_category ON graph_nodes (category);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_degree ON graph_nodes (degree DESC);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_last_seen ON graph_nodes (last_seen_at DESC);

-- Directed semantic relationships with truth states and observation timestamps.
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,               -- deterministic: 'edge_${source_id}_${predicate}_${target_id}'
  source_id TEXT NOT NULL,           -- references graph_nodes(id)
  target_id TEXT NOT NULL,           -- references graph_nodes(id)
  predicate TEXT NOT NULL,           -- 'DEPLOYED_TO' | 'CONNECTED_TO' | 'PROCURES' | 'TESTED_AT' | 'TARGETS' | 'DEVELOPED_BY' | 'ENGAGED_WITH' | 'SUPPLIES' | 'INTERCEPTED'
  epistemic_state TEXT NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED' | 'CONTESTED' | 'SUPERSEDED' | 'DISPUTED' | 'RETRACTED'
  weight REAL NOT NULL DEFAULT 1.0,
  cluster_id TEXT,                  -- maps to StoryCluster.id
  first_observed_at TEXT NOT NULL,   -- ISO 8601
  last_observed_at TEXT NOT NULL,    -- ISO 8601
  source_url TEXT NOT NULL,
  context_snippet TEXT,
  FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source_pred ON graph_edges (source_id, predicate);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_pred ON graph_edges (target_id, predicate);
CREATE INDEX IF NOT EXISTS idx_graph_edges_epistemic ON graph_edges (epistemic_state);
CREATE INDEX IF NOT EXISTS idx_graph_edges_observed ON graph_edges (last_observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_edges_cluster ON graph_edges (cluster_id);

-- ============================================================================
-- Pillar E: Emergent Pattern & Hypothesis Synthesizer (Phase 5)
-- ============================================================================

-- Autonomous emergent pattern candidates detected from dense graph subgraphs
-- and spatiotemporal clustering across independent news tracks.
CREATE TABLE IF NOT EXISTS emergent_patterns (
  id TEXT PRIMARY KEY,               -- deterministic slug, e.g. 'pat_delhi_air_defence'
  title TEXT NOT NULL,              -- situational title, e.g. 'NCR Air Defence & Counter-UAS Convergence'
  synthesis TEXT NOT NULL,          -- 2-sentence situational assessment/hypothesis
  confidence REAL NOT NULL DEFAULT 0.5, -- confidence score 0.0 - 1.0 based on graph density & multi-track corroboration
  node_ids_json TEXT NOT NULL,      -- JSON array of graph_nodes(id)
  cluster_ids_json TEXT NOT NULL,   -- JSON array of StoryCluster(id)
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'rejected'
  created_at TEXT NOT NULL,         -- ISO 8601
  reviewed_at TEXT,                 -- ISO 8601
  reviewed_by TEXT                  -- curator email
);

CREATE INDEX IF NOT EXISTS idx_emergent_patterns_status ON emergent_patterns (status, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_emergent_patterns_created ON emergent_patterns (created_at DESC);

-- Source migration: 0003_durable_identity.sql
-- Durable ingestion and event identity. Additive: no current writer uses these tables yet.
CREATE TABLE ingestion_runs (
  id TEXT PRIMARY KEY,
  input_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'started', 'articles_persisted', 'clusters_persisted', 'classified',
    'publishable', 'published', 'failed_retryable', 'failed_terminal'
  )),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  failure_stage TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0)
);

CREATE INDEX idx_ingestion_runs_status_started ON ingestion_runs(status, started_at DESC);

CREATE TABLE source_articles (
  id TEXT PRIMARY KEY,
  canonical_url TEXT UNIQUE,
  original_url TEXT,
  source_domain TEXT NOT NULL,
  source_owner_key TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  published_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  payload_key TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  CHECK (canonical_url IS NOT NULL OR id LIKE 'article_%'),
  CHECK (last_seen_at >= first_seen_at)
);

CREATE INDEX idx_source_articles_published ON source_articles(published_at DESC);
CREATE INDEX idx_source_articles_owner_hash ON source_articles(source_owner_key, content_hash);

CREATE TABLE story_clusters (
  id TEXT PRIMARY KEY,
  event_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'split', 'withdrawn')),
  primary_source_article_id TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  merged_into_cluster_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (primary_source_article_id) REFERENCES source_articles(id),
  FOREIGN KEY (merged_into_cluster_id) REFERENCES story_clusters(id),
  CHECK (last_observed_at >= first_observed_at),
  CHECK ((status = 'merged') = (merged_into_cluster_id IS NOT NULL)),
  CHECK (merged_into_cluster_id IS NULL OR merged_into_cluster_id != id)
);

CREATE INDEX idx_story_clusters_fingerprint ON story_clusters(event_fingerprint, last_observed_at DESC);
CREATE INDEX idx_story_clusters_redirect ON story_clusters(merged_into_cluster_id);

CREATE TABLE cluster_sources (
  cluster_id TEXT NOT NULL,
  source_article_id TEXT NOT NULL,
  coverage_role TEXT NOT NULL CHECK (coverage_role IN ('primary', 'related', 'social')),
  source_authority TEXT NOT NULL CHECK (source_authority IN ('official', 'trusted', 'standard', 'social', 'unknown')),
  attached_at TEXT NOT NULL,
  PRIMARY KEY (cluster_id, source_article_id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE,
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id)
);

CREATE UNIQUE INDEX idx_cluster_sources_one_primary ON cluster_sources(cluster_id)
  WHERE coverage_role = 'primary';
CREATE INDEX idx_cluster_sources_article ON cluster_sources(source_article_id);

CREATE TABLE cluster_lineage (
  predecessor_cluster_id TEXT NOT NULL,
  successor_cluster_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('merge', 'split', 'article_move')),
  reason TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  PRIMARY KEY (predecessor_cluster_id, successor_cluster_id, change_type),
  FOREIGN KEY (predecessor_cluster_id) REFERENCES story_clusters(id),
  FOREIGN KEY (successor_cluster_id) REFERENCES story_clusters(id),
  CHECK (predecessor_cluster_id != successor_cluster_id)
);

CREATE TRIGGER story_cluster_redirect_cycle_insert
BEFORE INSERT ON story_clusters WHEN NEW.merged_into_cluster_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.merged_into_cluster_id UNION ALL
      SELECT s.merged_into_cluster_id FROM story_clusters s JOIN chain ON s.id = chain.id
      WHERE s.merged_into_cluster_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'cluster redirect cycle') END;
END;

CREATE TRIGGER story_cluster_redirect_cycle_update
BEFORE UPDATE OF merged_into_cluster_id ON story_clusters WHEN NEW.merged_into_cluster_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.merged_into_cluster_id UNION ALL
      SELECT s.merged_into_cluster_id FROM story_clusters s JOIN chain ON s.id = chain.id
      WHERE s.merged_into_cluster_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'cluster redirect cycle') END;
END;

CREATE TRIGGER cluster_primary_must_be_attached
BEFORE UPDATE OF primary_source_article_id ON story_clusters
WHEN NEW.primary_source_article_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM cluster_sources cs
  WHERE cs.cluster_id = NEW.id AND cs.source_article_id = NEW.primary_source_article_id
)
BEGIN
  SELECT RAISE(ABORT, 'primary source must be attached to cluster');
END;

CREATE TRIGGER cluster_primary_not_set_on_insert
BEFORE INSERT ON story_clusters WHEN NEW.primary_source_article_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'attach a cluster source before selecting it as primary');
END;

-- Source migration: 0004_topic_registry.sql
-- Canonical topic registry. Public navigation identity lives here, not in legacy entity tables.
CREATE TABLE topics (
  id TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  display_name TEXT NOT NULL,
  display_hashtag TEXT NOT NULL UNIQUE CHECK (display_hashtag GLOB '#[A-Za-z0-9]*'),
  topic_type TEXT NOT NULL CHECK (topic_type IN (
    'country', 'bilateral_relationship', 'person', 'office', 'military_service',
    'military_unit', 'organization', 'company', 'platform', 'programme', 'location',
    'facility', 'exercise', 'operation', 'alliance', 'operational_theatre', 'conflict',
    'technology', 'capability', 'strategic_theme'
  )),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('provisional', 'active', 'deprecated', 'merged')),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  display_priority INTEGER NOT NULL DEFAULT 0,
  registry_version INTEGER NOT NULL CHECK (registry_version > 0),
  replaced_by_topic_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (replaced_by_topic_id) REFERENCES topics(id),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (replaced_by_topic_id IS NULL OR replaced_by_topic_id != id),
  CHECK ((status = 'merged') = (replaced_by_topic_id IS NOT NULL)),
  CHECK (verification_state != 'published' OR status = 'active')
);

CREATE INDEX idx_topics_runtime_registry ON topics(status, verification_state, registry_version);
CREATE INDEX idx_topics_redirect ON topics(replaced_by_topic_id);

CREATE TABLE topic_aliases (
  normalized_alias TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  alias_type TEXT NOT NULL CHECK (alias_type IN ('canonical', 'acronym', 'spelling', 'former_name', 'transliteration')),
  requires_context INTEGER NOT NULL DEFAULT 0 CHECK (requires_context IN (0, 1)),
  context_rule_json TEXT,
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (normalized_alias, topic_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CHECK (normalized_alias = lower(trim(normalized_alias))),
  CHECK ((requires_context = 1) = (context_rule_json IS NOT NULL)),
  CHECK (context_rule_json IS NULL OR json_valid(context_rule_json))
);

CREATE UNIQUE INDEX idx_topic_alias_unconditional ON topic_aliases(normalized_alias)
  WHERE requires_context = 0 AND verification_state != 'rejected';
CREATE INDEX idx_topic_alias_topic ON topic_aliases(topic_id);

CREATE TABLE topic_relations (
  source_topic_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related_to', 'part_of', 'operated_by', 'located_in', 'successor_to')),
  target_topic_id TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_source_article_id TEXT,
  evidence_start INTEGER,
  evidence_end INTEGER,
  evidence_content_hash TEXT,
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  PRIMARY KEY (source_topic_id, relation_type, target_topic_id),
  FOREIGN KEY (source_topic_id) REFERENCES topics(id),
  FOREIGN KEY (target_topic_id) REFERENCES topics(id),
  FOREIGN KEY (evidence_source_article_id) REFERENCES source_articles(id),
  CHECK (source_topic_id != target_topic_id),
  CHECK ((evidence_start IS NULL AND evidence_end IS NULL) OR
         (evidence_start >= 0 AND evidence_end > evidence_start AND evidence_source_article_id IS NOT NULL AND evidence_content_hash IS NOT NULL))
);

CREATE TABLE topic_implication_rules (
  source_topic_id TEXT NOT NULL,
  implied_topic_id TEXT NOT NULL,
  required_context_json TEXT NOT NULL CHECK (json_valid(required_context_json)),
  maximum_depth INTEGER NOT NULL CHECK (maximum_depth BETWEEN 1 AND 5),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  PRIMARY KEY (source_topic_id, implied_topic_id),
  FOREIGN KEY (source_topic_id) REFERENCES topics(id),
  FOREIGN KEY (implied_topic_id) REFERENCES topics(id),
  CHECK (source_topic_id != implied_topic_id)
);

CREATE TABLE topic_candidates (
  id TEXT PRIMARY KEY,
  normalized_name TEXT NOT NULL,
  proposed_display_name TEXT NOT NULL,
  proposed_topic_type TEXT CHECK (proposed_topic_type IS NULL OR proposed_topic_type IN (
    'country', 'bilateral_relationship', 'person', 'office', 'military_service',
    'military_unit', 'organization', 'company', 'platform', 'programme', 'location',
    'facility', 'exercise', 'operation', 'alliance', 'operational_theatre', 'conflict',
    'technology', 'capability', 'strategic_theme'
  )),
  source_article_id TEXT,
  evidence_start INTEGER,
  evidence_end INTEGER,
  evidence_content_hash TEXT,
  legacy_source TEXT CHECK (legacy_source IN ('canonical_entities', 'discovered_entities', 'runtime_discovery')),
  legacy_source_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  resolved_topic_id TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id),
  FOREIGN KEY (resolved_topic_id) REFERENCES topics(id),
  UNIQUE (legacy_source, legacy_source_id),
  CHECK ((source_article_id IS NULL AND evidence_start IS NULL AND evidence_end IS NULL) OR
         (source_article_id IS NOT NULL AND evidence_start >= 0 AND evidence_end > evidence_start AND evidence_content_hash IS NOT NULL))
);

CREATE TRIGGER topic_redirect_cycle_insert
BEFORE INSERT ON topics WHEN NEW.replaced_by_topic_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.replaced_by_topic_id UNION ALL
      SELECT t.replaced_by_topic_id FROM topics t JOIN chain ON t.id = chain.id
      WHERE t.replaced_by_topic_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'topic redirect cycle') END;
END;

CREATE TRIGGER topic_redirect_cycle_update
BEFORE UPDATE OF replaced_by_topic_id ON topics WHEN NEW.replaced_by_topic_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.replaced_by_topic_id UNION ALL
      SELECT t.replaced_by_topic_id FROM topics t JOIN chain ON t.id = chain.id
      WHERE t.replaced_by_topic_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'topic redirect cycle') END;
END;

CREATE TRIGGER topic_lifecycle_transition
BEFORE UPDATE OF status ON topics
WHEN NOT (
  NEW.status = OLD.status OR
  (OLD.status = 'provisional' AND NEW.status IN ('active', 'deprecated', 'merged')) OR
  (OLD.status = 'active' AND NEW.status IN ('deprecated', 'merged')) OR
  (OLD.status = 'deprecated' AND NEW.status IN ('active', 'merged'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid topic lifecycle transition');
END;

CREATE TRIGGER topic_implication_cycle_insert
BEFORE INSERT ON topic_implication_rules
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id, depth) AS (
      SELECT NEW.implied_topic_id, 0 UNION ALL
      SELECT r.implied_topic_id, chain.depth + 1
      FROM topic_implication_rules r JOIN chain ON r.source_topic_id = chain.id
      WHERE chain.depth < 5
    ) SELECT 1 FROM chain WHERE id = NEW.source_topic_id
  ) THEN RAISE(ABORT, 'topic implication cycle') END;
END;

CREATE TRIGGER topic_implication_cycle_update
BEFORE UPDATE OF source_topic_id, implied_topic_id ON topic_implication_rules
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id, depth) AS (
      SELECT NEW.implied_topic_id, 0 UNION ALL
      SELECT r.implied_topic_id, chain.depth + 1
      FROM topic_implication_rules r JOIN chain ON r.source_topic_id = chain.id
      WHERE chain.depth < 5 AND NOT (
        r.source_topic_id = OLD.source_topic_id AND r.implied_topic_id = OLD.implied_topic_id
      )
    ) SELECT 1 FROM chain WHERE id = NEW.source_topic_id
  ) THEN RAISE(ABORT, 'topic implication cycle') END;
END;

-- Source migration: 0005_topic_assignments.sql
-- Immutable assignment provenance and effective public membership.
CREATE TABLE topic_assignment_runs (
  id TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  registry_version INTEGER NOT NULL CHECK (registry_version > 0),
  classifier_version TEXT NOT NULL,
  assignment_policy_version TEXT NOT NULL,
  model_cache_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'validated', 'reused', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id),
  UNIQUE (cluster_id, content_fingerprint, registry_version, classifier_version, assignment_policy_version),
  UNIQUE (id, cluster_id)
);

CREATE TABLE cluster_topic_decisions (
  id TEXT PRIMARY KEY,
  assignment_run_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('subject', 'actor', 'target', 'operator', 'location', 'facility', 'platform', 'programme', 'context')),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assignment_source TEXT NOT NULL CHECK (assignment_source IN ('deterministic', 'model', 'publisher', 'implication', 'curator', 'migration')),
  decision_state TEXT NOT NULL CHECK (decision_state IN ('shadow', 'accepted', 'suppressed', 'rejected', 'removed', 'superseded')),
  supersedes_decision_id TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY (assignment_run_id, cluster_id) REFERENCES topic_assignment_runs(id, cluster_id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (supersedes_decision_id) REFERENCES cluster_topic_decisions(id),
  CHECK (supersedes_decision_id IS NULL OR supersedes_decision_id != id)
);

CREATE INDEX idx_cluster_topic_decisions_history ON cluster_topic_decisions(cluster_id, topic_id, decided_at DESC);

CREATE TABLE cluster_topics (
  cluster_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('subject', 'actor', 'target', 'operator', 'location', 'facility', 'platform', 'programme', 'context')),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assignment_source TEXT NOT NULL CHECK (assignment_source IN ('deterministic', 'model', 'publisher', 'implication', 'curator', 'migration')),
  source_decision_id TEXT NOT NULL,
  locked_by_curator INTEGER NOT NULL DEFAULT 0 CHECK (locked_by_curator IN (0, 1)),
  assignment_run_id TEXT NOT NULL,
  classifier_version TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  reviewed_at TEXT,
  PRIMARY KEY (cluster_id, topic_id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (source_decision_id) REFERENCES cluster_topic_decisions(id),
  FOREIGN KEY (assignment_run_id) REFERENCES topic_assignment_runs(id),
  CHECK (locked_by_curator = 0 OR assignment_source = 'curator')
);

CREATE INDEX idx_cluster_topics_public ON cluster_topics(topic_id, assigned_at DESC);

CREATE TABLE article_topic_mentions (
  topic_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  source_article_id TEXT NOT NULL,
  mention_kind TEXT NOT NULL CHECK (mention_kind IN ('exact', 'contextual', 'implication')),
  evidence_start INTEGER NOT NULL CHECK (evidence_start >= 0),
  evidence_end INTEGER NOT NULL CHECK (evidence_end > evidence_start),
  evidence_content_hash TEXT NOT NULL,
  extraction_run_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (topic_id, source_article_id, evidence_start, evidence_end, extraction_run_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE,
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id),
  FOREIGN KEY (extraction_run_id, cluster_id) REFERENCES topic_assignment_runs(id, cluster_id)
);

CREATE INDEX idx_article_topic_mentions_cluster ON article_topic_mentions(cluster_id, topic_id);
CREATE INDEX idx_article_topic_mentions_corroboration ON article_topic_mentions(topic_id, source_article_id);

CREATE TABLE topic_curation_audit (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  cluster_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'merge', 'approve', 'reject', 'lock', 'unlock', 'assign', 'remove')),
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  curator_email TEXT NOT NULL,
  expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id),
  CHECK (topic_id IS NOT NULL OR cluster_id IS NOT NULL)
);

CREATE TABLE topic_reclassification_queue (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('registry_change', 'alias_change', 'topic_merge', 'policy_change', 'curator_request')),
  trigger_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id),
  UNIQUE (trigger_type, trigger_id, cluster_id)
);

CREATE TRIGGER cluster_topics_only_validated_insert
BEFORE INSERT ON cluster_topics
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM topics t JOIN cluster_topic_decisions d ON d.id = NEW.source_decision_id
    WHERE t.id = NEW.topic_id AND t.status = 'active' AND t.verification_state = 'published'
      AND d.topic_id = NEW.topic_id AND d.cluster_id = NEW.cluster_id
      AND d.assignment_run_id = NEW.assignment_run_id AND d.decision_state = 'accepted'
  ) THEN RAISE(ABORT, 'effective topic must be published and accepted') END;
END;

CREATE TRIGGER cluster_topics_only_validated_update
BEFORE UPDATE ON cluster_topics
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM topics t JOIN cluster_topic_decisions d ON d.id = NEW.source_decision_id
    WHERE t.id = NEW.topic_id AND t.status = 'active' AND t.verification_state = 'published'
      AND d.topic_id = NEW.topic_id AND d.cluster_id = NEW.cluster_id
      AND d.assignment_run_id = NEW.assignment_run_id AND d.decision_state = 'accepted'
  ) THEN RAISE(ABORT, 'effective topic must be published and accepted') END;
END;

CREATE TRIGGER cluster_topics_curator_lock_update
BEFORE UPDATE ON cluster_topics WHEN OLD.locked_by_curator = 1 AND (
  NEW.assignment_source != 'curator' OR
  (NEW.locked_by_curator != 1 AND NOT EXISTS (
    SELECT 1 FROM topic_curation_audit a
    WHERE a.cluster_id = OLD.cluster_id AND a.topic_id = OLD.topic_id
      AND a.action = 'unlock' AND a.created_at = NEW.reviewed_at
  ))
)
BEGIN
  SELECT RAISE(ABORT, 'curator-locked assignment cannot be overwritten');
END;

CREATE TRIGGER cluster_topics_curator_lock_delete
BEFORE DELETE ON cluster_topics WHEN OLD.locked_by_curator = 1
BEGIN
  SELECT RAISE(ABORT, 'curator-locked assignment cannot be deleted');
END;

CREATE TRIGGER cluster_topic_decisions_immutable_update
BEFORE UPDATE ON cluster_topic_decisions
BEGIN
  SELECT RAISE(ABORT, 'topic decisions are immutable');
END;

CREATE TRIGGER cluster_topic_decisions_immutable_delete
BEFORE DELETE ON cluster_topic_decisions
BEGIN
  SELECT RAISE(ABORT, 'topic decisions are immutable');
END;

CREATE VIEW topic_corroboration_counts AS
SELECT m.topic_id,
       COUNT(*) AS mention_count,
       COUNT(DISTINCT a.source_owner_key) AS independent_source_count
FROM article_topic_mentions m
JOIN source_articles a ON a.id = m.source_article_id
GROUP BY m.topic_id;

-- Source migration: 0006_seed_topic_taxonomy.sql
-- Reviewed bootstrap vocabulary. Runtime D1 records remain open to later verified additions.
INSERT OR IGNORE INTO topics
  (id, display_name, display_hashtag, topic_type, description, status, verification_state,
   display_priority, registry_version, first_seen_at, last_seen_at, created_at, updated_at)
VALUES
  ('india', 'India', '#India', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('china', 'China', '#China', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('united-states', 'United States', '#UnitedStates', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('iran', 'Iran', '#Iran', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('jordan', 'Jordan', '#Jordan', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('india-china', 'India-China', '#IndiaChina', 'bilateral_relationship', NULL, 'active', 'published', 90, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('lac', 'Line of Actual Control', '#LAC', 'operational_theatre', NULL, 'active', 'published', 95, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('loc', 'Line of Control', '#LOC', 'operational_theatre', NULL, 'active', 'published', 95, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-army', 'Indian Army', '#IndianArmy', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-navy', 'Indian Navy', '#IndianNavy', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-air-force', 'Indian Air Force', '#IndianAirForce', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('drdo', 'Defence Research and Development Organisation', '#DRDO', 'organization', NULL, 'active', 'published', 75, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('hal', 'Hindustan Aeronautics Limited', '#HAL', 'company', NULL, 'active', 'published', 75, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('brahmos', 'BrahMos', '#BrahMos', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('tejas-mk1a', 'Tejas Mk1A', '#TejasMk1A', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('su-57', 'Sukhoi Su-57', '#Su57', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('rafale', 'Dassault Rafale', '#Rafale', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('s-400', 'S-400 Triumf', '#S400', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('amca', 'Advanced Medium Combat Aircraft', '#AMCA', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('airbases', 'Airbases', '#Airbases', 'facility', NULL, 'active', 'published', 50, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-ocean-region', 'Indian Ocean Region', '#IndianOceanRegion', 'operational_theatre', NULL, 'active', 'published', 60, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indo-pacific', 'Indo-Pacific', '#IndoPacific', 'operational_theatre', NULL, 'active', 'published', 60, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_aliases
  (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at)
VALUES
  ('india', 'india', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('china', 'china', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('united states', 'united-states', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('usa', 'united-states', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('us', 'united-states', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('u s', 'united-states', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('america', 'united-states', 'spelling', 1, '{"requiredTerms":["government","military","country"]}', 'verified', '2026-09-13T00:00:00Z'),
  ('iran', 'iran', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('jordan', 'jordan', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('india china', 'india-china', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('lac', 'lac', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('line of actual control', 'lac', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('loc', 'loc', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('line of control', 'loc', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('iaf', 'indian-air-force', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian air force', 'indian-air-force', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian army', 'indian-army', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian navy', 'indian-navy', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('su57', 'su-57', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('su 57', 'su-57', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('sukhoi su 57', 'su-57', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('tejas mk1a', 'tejas-mk1a', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('lca tejas mk1a', 'tejas-mk1a', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('brahmos', 'brahmos', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_implication_rules
  (source_topic_id, implied_topic_id, required_context_json, maximum_depth, verification_state)
VALUES
  ('lac', 'india', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published'),
  ('lac', 'china', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published'),
  ('lac', 'india-china', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published');

-- Legacy rows become private review candidates; they never auto-create public topics.
INSERT OR IGNORE INTO topic_candidates
  (id, normalized_name, proposed_display_name, proposed_topic_type, legacy_source,
   legacy_source_id, status, created_at)
SELECT 'legacy-canonical-' || id, lower(trim(canonical_tag)), canonical_tag, NULL,
       'canonical_entities', id, 'pending', first_seen_at
FROM canonical_entities;

INSERT OR IGNORE INTO topic_candidates
  (id, normalized_name, proposed_display_name, proposed_topic_type, legacy_source,
   legacy_source_id, status, created_at)
SELECT 'legacy-discovered-' || id, lower(trim(name)), name, NULL,
       'discovered_entities', id, 'pending', first_seen_at
FROM discovered_entities;

-- Source migration: 0007_durable_ingestion.sql
-- Phase 2 durable ingestion checkpoints and payload visibility.
CREATE UNIQUE INDEX idx_ingestion_runs_input_fingerprint
  ON ingestion_runs(input_fingerprint);

ALTER TABLE ingestion_runs ADD COLUMN eligible_article_count INTEGER NOT NULL DEFAULT 0
  CHECK (eligible_article_count >= 0);
ALTER TABLE ingestion_runs ADD COLUMN eligible_cluster_count INTEGER NOT NULL DEFAULT 0
  CHECK (eligible_cluster_count >= 0);
ALTER TABLE ingestion_runs ADD COLUMN homepage_cluster_count INTEGER
  CHECK (homepage_cluster_count IS NULL OR homepage_cluster_count >= 0);

ALTER TABLE story_clusters ADD COLUMN payload_key TEXT;
ALTER TABLE story_clusters ADD COLUMN ingestion_run_id TEXT
  REFERENCES ingestion_runs(id);

CREATE INDEX idx_story_clusters_ingestion_run
  ON story_clusters(ingestion_run_id);

CREATE TABLE ingestion_cluster_manifest (
  ingestion_run_id TEXT NOT NULL,
  event_fingerprint TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  payload_key TEXT NOT NULL,
  PRIMARY KEY (ingestion_run_id, event_fingerprint, payload_hash),
  UNIQUE (cluster_id),
  FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id)
);

CREATE TABLE ingestion_run_articles (
  ingestion_run_id TEXT NOT NULL,
  source_article_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  PRIMARY KEY (ingestion_run_id, source_article_id),
  FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id),
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id)
);

CREATE TABLE ingestion_orphan_candidates (
  payload_key TEXT PRIMARY KEY,
  ingestion_run_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  resolution_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_state IN ('pending', 'adopted', 'deleted')),
  resolved_at TEXT,
  FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id),
  CHECK ((resolution_state = 'pending') = (resolved_at IS NULL))
);

CREATE INDEX idx_ingestion_orphans_state
  ON ingestion_orphan_candidates(resolution_state, detected_at);

CREATE TRIGGER ingestion_run_transition_guard
BEFORE UPDATE OF status ON ingestion_runs
WHEN NOT (
  OLD.status = NEW.status OR
  (OLD.status = 'started' AND NEW.status IN ('articles_persisted', 'failed_retryable', 'failed_terminal')) OR
  (OLD.status = 'articles_persisted' AND NEW.status IN ('clusters_persisted', 'failed_retryable', 'failed_terminal')) OR
  (OLD.status = 'clusters_persisted' AND NEW.status IN ('classified', 'failed_retryable', 'failed_terminal')) OR
  (OLD.status = 'classified' AND NEW.status IN ('publishable', 'failed_retryable', 'failed_terminal')) OR
  (OLD.status = 'publishable' AND NEW.status IN ('published', 'failed_retryable', 'failed_terminal')) OR
  (OLD.status = 'failed_retryable' AND NEW.status = 'started')
)
BEGIN
  SELECT RAISE(ABORT, 'invalid ingestion run transition');
END;

-- Source migration: 0008_phase3_topic_corpus_seed.sql
-- Phase 3 reviewed corpus vocabulary. These remain registry data, never a compiled classifier allowlist.
INSERT OR IGNORE INTO topics (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority, registry_version, first_seen_at, last_seen_at, created_at, updated_at) VALUES
  ('kibithu', 'Kibithu', '#Kibithu', 'location', 'active', 'published', 55, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('muwaffaq-salti-air-base', 'Muwaffaq Salti Air Base', '#MuwaffaqSaltiAB', 'facility', 'active', 'published', 55, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('france', 'France', '#France', 'country', 'active', 'published', 80, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('akash-ng', 'Akash-NG', '#AkashNG', 'platform', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('future-ready-combat-vehicle', 'Future Ready Combat Vehicle', '#FRCV', 'programme', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('pralay', 'Pralay', '#Pralay', 'platform', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('philippines', 'Philippines', '#Philippines', 'country', 'active', 'published', 80, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_aliases (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at) VALUES
  ('indian', 'india', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('chinese', 'china', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('kibithu', 'kibithu', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('muwaffaq salti air base', 'muwaffaq-salti-air-base', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('france', 'france', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('akash ng', 'akash-ng', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('akas ng', 'akash-ng', 'transliteration', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('future ready combat vehicle', 'future-ready-combat-vehicle', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('frcv', 'future-ready-combat-vehicle', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('pralay', 'pralay', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('philippines', 'philippines', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_implication_rules (source_topic_id, implied_topic_id, required_context_json, maximum_depth, verification_state) VALUES
  ('muwaffaq-salti-air-base', 'airbases', '{"eventTypes":["military"]}', 1, 'published'),
  ('kibithu', 'lac', '{"materialActors":["india","china"],"eventTypes":["military","diplomatic"]}', 1, 'published'),
  ('india', 'india-china', '{"materialActors":["india","china"],"eventTypes":["military","diplomatic"]}', 1, 'published');
