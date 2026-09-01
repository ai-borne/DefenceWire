# AI Search Readiness & Generative Engine Optimization (GEO) — DefenceWire.in

This document outlines the architecture, standards, and operational guidelines implemented in DefenceWire.in to adhere to Generative Engine Optimization (GEO) and AI search visibility.

---

## 1. Machine-Readable Endpoints

| Endpoint | Standard | Purpose |
| :--- | :--- | :--- |
| `https://www.defencewire.in/llms.txt` | [llmstxt.org](https://llmstxt.org) | Standard summary for LLMs, domain taxonomy, and resource pointers |
| `https://www.defencewire.in/llms-full.txt` | Extended LLMs.txt | Full machine-readable schema, payload structure, and reliability tiers |
| `https://www.defencewire.in/robots.txt` | Robots Exclusion Protocol | Explicit directives permitting AI user-agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`, etc.) |
| `https://www.defencewire.in/data/news.json` | JSON Feed | Live data feed of synthesized story clusters and chronological river |
| `https://www.defencewire.in/sitemap.xml` | Sitemaps XML | Canonical index of all story permalink URLs |

---

## 2. Dynamic Story Prerendering & JSON-LD for AI Crawlers

When an AI search crawler (e.g. `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`) fetches a story permalink (`/story/:id`):

1. **User-Agent Detection** ([`src/seo/socialCrawlerDetection.ts`](file:///Users/sunil/Downloads/defencewire/src/seo/socialCrawlerDetection.ts)): Detects the AI crawler via regex patterns.
2. **Schema.org NewsArticle JSON-LD** ([`src/seo/storyMeta.ts`](file:///Users/sunil/Downloads/defencewire/src/seo/storyMeta.ts)): Injects structured `NewsArticle` schema into `<head>` with headline, snippet, datePublished, publisher, author, keywords, and citations.
3. **Semantic `<article>` HTML Body** ([`src/seo/htmlMetaInjector.ts`](file:///Users/sunil/Downloads/defencewire/src/seo/htmlMetaInjector.ts)): Injects full semantic HTML directly into the initial payload body without requiring JavaScript execution or clicking to expand.
4. **Client-Side Safety**: Regular human browsers receive the SPA shell, and [`src/main.ts`](file:///Users/sunil/Downloads/defencewire/src/main.ts#L74) executes `appElement.innerHTML = ''` upon mounting to guarantee zero double-renders.

---

## 3. Global Entity Consistency & Wikidata Alignment

### Standardized Brand Bio (Single Source of Truth):
> *"DefenceWire.in — India’s real-time institutional defence news aggregator covering military technology, strategic geopolitics, procurement, and SSB interview intelligence."*

### Cross-Platform Entity Sync Checklist:
- **Wikidata**:
  - `instance of`: `news aggregator` (Q1149652), `website` (Q35127)
  - `name`: DefenceWire.in / DefenceWire
  - `official website`: `https://www.defencewire.in/`
- **Social Profiles (Twitter/X, LinkedIn, GitHub)**:
  - Use identical bio and canonical URL link.
- **Google Search Console / Bing Webmaster Tools**:
  - Keep `https://www.defencewire.in/sitemap.xml` submitted and monitored.
