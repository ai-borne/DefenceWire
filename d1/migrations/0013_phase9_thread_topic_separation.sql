-- Phase 9: narrative continuity is independent from canonical topic membership.
-- Topic rows are additive navigation references; events retain their durable cluster IDs.
CREATE TABLE thread_topics (
  thread_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, topic_id),
  FOREIGN KEY (thread_id) REFERENCES story_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE INDEX idx_thread_topics_topic_thread ON thread_topics (topic_id, thread_id);

-- Preserve valid history on upgrade: canonical memberships already attached to
-- an event's durable cluster become navigation references for its thread.
INSERT OR IGNORE INTO thread_topics (thread_id, topic_id, linked_at)
SELECT e.thread_id, ct.topic_id, ct.assigned_at
FROM story_thread_events e
JOIN cluster_topics ct ON ct.cluster_id = e.cluster_id;

-- A durable cluster may be represented by a predecessor after a merge or split.
-- This index lets candidate lookup retain the original thread event without
-- changing its evidence-bearing cluster_id.
CREATE INDEX idx_cluster_lineage_successor_predecessor
  ON cluster_lineage (successor_cluster_id, predecessor_cluster_id);
