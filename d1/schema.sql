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
  override_type TEXT NOT NULL,    -- 'promote' | 'demote' | 'headline' | 'ssb' | 'ignore' | 'tender_add' | 'tender_correct' | 'tender_exclude' (MOAT3)
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

-- Defence Tender/RFP Tracker (MOAT3) — active tenders + DRDO TDF/iDEX grants.
-- Metadata only: full tender JSON/PDF payloads go to R2 (pdf_r2_key), same
-- discipline as the archived_stories cluster_json -> R2 migration above.
CREATE TABLE IF NOT EXISTS tenders (
  id TEXT PRIMARY KEY,                 -- native tender ID, e.g. '2026_IAF_787429_1'
  source TEXT NOT NULL,                -- 'defproc' | 'eprocure' | 'bdl' | 'mazagon_dock' | 'beml' | 'coast_guard' | 'idex' | 'tdf'
  title TEXT NOT NULL,
  organisation_chain TEXT NOT NULL,
  reference_number TEXT,
  category TEXT,                       -- 'Goods' | 'Services' | 'Works' | 'RFI' | 'grant' (idex/tdf)
  domain TEXT,                         -- Army/Navy/Air Force/DRDO/multi — Gemini-extracted
  published_at TEXT,
  closing_at TEXT,
  emd_amount REAL,
  iddm_percent REAL,                   -- Gemini-extracted, nullable
  program_ids TEXT,                    -- JSON array, linked via programMatcher.ts
  detail_url TEXT NOT NULL,
  pdf_r2_key TEXT,                     -- e.g. 'tenders/{id}.pdf'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed' | 'cancelled'
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tenders_closing_at ON tenders (closing_at ASC);
CREATE INDEX IF NOT EXISTS idx_tenders_source ON tenders (source, status);

CREATE VIRTUAL TABLE IF NOT EXISTS tenders_fts USING fts5(
  id UNINDEXED, title, organisation_chain,
  content='tenders', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS tenders_ai AFTER INSERT ON tenders BEGIN
  INSERT INTO tenders_fts(rowid, id, title, organisation_chain)
  VALUES (new.rowid, new.id, new.title, new.organisation_chain);
END;

CREATE TRIGGER IF NOT EXISTS tenders_ad AFTER DELETE ON tenders BEGIN
  INSERT INTO tenders_fts(tenders_fts, rowid, id, title, organisation_chain)
  VALUES('delete', old.rowid, old.id, old.title, old.organisation_chain);
END;

CREATE TRIGGER IF NOT EXISTS tenders_au AFTER UPDATE ON tenders BEGIN
  INSERT INTO tenders_fts(tenders_fts, rowid, id, title, organisation_chain)
  VALUES('delete', old.rowid, old.id, old.title, old.organisation_chain);
  INSERT INTO tenders_fts(rowid, id, title, organisation_chain)
  VALUES (new.rowid, new.id, new.title, new.organisation_chain);
END;

-- Per-source circuit breaker for the tender crawler. A separate table from
-- source_reputation on purpose: source_reputation tracks ranking/quality
-- signal, this tracks fetch health/captcha-gating for graceful degradation.
CREATE TABLE IF NOT EXISTS tender_source_health (
  source TEXT PRIMARY KEY,
  last_success_at TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_reason TEXT,            -- 'captcha_detected' | 'http_error' | 'schema_mismatch'
  updated_at TEXT NOT NULL
);

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
