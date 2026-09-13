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
