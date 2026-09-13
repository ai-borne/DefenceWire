-- Reviewed bootstrap vocabulary. Runtime D1 records remain open to later verified additions.
INSERT OR IGNORE INTO topics
  (id, display_name, display_hashtag, topic_type, description, status, verification_state,
   display_priority, registry_version, first_seen_at, last_seen_at, created_at, updated_at)
VALUES
  ('india', 'India', '#India', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('china', 'China', '#China', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('united-states', 'United States', '#UnitedStates', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('iran', 'Iran', '#Iran', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('jordan', 'Jordan', '#Jordan', 'country', NULL, 'active', 'published', 100, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('india-china', 'India-China', '#IndiaChina', 'bilateral_relationship', NULL, 'active', 'published', 90, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('lac', 'Line of Actual Control', '#LAC', 'operational_theatre', NULL, 'active', 'published', 95, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('loc', 'Line of Control', '#LOC', 'operational_theatre', NULL, 'active', 'published', 95, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-army', 'Indian Army', '#IndianArmy', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-navy', 'Indian Navy', '#IndianNavy', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-air-force', 'Indian Air Force', '#IndianAirForce', 'military_service', NULL, 'active', 'published', 80, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('drdo', 'Defence Research and Development Organisation', '#DRDO', 'organization', NULL, 'active', 'published', 75, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('hal', 'Hindustan Aeronautics Limited', '#HAL', 'company', NULL, 'active', 'published', 75, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('brahmos', 'BrahMos', '#BrahMos', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('tejas-mk1a', 'Tejas Mk1A', '#TejasMk1A', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('su-57', 'Sukhoi Su-57', '#Su57', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('rafale', 'Dassault Rafale', '#Rafale', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('s-400', 'S-400 Triumf', '#S400', 'platform', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('amca', 'Advanced Medium Combat Aircraft', '#AMCA', 'programme', NULL, 'active', 'published', 70, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('airbases', 'Airbases', '#Airbases', 'facility', NULL, 'active', 'published', 50, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indian-ocean-region', 'Indian Ocean Region', '#IndianOceanRegion', 'operational_theatre', NULL, 'active', 'published', 60, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
  ('indo-pacific', 'Indo-Pacific', '#IndoPacific', 'operational_theatre', NULL, 'active', 'published', 60, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_aliases
  (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at)
VALUES
  ('india', 'india', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('china', 'china', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('united states', 'united-states', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('usa', 'united-states', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('us', 'united-states', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('u s', 'united-states', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('america', 'united-states', 'spelling', 1, '{"requiredTerms":["government","military","country"]}', 'verified', '2026-09-13T00:00:00Z'),
  ('iran', 'iran', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('jordan', 'jordan', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('india china', 'india-china', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('lac', 'lac', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('line of actual control', 'lac', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('loc', 'loc', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('line of control', 'loc', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('iaf', 'indian-air-force', 'acronym', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian air force', 'indian-air-force', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian army', 'indian-army', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('indian navy', 'indian-navy', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('su57', 'su-57', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('su 57', 'su-57', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('sukhoi su 57', 'su-57', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('tejas mk1a', 'tejas-mk1a', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('lca tejas mk1a', 'tejas-mk1a', 'spelling', 0, NULL, 'published', '2026-09-13T00:00:00Z'),
  ('brahmos', 'brahmos', 'canonical', 0, NULL, 'published', '2026-09-13T00:00:00Z');

INSERT OR IGNORE INTO topic_implication_rules
  (source_topic_id, implied_topic_id, required_context_json, maximum_depth, verification_state)
VALUES
  ('lac', 'india', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published'),
  ('lac', 'china', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published'),
  ('lac', 'india-china', '{"eventTypes":["military","diplomatic"],"materialActors":["india","china"]}', 1, 'published');

-- Legacy rows become private review candidates; they never auto-create public topics.
INSERT OR IGNORE INTO topic_candidates
  (id, normalized_name, proposed_display_name, proposed_topic_type, legacy_source,
   legacy_source_id, status, created_at)
SELECT 'legacy-canonical-' || id, lower(trim(canonical_tag)), canonical_tag, NULL,
       'canonical_entities', id, 'pending', first_seen_at
FROM canonical_entities;

INSERT OR IGNORE INTO topic_candidates
  (id, normalized_name, proposed_display_name, proposed_topic_type, legacy_source,
   legacy_source_id, status, created_at)
SELECT 'legacy-discovered-' || id, lower(trim(name)), name, NULL,
       'discovered_entities', id, 'pending', first_seen_at
FROM discovered_entities;
