# ADR-001 — Canonical Topic Domain Boundaries and Classification Invariants

- Status: Accepted for Phase 0
- Date: 2026-09-13
- Scope: Canonical multi-topic knowledge base
- Related plan: `docs/Plans/canonical-topic-knowledge-base-execution-plan.md`
- Classification corpus: `tests/fixtures/topics/classification-corpus.json`

## Context

DefenceWire currently carries source articles inside mutable story clusters. Hashtags, extracted entities, story threads, graph nodes, programmes, and suppliers overlap in meaning but answer different product questions. Treating any one of those projections as the universal identity system causes unrelated events to merge, equivalent names to fragment, and classifications to drift between crawler runs.

The knowledge base needs canonical, multi-topic navigation without converting broad subjects into story threads or trusting publisher/model strings as identifiers.

## Decision

### 1. Domain records and ownership

| Record | Question answered | Authoritative owner |
|---|---|---|
| Source article | What did one publication publish? | `source_articles` |
| Article-topic mention | What topic evidence occurs in that publication? | `article_topic_mentions` |
| Story cluster | Which source articles cover the same event? | `story_clusters` and `cluster_sources` |
| Cluster-topic membership | Which subjects are materially relevant to that event? | `cluster_topics` |
| Topic identity | What is the canonical public concept and hashtag? | `topics` and `topic_aliases` |
| Assignment history | Why was membership proposed, accepted, suppressed, or removed? | `topic_assignment_runs` and `cluster_topic_decisions` |
| Story thread | Which events form one coherent evolving narrative? | `story_threads` and `story_thread_events` |
| Knowledge graph | What source-grounded factual relationship was observed? | `graph_nodes` and `graph_edges` |
| Programme or supplier | What structured domain facts describe that record? | Existing programme and supplier SSOTs |

`topics` contains public navigable concepts. It does not replace programme, supplier, graph, or thread records. Those records may reference a canonical topic, but retain ownership of their domain-specific fields.

`topic_relations` supports navigation such as related topics. Factual claims remain graph edges. Automated topic inheritance is allowed only through a separately reviewed implication rule.

`canonical_entities` and `discovered_entities` are legacy inputs to a reviewed migration. They are not automatically promoted into the new topic registry.

### 2. Topic identity and display

A topic has one immutable opaque ID and one current display hashtag. Aliases resolve input phrasing to that ID. UI and compatibility hashtags are generated from the topic record and never stored as assignment identity.

```text
USA / U.S. / US / United States
→ topic_id: united-states
→ display: #UnitedStates
```

Renaming changes display metadata, not the topic ID. A merge records `replaced_by_topic_id` and preserves redirects. Redirect cycles are invalid.

An unconditional normalized alias maps to at most one topic. A homonym may map to several topics only as a contextual alias with reviewed disambiguation rules. For example, `Jaguar` cannot resolve without evidence distinguishing an aircraft, company, or ordinary word.

### 3. Controlled topic types

The initial controlled types are:

- `country`
- `bilateral_relationship`
- `person`
- `office`
- `military_service`
- `military_unit`
- `organization`
- `company`
- `platform`
- `programme`
- `location`
- `facility`
- `exercise`
- `operation`
- `alliance`
- `operational_theatre`
- `conflict`
- `technology`
- `capability`
- `strategic_theme`

A class such as “airbase” or “fighter aircraft” becomes a public topic only when users can reasonably browse a coherent collection for that class. Entity type alone does not create a class hashtag.

Concrete types may enter a provisional lifecycle through deterministic gates. Broad capabilities and strategic themes require curator approval because semantic overlap creates fragmentation risk.

### 4. Assignment roles

Each cluster-topic assignment has one primary role:

- `subject`: central topic when no more specific semantic role applies
- `actor`: initiates the material action
- `target`: receives the material action
- `operator`: operates or fields the named platform, facility, or capability
- `location`: material geographic setting
- `facility`: material named installation
- `platform`: material named equipment or system
- `programme`: material acquisition or development programme
- `context`: necessary to understand the event but not a direct participant

If evidence supports several roles, deterministic precedence is `actor`, `target`, `operator`, `facility`, `platform`, `programme`, `location`, `subject`, then `context`. The decision ledger retains alternative evidence; the effective junction stores one role for stable querying and display.

### 5. Material relevance

A topic is assigned only when at least one of these is true:

1. It performs or receives the reported action.
2. The report announces a material change to it.
3. It is the material location, facility, platform, programme, or operator.
4. Removing the topic would materially change the meaning of the event summary.
5. A verified implication rule applies and all required context is present.

Incidental, navigational, quoted-history, boilerplate, publisher-tag, and keyword-only mentions do not qualify. A country or person appearing only in historical background is rejected unless the current event materially concerns that topic.

Related sources contribute evidence, but one weak related item cannot override clear primary-event scope. Disagreements remain visible in article mentions and assignment decisions.

### 6. Stable source-article identity

The preferred article identity is a hash of a canonical URL after:

- lowercasing scheme and host;
- removing fragments;
- removing reviewed tracking parameters;
- normalizing default ports and path encoding;
- applying known publisher canonical/redirect rules;
- preserving content-significant query parameters.

The original URL is retained. URL-less material uses a deterministic fallback of source identity, publication timestamp, normalized title, and content hash. A later discovered canonical URL aliases the fallback record rather than duplicating it.

### 7. Stable cluster identity and evolution

A cluster ID is minted once and does not depend on whichever article is currently primary. New crawler runs first match stored active clusters using event fingerprints, material entities, action signatures, time, and location. Selecting a different primary source updates cluster metadata without changing the ID.

An event fingerprint is a versioned matching aid, not the identifier itself. Fingerprint evolution cannot rewrite cluster IDs.

- Article movement updates `cluster_sources` and is audited.
- A merge chooses one surviving cluster, redirects predecessors, and preserves assignment/thread references.
- A split creates successors and records lineage from the predecessor.
- Curator locks propagate or require review according to the merge/split preview; they are never silently discarded.
- Public URLs and historical references follow redirects without cycles.

### 8. Evidence contract

Evidence records contain:

- `source_article_id`
- evidence start and end offsets in normalized source text
- normalized-text content hash
- evidence kind: `exact`, `contextual`, or `implication`
- extraction/classification run ID

Stored excerpts are bounded and sanitized for display. Offsets and the content hash make evidence auditable after reprocessing. Exact text proves that wording appeared; it does not independently prove entity type, truth, relevance, or source independence.

### 9. Source text and trust

Classification records which text tier was available:

1. authoritative official release body;
2. trusted fetched article body where acquisition is permitted;
3. feed title and snippet;
4. title only.

No result may imply full-article review when only a feed snippet was available. Source content is untrusted prompt data. It cannot alter schemas, identifiers, URLs, SQL, or curator actions.

Authoritative status is type-specific and comes from reviewed source metadata. An official source can corroborate its own announcement but does not automatically validate unrelated geopolitical claims.

### 10. Independent-source rule

Independent corroboration counts distinct editorial origins, not raw URLs or domains. Syndicated copies, mirrors, shared wire copy, and properties with a common editorial owner count once. `source_owner_key`, content similarity, attribution, and publication timing provide deterministic evidence; uncertain independence goes to review.

### 11. Determinism and reconciliation

Every assignment run records:

- cluster content fingerprint
- registry version
- classifier version
- assignment-policy version
- model cache key when semantic adjudication is used

Unchanged values reuse the validated prior result. Model temperature is not a determinism control. The model returns evidence-bearing proposals only; canonical IDs are registry-validated.

Each run computes a complete desired set. It must not union all historical hashtags. Immutable decisions are written first, then validated non-curator membership is reconciled atomically. Curator locks win. Low-confidence additions and removals remain shadow decisions until acceptance rules are satisfied.

Similar articles in one durable cluster share effective cluster topics while retaining article-specific mentions. Separate near-duplicate clusters must agree on directly evidenced core topics; materially justified secondary differences are allowed.

### 12. Topic relations and implications

A relation does not imply assignment. A verified implication rule specifies direction, required co-topics/context, maximum depth, and publication eligibility. Traversal is cycle-safe and bounded.

For example, `LAC` may imply `India`, `China`, and `India-China` only for a current military or diplomatic border event satisfying the reviewed context rule. Tourism in Kibithu and historical background do not qualify.

### 13. Lifecycle and public visibility

Topic lifecycle is `provisional`, `active`, `deprecated`, or `merged`. Decision lifecycle includes `shadow`, `accepted`, `suppressed`, `rejected`, and `superseded`.

Only active topics present in validated `cluster_topics` membership are public. Provisional topics and decision-ledger rows remain private. Promotion requires the approved independent-source threshold, a qualifying authoritative source plus deterministic type/relevance validation, or a curator.

### 14. Phase 0 release thresholds

- 100% canonical convergence for registered aliases in the gold corpus.
- 100% identical effective assignments for unchanged versioned inputs.
- At least 95% precision for public direct-topic assignments.
- At least 90% recall for explicit material subjects.
- No more than 2% incidental-topic false positives.
- No more than 1% unresolved near-duplicate topic candidates in the evaluated sample.
- Zero provisional or shadow topics in public responses.
- No new model call for an unchanged validated model-cache key.
- Deterministic classification p95 at or below 50 ms per cluster in the local benchmark, excluding network I/O.
- At most one bounded registry read operation per crawl and zero assignment mutations for unchanged inputs.
- At most one model request per uncached classification input hash and zero model requests for unchanged cached inputs.
- Topic classification for 100 clusters completes within five minutes under configured concurrency and timeout controls.
- Paid model spend defaults to zero; a paid provider requires an explicit configured per-run budget and fail-closed cap.

## Consequences

- Topic identity, evidence, event grouping, and narrative continuity are independently auditable.
- Primary-source changes cannot rename an event or churn its assignments.
- Similar articles converge on canonical core subjects without being forced into identical secondary classifications.
- Additional storage and governance workflows are required.
- Cluster merge/split and alias ambiguity become explicit operations rather than hidden heuristics.
- Legacy hashtag and entity records require reviewed migration rather than blind promotion.

## Rejected alternatives

- Publisher or model hashtag strings as identifiers: unstable and untrusted.
- `primaryTag` as a thread/topic identity: conflates subject navigation with event continuity.
- Permanent cross-run tag union: preserves false positives forever.
- Global one-to-one alias uniqueness: cannot represent legitimate homonyms.
- Generic graph traversal for topic inheritance: relations do not universally imply material story membership.
