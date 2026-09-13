-- Canonical topic registry. Public navigation identity lives here, not in legacy entity tables.
CREATE TABLE topics (
  id TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  display_name TEXT NOT NULL,
  display_hashtag TEXT NOT NULL UNIQUE CHECK (display_hashtag GLOB '#[A-Za-z0-9]*'),
  topic_type TEXT NOT NULL CHECK (topic_type IN (
    'country', 'bilateral_relationship', 'person', 'office', 'military_service',
    'military_unit', 'organization', 'company', 'platform', 'programme', 'location',
    'facility', 'exercise', 'operation', 'alliance', 'operational_theatre', 'conflict',
    'technology', 'capability', 'strategic_theme'
  )),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('provisional', 'active', 'deprecated', 'merged')),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  display_priority INTEGER NOT NULL DEFAULT 0,
  registry_version INTEGER NOT NULL CHECK (registry_version > 0),
  replaced_by_topic_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (replaced_by_topic_id) REFERENCES topics(id),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (replaced_by_topic_id IS NULL OR replaced_by_topic_id != id),
  CHECK ((status = 'merged') = (replaced_by_topic_id IS NOT NULL)),
  CHECK (verification_state != 'published' OR status = 'active')
);

CREATE INDEX idx_topics_runtime_registry ON topics(status, verification_state, registry_version);
CREATE INDEX idx_topics_redirect ON topics(replaced_by_topic_id);

CREATE TABLE topic_aliases (
  normalized_alias TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  alias_type TEXT NOT NULL CHECK (alias_type IN ('canonical', 'acronym', 'spelling', 'former_name', 'transliteration')),
  requires_context INTEGER NOT NULL DEFAULT 0 CHECK (requires_context IN (0, 1)),
  context_rule_json TEXT,
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (normalized_alias, topic_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CHECK (normalized_alias = lower(trim(normalized_alias))),
  CHECK ((requires_context = 1) = (context_rule_json IS NOT NULL)),
  CHECK (context_rule_json IS NULL OR json_valid(context_rule_json))
);

CREATE UNIQUE INDEX idx_topic_alias_unconditional ON topic_aliases(normalized_alias)
  WHERE requires_context = 0 AND verification_state != 'rejected';
CREATE INDEX idx_topic_alias_topic ON topic_aliases(topic_id);

CREATE TABLE topic_relations (
  source_topic_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related_to', 'part_of', 'operated_by', 'located_in', 'successor_to')),
  target_topic_id TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_source_article_id TEXT,
  evidence_start INTEGER,
  evidence_end INTEGER,
  evidence_content_hash TEXT,
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  PRIMARY KEY (source_topic_id, relation_type, target_topic_id),
  FOREIGN KEY (source_topic_id) REFERENCES topics(id),
  FOREIGN KEY (target_topic_id) REFERENCES topics(id),
  FOREIGN KEY (evidence_source_article_id) REFERENCES source_articles(id),
  CHECK (source_topic_id != target_topic_id),
  CHECK ((evidence_start IS NULL AND evidence_end IS NULL) OR
         (evidence_start >= 0 AND evidence_end > evidence_start AND evidence_source_article_id IS NOT NULL AND evidence_content_hash IS NOT NULL))
);

CREATE TABLE topic_implication_rules (
  source_topic_id TEXT NOT NULL,
  implied_topic_id TEXT NOT NULL,
  required_context_json TEXT NOT NULL CHECK (json_valid(required_context_json)),
  maximum_depth INTEGER NOT NULL CHECK (maximum_depth BETWEEN 1 AND 5),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unverified', 'provisional', 'verified', 'published', 'rejected')),
  PRIMARY KEY (source_topic_id, implied_topic_id),
  FOREIGN KEY (source_topic_id) REFERENCES topics(id),
  FOREIGN KEY (implied_topic_id) REFERENCES topics(id),
  CHECK (source_topic_id != implied_topic_id)
);

CREATE TABLE topic_candidates (
  id TEXT PRIMARY KEY,
  normalized_name TEXT NOT NULL,
  proposed_display_name TEXT NOT NULL,
  proposed_topic_type TEXT CHECK (proposed_topic_type IS NULL OR proposed_topic_type IN (
    'country', 'bilateral_relationship', 'person', 'office', 'military_service',
    'military_unit', 'organization', 'company', 'platform', 'programme', 'location',
    'facility', 'exercise', 'operation', 'alliance', 'operational_theatre', 'conflict',
    'technology', 'capability', 'strategic_theme'
  )),
  source_article_id TEXT,
  evidence_start INTEGER,
  evidence_end INTEGER,
  evidence_content_hash TEXT,
  legacy_source TEXT CHECK (legacy_source IN ('canonical_entities', 'discovered_entities', 'runtime_discovery')),
  legacy_source_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  resolved_topic_id TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  FOREIGN KEY (source_article_id) REFERENCES source_articles(id),
  FOREIGN KEY (resolved_topic_id) REFERENCES topics(id),
  UNIQUE (legacy_source, legacy_source_id),
  CHECK ((source_article_id IS NULL AND evidence_start IS NULL AND evidence_end IS NULL) OR
         (source_article_id IS NOT NULL AND evidence_start >= 0 AND evidence_end > evidence_start AND evidence_content_hash IS NOT NULL))
);

CREATE TRIGGER topic_redirect_cycle_insert
BEFORE INSERT ON topics WHEN NEW.replaced_by_topic_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.replaced_by_topic_id UNION ALL
      SELECT t.replaced_by_topic_id FROM topics t JOIN chain ON t.id = chain.id
      WHERE t.replaced_by_topic_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'topic redirect cycle') END;
END;

CREATE TRIGGER topic_redirect_cycle_update
BEFORE UPDATE OF replaced_by_topic_id ON topics WHEN NEW.replaced_by_topic_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.replaced_by_topic_id UNION ALL
      SELECT t.replaced_by_topic_id FROM topics t JOIN chain ON t.id = chain.id
      WHERE t.replaced_by_topic_id IS NOT NULL
    ) SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'topic redirect cycle') END;
END;

CREATE TRIGGER topic_lifecycle_transition
BEFORE UPDATE OF status ON topics
WHEN NOT (
  NEW.status = OLD.status OR
  (OLD.status = 'provisional' AND NEW.status IN ('active', 'deprecated', 'merged')) OR
  (OLD.status = 'active' AND NEW.status IN ('deprecated', 'merged')) OR
  (OLD.status = 'deprecated' AND NEW.status IN ('active', 'merged'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid topic lifecycle transition');
END;

CREATE TRIGGER topic_implication_cycle_insert
BEFORE INSERT ON topic_implication_rules
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id, depth) AS (
      SELECT NEW.implied_topic_id, 0 UNION ALL
      SELECT r.implied_topic_id, chain.depth + 1
      FROM topic_implication_rules r JOIN chain ON r.source_topic_id = chain.id
      WHERE chain.depth < 5
    ) SELECT 1 FROM chain WHERE id = NEW.source_topic_id
  ) THEN RAISE(ABORT, 'topic implication cycle') END;
END;

CREATE TRIGGER topic_implication_cycle_update
BEFORE UPDATE OF source_topic_id, implied_topic_id ON topic_implication_rules
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE chain(id, depth) AS (
      SELECT NEW.implied_topic_id, 0 UNION ALL
      SELECT r.implied_topic_id, chain.depth + 1
      FROM topic_implication_rules r JOIN chain ON r.source_topic_id = chain.id
      WHERE chain.depth < 5 AND NOT (
        r.source_topic_id = OLD.source_topic_id AND r.implied_topic_id = OLD.implied_topic_id
      )
    ) SELECT 1 FROM chain WHERE id = NEW.source_topic_id
  ) THEN RAISE(ABORT, 'topic implication cycle') END;
END;
