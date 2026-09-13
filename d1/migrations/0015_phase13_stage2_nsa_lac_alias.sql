-- Phase 13 Stage 2: reviewed contextual alias closing the "NSA meeting a Chinese counterpart
-- about border negotiations" gold corpus gap. "NSA" is an ambiguous acronym (India's National
-- Security Advisor vs. the US National Security Agency vs. other countries' NSAs), so unlike
-- Kibithu it is not given its own topic — it resolves straight to lac, gated on India/China
-- border-negotiation context so it never fires for unrelated NSA mentions.
INSERT OR IGNORE INTO topic_aliases (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at) VALUES
  ('nsa', 'lac', 'acronym', 1, '{"requiredTerms":["china","border","doval"]}', 'published', '2026-09-13T00:00:00Z');
