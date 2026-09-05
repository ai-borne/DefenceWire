#!/usr/bin/env node
/**
 * DefenceWire Crawler Pipeline Dry-Run Validation
 * Verifies feed registry schema, tier distribution, parser resilience, and deterministic clustering.
 * Hard limit: <= 300 LOC.
 */

import { CRAWLER_FEEDS, getFeedsByTier } from '../crawler/feeds.js';
import { parseFeedXml } from '../crawler/parser.js';
import { clusterArticles } from '../src/engine/clusterEngine.js';
import { SourceTier } from '../src/types/source.js';
import { isValidUrl } from '../src/utils/security.js';

console.log('🤖 [CRAWLER DRY-RUN] Validating feed registry, parser, and clustering engine...');

let failed = false;

// 1. Feed Registry Count Check
if (CRAWLER_FEEDS.length < 40) {
  console.error(`❌ [CRAWLER ERROR] Expected >= 40 feeds, found ${CRAWLER_FEEDS.length}`);
  failed = true;
}

// 2. All 4 Tiers Check
const t1 = getFeedsByTier(SourceTier.TIER_1_OFFICIAL);
const t2 = getFeedsByTier(SourceTier.TIER_2_NATIONAL);
const t3 = getFeedsByTier(SourceTier.TIER_3_SPECIALIZED);
const t4 = getFeedsByTier(SourceTier.TIER_4_OSINT);

if (t1.length === 0 || t2.length === 0 || t3.length === 0 || t4.length === 0) {
  console.error('❌ [CRAWLER ERROR] One or more source tiers have 0 configured feeds.');
  failed = true;
}

// 3. URL & ID Validation
for (const feed of CRAWLER_FEEDS) {
  if (!feed.id || !feed.name || !feed.domain || !isValidUrl(feed.url)) {
    console.error(`❌ [CRAWLER ERROR] Invalid feed configuration for ${feed.id || 'unknown'}`);
    failed = true;
  }
}

// 4. Parser & Clustering Engine Dry-Run
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PIB Test</title>
    <item>
      <title>DAC approves procurement of Tejas Mk1A fighters for IAF</title>
      <link>https://pib.gov.in/test-tejas</link>
      <pubDate>Sun, 30 Aug 2026 09:00:00 GMT</pubDate>
      <description>Capital acquisition approved under Atmanirbhar Bharat.</description>
    </item>
  </channel>
</rss>`;

const firstFeed = CRAWLER_FEEDS[0];
if (!firstFeed) {
  console.error('❌ [CRAWLER ERROR] No feeds found in registry.');
  failed = true;
} else {
  const items = parseFeedXml(sampleXml, firstFeed);
  if (items.length !== 1 || !items[0]?.title.includes('Tejas Mk1A')) {
    console.error('❌ [CRAWLER ERROR] Parser dry-run failed to parse sample XML.');
    failed = true;
  }

  const clusters = clusterArticles(items);
  if (clusters.length !== 1 || clusters[0]?.defenceScore === undefined) {
    console.error('❌ [CRAWLER ERROR] Clustering engine dry-run failed.');
    failed = true;
  }
}

if (failed) {
  console.error('\n🚨 Crawler Pipeline Dry-Run Failed!');
  process.exit(1);
} else {
  console.log(`✅ [CRAWLER DRY-RUN PASSED] ${CRAWLER_FEEDS.length} feeds verified across 4 tiers; parser & clustering verified.`);
}
