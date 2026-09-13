-- Phase 13 Stage 2: fix ingestion_cluster_manifest's cluster_id uniqueness scope.
-- The manifest is a per-run bookkeeping ledger, not a claim of permanent cluster
-- ownership: the same durable cluster legitimately gets a new manifest row every
-- time it is touched by a later crawl run (new coverage, updated content, same
-- event identity). A table-wide UNIQUE(cluster_id) broke that on the very first
-- crawl in which a Stage 1 cluster was carried forward, since two different
-- runs' rows for the same cluster_id collide. Scoping uniqueness to
-- (ingestion_run_id, cluster_id) still stops a single run from claiming the
-- same cluster_id twice (a real planner bug), while allowing legitimate
-- cross-run continuity.
CREATE TABLE ingestion_cluster_manifest_new (
  ingestion_run_id TEXT NOT NULL,
  event_fingerprint TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  payload_key TEXT NOT NULL,
  PRIMARY KEY (ingestion_run_id, event_fingerprint, payload_hash),
  UNIQUE (ingestion_run_id, cluster_id),
  FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id)
);

INSERT INTO ingestion_cluster_manifest_new
  (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
  SELECT ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key
  FROM ingestion_cluster_manifest;

DROP TABLE ingestion_cluster_manifest;

ALTER TABLE ingestion_cluster_manifest_new RENAME TO ingestion_cluster_manifest;
