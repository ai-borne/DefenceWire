-- Phase 3 reviewed corpus vocabulary. These remain registry data, never a compiled classifier allowlist.
INSERT OR IGNORE INTO topics (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority, registry_version, first_seen_at, last_seen_at, created_at, updated_at) VALUES
  ('kibithu', 'Kibithu', '#Kibithu', 'location', 'active', 'published', 55, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('muwaffaq-salti-air-base', 'Muwaffaq Salti Air Base', '#MuwaffaqSaltiAB', 'facility', 'active', 'published', 55, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('france', 'France', '#France', 'country', 'active', 'published', 80, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('akash-ng', 'Akash-NG', '#AkashNG', 'platform', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('future-ready-combat-vehicle', 'Future Ready Combat Vehicle', '#FRCV', 'programme', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('pralay', 'Pralay', '#Pralay', 'platform', 'active', 'published', 65, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('philippines', 'Philippines', '#Philippines', 'country', 'active', 'published', 80, 2, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_aliases (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at) VALUES
  ('indian', 'india', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('chinese', 'china', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('kibithu', 'kibithu', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('muwaffaq salti air base', 'muwaffaq-salti-air-base', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('france', 'france', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('akash ng', 'akash-ng', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('akas ng', 'akash-ng', 'transliteration', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('future ready combat vehicle', 'future-ready-combat-vehicle', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('frcv', 'future-ready-combat-vehicle', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('pralay', 'pralay', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'), ('philippines', 'philippines', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_implication_rules (source_topic_id, implied_topic_id, required_context_json, maximum_depth, verification_state) VALUES
  ('muwaffaq-salti-air-base', 'airbases', '{"eventTypes":["military"]}', 1, 'published'),
  ('kibithu', 'lac', '{"materialActors":["india","china"],"eventTypes":["military","diplomatic"]}', 1, 'published'),
  ('india', 'india-china', '{"materialActors":["india","china"],"eventTypes":["military","diplomatic"]}', 1, 'published');
