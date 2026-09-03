-- DefenceWire Archive Database Schema (D1 / SQLite)
-- SSOT for the persistent story archive: every cluster that ages out of the
-- live 72-hour / top-30 feed window lands here instead of being discarded,
-- so it stays searchable indefinitely via the Archive tab.
-- Apply with: npx wrangler d1 execute defencewire-archive --local --file=d1/schema.sql
--         or: npx wrangler d1 execute defencewire-archive --remote --file=d1/schema.sql

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
  cluster_json TEXT NOT NULL,     -- full StoryCluster JSON — SSOT for rehydrating the card UI
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
  override_type TEXT NOT NULL,    -- 'promote' | 'demote' | 'headline' | 'ssb' | 'ignore'
  payload_json TEXT NOT NULL,     -- JSON representation of the override
  updated_at TEXT NOT NULL,       -- ISO 8601 timestamp
  curator_email TEXT NOT NULL DEFAULT 'curator@institutional.internal' -- Authenticated Zero Trust user identity for audit trail
);

CREATE INDEX IF NOT EXISTS idx_curator_overrides_updated_at ON curator_overrides (updated_at DESC);

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
-- Migration (Phase 3 of the R2 cluster_json migration): drop the NOT NULL
-- constraint on archived_stories.cluster_json. As of Phase 3, cluster_json is
-- written to R2 (crawler/r2ArchiveStore.ts) instead of D1 going forward, so
-- new rows insert cluster_json = NULL; only rows archived before this
-- migration ran still carry it in D1 (nulled out later by Phase 4's
-- backfill). SQLite has no ALTER COLUMN to drop a NOT NULL constraint, so
-- this rebuilds the table under a temporary name, copies every row across,
-- and swaps it into place — the standard SQLite "12-step" table migration.
--
-- This block is intentionally NOT wrapped in IF NOT EXISTS / IF EXISTS
-- guards and is NOT idempotent (the final RENAME fails if run twice). Run it
-- ONCE, manually, after the Phase 3 application code is deployed:
--   npx wrangler d1 execute defencewire-archive --remote --command "$(cat <<'SQL'
--     PRAGMA foreign_keys=OFF;
--     ...the statements below...
--   SQL
--   )"
-- Do not include it in a routine `wrangler d1 execute --file=d1/schema.sql`
-- re-apply of this file.
-- ============================================================================

-- PRAGMA foreign_keys=OFF;
--
-- CREATE TABLE archived_stories_new (
--   id TEXT PRIMARY KEY,
--   synthesized_headline TEXT NOT NULL,
--   snippet TEXT,
--   primary_source_name TEXT NOT NULL,
--   primary_source_url TEXT NOT NULL,
--   primary_source_published_at TEXT NOT NULL,
--   categories TEXT NOT NULL,
--   entities TEXT NOT NULL,
--   defence_score INTEGER NOT NULL,
--   cluster_json TEXT,               -- nullable as of Phase 3: R2 is the copy of record
--   archived_at TEXT NOT NULL
-- );
--
-- INSERT INTO archived_stories_new SELECT * FROM archived_stories;
--
-- DROP TABLE archived_stories_fts;
-- DROP TABLE archived_stories;
-- ALTER TABLE archived_stories_new RENAME TO archived_stories;
--
-- CREATE INDEX IF NOT EXISTS idx_archived_stories_archived_at ON archived_stories (archived_at DESC);
--
-- CREATE VIRTUAL TABLE archived_stories_fts USING fts5(
--   id UNINDEXED,
--   synthesized_headline,
--   snippet,
--   entities,
--   content='archived_stories',
--   content_rowid='rowid'
-- );
-- INSERT INTO archived_stories_fts(rowid, id, synthesized_headline, snippet, entities)
--   SELECT rowid, id, synthesized_headline, snippet, entities FROM archived_stories;
--
-- CREATE TRIGGER archived_stories_ai AFTER INSERT ON archived_stories BEGIN
--   INSERT INTO archived_stories_fts(rowid, id, synthesized_headline, snippet, entities)
--   VALUES (new.rowid, new.id, new.synthesized_headline, new.snippet, new.entities);
-- END;
--
-- CREATE TRIGGER archived_stories_ad AFTER DELETE ON archived_stories BEGIN
--   INSERT INTO archived_stories_fts(archived_stories_fts, rowid, id, synthesized_headline, snippet, entities)
--   VALUES('delete', old.rowid, old.id, old.synthesized_headline, old.snippet, old.entities);
-- END;
--
-- CREATE TRIGGER archived_stories_au AFTER UPDATE ON archived_stories BEGIN
--   INSERT INTO archived_stories_fts(archived_stories_fts, rowid, id, synthesized_headline, snippet, entities)
--   VALUES('delete', old.rowid, old.id, old.synthesized_headline, old.snippet, old.entities);
--   INSERT INTO archived_stories_fts(rowid, id, synthesized_headline, snippet, entities)
--   VALUES (new.rowid, new.id, new.synthesized_headline, new.snippet, new.entities);
-- END;
--
-- PRAGMA foreign_keys=ON;

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
