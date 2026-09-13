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
