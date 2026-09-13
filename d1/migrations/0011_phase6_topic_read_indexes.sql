-- Phase 6: public topic pages filter from effective membership, then join stable clusters.
CREATE INDEX idx_cluster_topics_topic_cluster ON cluster_topics(topic_id, cluster_id);
CREATE INDEX idx_cluster_topics_assigned_at ON cluster_topics(assigned_at DESC);
CREATE INDEX idx_cluster_sources_cluster_role ON cluster_sources(cluster_id, coverage_role, source_article_id);
