-- Phase 5: curator-controlled topic governance. A separate counter table
-- preserves compatibility with existing positional inserts into registry tables.
CREATE TABLE topic_governance_versions (
  resource_type TEXT NOT NULL CHECK (resource_type IN ('topic','candidate','alias','implication','assignment')),
  resource_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  PRIMARY KEY (resource_type, resource_id)
);

CREATE INDEX idx_topic_candidates_review ON topic_candidates(status, proposed_topic_type, created_at DESC);
CREATE INDEX idx_topic_queue_pending ON topic_reclassification_queue(status, available_at);
