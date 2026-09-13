-- Phase 7: retry ledger for bounded historical topic classification.
CREATE TABLE topic_backfill_failures (
  cluster_id TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  last_error TEXT NOT NULL CHECK (length(last_error) <= 500),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE
);

CREATE INDEX idx_topic_backfill_failures_retry ON topic_backfill_failures(available_at, cluster_id);
