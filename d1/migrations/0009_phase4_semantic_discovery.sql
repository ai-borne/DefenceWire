-- Phase 4: validated semantic-adjudication cache and source-grounded discovery evidence.
CREATE TABLE topic_semantic_cache (
  input_hash TEXT PRIMARY KEY,
  registry_version INTEGER NOT NULL CHECK (registry_version > 0),
  classifier_version TEXT NOT NULL,
  assignment_policy_version TEXT NOT NULL,
  retrieved_topic_ids_json TEXT NOT NULL CHECK (json_valid(retrieved_topic_ids_json)),
  validated_response_json TEXT CHECK (validated_response_json IS NULL OR json_valid(validated_response_json)),
  status TEXT NOT NULL CHECK (status IN ('validated', 'rejected', 'failed')),
  created_at TEXT NOT NULL
);

CREATE TABLE topic_candidate_evidence (
  candidate_id TEXT NOT NULL,
  source_article_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  evidence_start INTEGER NOT NULL CHECK (evidence_start >= 0),
  evidence_end INTEGER NOT NULL CHECK (evidence_end > evidence_start),
  evidence_content_hash TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (candidate_id, source_article_id, evidence_start, evidence_end),
  FOREIGN KEY (candidate_id) REFERENCES topic_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id),
  FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE
);

CREATE INDEX idx_topic_candidate_evidence_candidate
  ON topic_candidate_evidence(candidate_id, source_article_id);

CREATE INDEX idx_topic_semantic_cache_versions
  ON topic_semantic_cache(registry_version, classifier_version, assignment_policy_version);
