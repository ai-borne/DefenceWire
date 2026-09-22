# Story Badges & Topic Taxonomy Architecture

- **Scope:** Front-end Kicker Ribbon, Story Thread Tracking, and Canonical Topic Taxonomy
- **Location:** `docs/architecture/story-badges-and-topics-architecture.md`
- **Target Audience:** Incoming developers, autonomous coding agents, and system maintainers
- **Related ADR:** [`docs/architecture/ADR-001-canonical-topic-domain-boundaries.md`](./ADR-001-canonical-topic-domain-boundaries.md)
- **Primary Source Files:**
  - UI Component: [`src/components/StoryClusterView.ts`](../../src/components/StoryClusterView.ts)
  - Topic Badges: [`src/components/topics/TopicBadgeList.ts`](../../src/components/topics/TopicBadgeList.ts)
  - Stylesheets: [`src/styles/threads.css`](../../src/styles/threads.css), [`src/styles/topics.css`](../../src/styles/topics.css), [`src/styles/themes.css`](../../src/styles/themes.css)
  - Backend Classifier: [`crawler/topicClassificationPipeline.ts`](../../crawler/topicClassificationPipeline.ts)
  - Program Matcher: [`src/engine/programMatcher.ts`](../../src/engine/programMatcher.ts)

---

## 1. Executive Summary

Above news headlines in DefenceWire, stories may display up to two distinct types of pill badges within a single horizontal **Kicker Ribbon** (`.dw-cluster-kicker-row`):

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [★ LEAD BRIEFING]  [🔗 AMCA]  [#AMCA]  [#IndianAirForce]                 │
│ IAF Chief Backs Tejas Mk2 and AMCA Programmes                            │
│ Air Chief Marshal highlighted indigenous fighter modernization...       │
└──────────────────────────────────────────────────────────────────────────┘
```

These badges do **not** represent redundant hashtags or cosmetic styling variations. They are outputs of two fundamentally distinct intelligence architectures addressing two different user needs:

1. **The Story Thread Badge (`.dw-story-thread-badge`):** A **longitudinal program tracker** representing a multi-month chronological narrative arc for a specific defense platform, weapon system, or procurement project (e.g., `🔗 AMCA`, `🔗 Hawk and Jaguar Fleet Maintenance`).
2. **The Canonical Topic Badge (`.dw-topic-badge`):** A **categorical taxonomy hashtag** representing an officially indexed entity, organization, military branch, or theater in the Cloudflare D1 knowledge base (e.g., `#HAL`, `#DRDO`, `#IndianAirForce`, `#LAC`).

---

## 2. Comparison Matrix: Two Distinct Systems

| Dimension | 1. Story Thread Badge (`.dw-story-thread-badge`) | 2. Canonical Topic Hashtag (`.dw-topic-badge`) |
| :--- | :--- | :--- |
| **Visual Appearance** | Crimson red border/text (`--dw-text-accent: #B31919`), red tint background (`--dw-badge-tint-accent`), with link icon `🔗`. | Soft newsprint grey/sage in light mode (`--dw-badge-bg: #ECECE5`), pastel mint text in dark mode (`--dw-badge-text: #89D185`), prefixed with `#`. |
| **Core Question Answered** | *"What is the backstory and milestone timeline of this weapon/system?"* | *"What other articles and intelligence involve this organization or theater?"* |
| **Data Model Origin** | `cluster.programTags[0]` OR `cluster.ssbIntel.defenceTechTakeaway.platformOrSystem` | `cluster.canonicalTopics` (array of `PublicTopic` objects) |
| **Underlying Engine** | Deterministic regex ([`programMatcher.ts`](../../src/engine/programMatcher.ts)) and LLM hardware extraction ([`summarizerPrompt.ts`](../../crawler/summarizerPrompt.ts)). | Curated D1 SQL topic registry ([`schema.sql`](../../d1/schema.sql)), deterministic classifier, and semantic adjudicator. |
| **User Interaction** | **Modal Overlay:** Opens [`ThreadDetailModal.ts`](../../src/components/threads/ThreadDetailModal.ts) showing chronological milestones and evolution deltas. | **Route Navigation:** Navigates to `#/topic/<topic-id>` rendered by [`TopicKnowledgeBaseView.ts`](../../src/components/topics/TopicKnowledgeBaseView.ts). |
| **Mental Model** | Temporal narrative (Time / Evolution). | Categorical ontology (Space / Entity). |

---

## 3. Deep Dive: Story Thread Badge (`.dw-story-thread-badge`)

### 3.1 Purpose & User Value
Indian defense projects span years—often decades—between Defence Acquisition Council (DAC) approval, Acceptance of Necessity (AoN), Request for Proposal (RFP), prototype trials, contracts, and fleet induction. A single news article only captures an isolated daily event.

The Story Thread badge provides instant **long-arc continuity**:
- When clicked, it renders a chronological timeline of prior events and milestones linked to that specific platform.
- Readers can immediately contextualize recent developments against past announcements without performing manual searches.

### 3.2 Resolution & Data Lifecycle
In [`StoryClusterView.ts`](../../src/components/StoryClusterView.ts), `resolveStoryBadge(cluster)` evaluates candidates in order:
1. `cluster.programTags?.[0]` (Matched against curated defense programs in [`strategicPrograms.ts`](../../src/data/strategicPrograms.ts)).
2. `cluster.ssbIntel?.defenceTechTakeaway?.platformOrSystem` (Extracted by the crawler's structured LLM extraction for platform-focused news).

**Invariants & Filters:**
- Must not match stop tags in [`hashtagUtils.ts`](../../src/utils/hashtagUtils.ts) (`isNoiseTag()`).
- Generic boilerplate phrases such as `"strategic defence modernization"` are explicitly discarded.
- Never derived directly from unverified publisher RSS hashtags (preventing garbage tags like `#News` or `#IdrwTeam`).

### 3.3 UI Affordance
- Must always include the `🔗` link prefix (`threadStrings.badgePrefix` from [`threadStrings.ts`](../../src/resources/threadStrings.ts)).
- Uses `cursor: pointer;` with accessible ARIA labels (`aria-label="Story Threads: <label>"`).

---

## 4. Deep Dive: Canonical Topic Badge (`.dw-topic-badge`)

### 4.1 Purpose & User Value
The Canonical Topic system provides an unambiguous, curated taxonomy for cross-story aggregation. A user tracking Hindustan Aeronautics Limited (`#HAL`) or the Line of Actual Control (`#LAC`) can view an authoritative dossier of all reporting, related programs, corroborated suppliers, and allied topics.

### 4.2 Resolution & Data Lifecycle
1. **Curated Registry:** Backed by Cloudflare D1 tables `topics` and `topic_aliases` (see [`ADR-001`](./ADR-001-canonical-topic-domain-boundaries.md)). Topics have strict validation (`CHECK (display_hashtag GLOB '#[A-Za-z0-9]*')`).
2. **Classification Pipeline:** During ingestion, [`topicClassificationPipeline.ts`](../../crawler/topicClassificationPipeline.ts) applies:
   - Deterministic alias matching ([`deterministicTopicClassifier.ts`](../../crawler/deterministicTopicClassifier.ts)).
   - Semantic adjudication via model cache ([`topicSemanticAdjudicator.ts`](../../crawler/topicSemanticAdjudicator.ts)) for ambiguous mentions.
3. **Projection:** [`publicTopicProjection.ts`](../../crawler/publicTopicProjection.ts) executes a strict SQL query joining `cluster_topics` with active, published `topics`, sorted by `display_priority DESC`.
4. **UI Render:** [`renderTopicBadgeList()`](../../src/components/topics/TopicBadgeList.ts) renders up to 3 highest-priority topic badges, followed by a `+N` indicator if additional topics exist.

---

## 5. Front-End Architecture: The Unified Kicker Ribbon

### 5.1 DOM Structure
Both badges are co-located in the `.dw-cluster-kicker-row` element immediately above the synthesized headline:

```html
<article class="dw-cluster" id="cluster-...">
  <!-- 1. Unified Kicker Row -->
  <div class="dw-cluster-kicker-row">
    <!-- Optional: Lead Briefing Star -->
    <span class="dw-lead-tag">★ ALL / LEAD BRIEFING</span>

    <!-- Optional: Red Story Thread Badge (First) -->
    <button class="dw-story-thread-badge" type="button" aria-label="Story Threads: AMCA">
      🔗 AMCA
    </button>

    <!-- Optional: Pastel Topic Badge List (Second) -->
    <div class="dw-topic-badge-list" aria-label="Topics assigned to this story">
      <button class="dw-topic-badge" type="button" aria-label="Open topic knowledge base for AMCA">#AMCA</button>
      <button class="dw-topic-badge" type="button" aria-label="Open topic knowledge base for Indian Air Force">#IndianAirForce</button>
    </div>
  </div>

  <!-- 2. Synthesized Headline -->
  <h2 class="dw-headline"><a href="...">...</a></h2>
  
  <!-- 3. Primary Snippet & Footer -->
  ...
</article>
```

### 5.2 Ordering Invariants
The order inside `.dw-cluster-kicker-row` is strictly enforced:
1. **Lead Tag (`.dw-lead-tag`)** (if `isLead` is true)
2. **Thread Badge (`.dw-story-thread-badge`)** (if program/hardware thread resolved)
3. **Topic Badges (`.dw-topic-badge-list`)** (if canonical topics present)

**Design Rationale:** Placing the specific equipment/program thread first grounds the story in its operational hardware context before presenting broader organizational hashtags.

### 5.3 CSS & Responsive Styling
- **Container ([`threads.css`](../../src/styles/threads.css)):**
  ```css
  .dw-cluster-kicker-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
  }
  ```
- **Inline List Integration ([`topics.css`](../../src/styles/topics.css)):**
  ```css
  .dw-cluster-kicker-row .dw-topic-badge-list {
    margin: 0;
    display: inline-flex;
    align-items: center;
  }
  ```
- **Responsive Wrap:** On desktop, items sit cleanly on a single line. On mobile screens (e.g. $\le 480\text{px}$), `flex-wrap: wrap` allows badges to flow naturally to a second line without horizontal clipping or overflow.

---

## 6. Guardrails & Developer Rules

When modifying badges, maintainers and AI agents must follow these invariants:

1. **Never Derives Threads from Raw Hashtags:** Story threads must never be derived from raw `#tags` found in RSS feeds. Only curated `programTags` or extracted `defenceTechTakeaway.platformOrSystem` are valid.
2. **Preserve the `🔗` Affordance:** The thread badge must retain `threadStrings.badgePrefix` (`🔗`) to distinguish timeline triggers from route navigation.
3. **Respect Line-Count Limits (LOC):** All components have hard <= 300 LOC limits (`check-contracts.mjs`). Keep helper functions modular.
4. **Flex Child Shrink Guard:** All badges must satisfy custom Stylelint rule `dw/flex-child-shrink-guard`—never combine `white-space: nowrap` with fixed `min-width`/`min-height` unless `flex-shrink: 0` or `overflow: hidden` is declared.
5. **Tests Verify Intent:** When updating badge presentation, update [`storyThreadBadge.test.ts`](../../tests/unit/storyThreadBadge.test.ts) to verify both element presence and ordering semantics (`compareDocumentPosition`).
