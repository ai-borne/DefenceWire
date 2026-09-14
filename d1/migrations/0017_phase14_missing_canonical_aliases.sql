-- Phase 14: 8 published topics had zero topic_aliases rows, so
-- classifyTopicText (which only ever iterates registry.aliases, never
-- falls back to a topic's display_name) could never match them regardless
-- of how the news covers them — found via a live production shadow-eval
-- sample where "Indo-Pacific" appeared twice in a cluster's text but
-- #IndoPacific was never assigned. Adds the same canonical self-alias
-- pattern every other topic already has (e.g. china -> 'china').
INSERT OR IGNORE INTO topic_aliases (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at) VALUES
  ('amca', 'amca', 'acronym', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('airbases', 'airbases', 'canonical', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('drdo', 'drdo', 'acronym', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('hal', 'hal', 'acronym', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('indian ocean region', 'indian-ocean-region', 'canonical', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('indo pacific', 'indo-pacific', 'canonical', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('rafale', 'rafale', 'canonical', 0, NULL, 'published', '2026-09-14T00:00:00Z'),
  ('s 400', 's-400', 'canonical', 0, NULL, 'published', '2026-09-14T00:00:00Z');
