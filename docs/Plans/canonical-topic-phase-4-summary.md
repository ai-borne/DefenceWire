# Phase 4 Summary

Delivered:

- Added an explicitly opt-in Gemini semantic adjudicator with bounded registry
  retrieval, sanitized source input, strict JSON validation, source-exact
  evidence spans, registered-ID checks, and deterministic input hashes.
- Added persistent semantic-cache and candidate-evidence tables, regenerated
  the D1 schema, and de-duplicated identical semantic work within each crawl.
- Added private shadow decisions for model links and discoveries. Model output
  cannot mutate `cluster_topics` directly.
- Added source-grounded provisional topic creation for deterministically typed
  facilities, exercises, and operations only; aliases, themes, ambiguous types,
  and near duplicates remain review candidates. Promotion requires two
  independent source owners or one authoritative source.

Verification:

- `npm run check`
- Focused semantic-adjudicator, assignment-reconciliation, and D1 migration
  tests.

Tech debt discovered:

- The ingestion orchestrator exceeded the 300-line repository limit after the
  semantic configuration was added.
- Provisional promotion initially only evaluated a creation run, not subsequent
  corroborating evidence.

Resolution:

- Moved opt-in environment parsing into `crawler/topicModelConfig.ts`, restoring
  the file limit.
- Promotion now evaluates every discovery-evidence write. Automatic creation was
  tightened to types with deterministic naming evidence rather than trusting the
  model's type assertion alone.

Known limitations:

- Provider and production D1 measurements, broader reviewed type validators,
  and any model-link publication policy remain explicitly tracked in final
  Phase 15 of `canonical-topic-knowledge-base-execution-plan.md`.

Build status:

- Passed.

Test status:

- 192 test files and 1,450 tests passed. No tests were skipped or quarantined.
