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
