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


