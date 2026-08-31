/**
 * Unit & Integration Tests for X.com / Twitter Operational Signal Adapter & Social Normalizer
 * Tests feed registration, URL builders, tweet sanitization, tracker stripping,
 * XML parsing, noise-gating, and circuit breaker resilience.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  X_ARMED_FORCES_FEEDS,
  X_OFFICIAL_HANDLES,
  SOCIAL_FEEDS,
  createXFeedConfig
} from '../../crawler/feedsSocial.js';
import {
  buildXFeedUrl,
  cleanTweetHeadline,
  extractSocialHandle,
  normalizeSocialPostItem,
  normalizeSocialText,
  stripTrackingUrls
} from '../../crawler/socialNormalizer.js';
import {
  fetchFeedWithCircuitBreaker,
  parseFeedXml,
  resetCircuitBreakers
} from '../../crawler/parser.js';
import { isDefenceRelevant } from '../../crawler/filters.js';
import { isSocialPostStrategic } from '../../crawler/socialFilters.js';
import { SourceTier } from '../../src/types/source.js';
import { StorySourceItem } from '../../src/types/news.js';
import { isValidUrl } from '../../src/utils/security.js';

const SAMPLE_RSS_BRIDGE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ADG PI - INDIAN ARMY (@adgpi)</title>
  <link rel="alternate" href="https://x.com/adgpi"/>
  <entry>
    <id>https://x.com/adgpi/status/1890001112223334445</id>
    <title>ADG PI - INDIAN ARMY: Indian Army &amp; IAF conduct joint combat airborne assault exercise in Ladakh sector. https://t.co/Xyz890 #IndianArmy #StrongAndCapable</title>
    <link rel="alternate" href="https://rss-bridge.defencewire.in/?action=display&amp;bridge=TwitterBridge&amp;context=By+username&amp;u=adgpi&amp;format=Atom#1890001112223334445"/>
    <published>2026-08-31T09:00:00Z</published>
    <content type="html">&lt;p&gt;Indian Army &amp;amp; IAF conduct joint combat airborne assault exercise in Ladakh sector validating rapid forward deployment and high-altitude combat readiness. &lt;a href="https://t.co/Xyz890"&gt;https://t.co/Xyz890&lt;/a&gt; #IndianArmy #StrongAndCapable&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>https://x.com/adgpi/status/1890005556667778889</id>
    <title>ADG PI - INDIAN ARMY: GOC-in-C laid wreath at War Memorial and attended solemn memorial ceremony followed by sports meet. https://t.co/Abc123 #IndianArmy</title>
    <link rel="alternate" href="https://rss-bridge.defencewire.in/?action=display&amp;bridge=TwitterBridge&amp;context=By+username&amp;u=adgpi&amp;format=Atom#1890005556667778889"/>
    <published>2026-08-31T07:00:00Z</published>
    <content type="html">&lt;p&gt;GOC-in-C laid wreath at War Memorial and attended solemn memorial ceremony followed by sports meet. &lt;a href="https://t.co/Abc123"&gt;https://t.co/Abc123&lt;/a&gt; #IndianArmy&lt;/p&gt;</content>
  </entry>
</feed>`;

describe('X.com Armed Forces Feeds Registry', () => {
  it('registers all 8 verified official armed forces X.com handles with TIER_1_SOCIAL', () => {
    expect(X_ARMED_FORCES_FEEDS.length).toBe(8);
    expect(X_OFFICIAL_HANDLES.length).toBe(8);
    expect(SOCIAL_FEEDS.length).toBe(14); // 6 YouTube + 8 X.com

    const expectedHandles = [
      { handle: '@adgpi', category: 'army' },
      { handle: '@IAF_MCC', category: 'airforce' },
      { handle: '@indiannavy', category: 'navy' },
      { handle: '@DRDO_India', category: 'tech' },
      { handle: '@DefenceMinIndia', category: 'strategic' },
      { handle: '@NorthernComd_IA', category: 'army' },
      { handle: '@EasternCommand_IA', category: 'army' },
      { handle: '@PRODefEast', category: 'strategic' }
    ];

    for (const exp of expectedHandles) {
      const feed = X_ARMED_FORCES_FEEDS.find((f) => f.name.includes(exp.handle));
      expect(feed).toBeDefined();
      expect(feed?.domain).toBe('x.com');
      expect(feed?.tier).toBe(SourceTier.TIER_1_SOCIAL);
      expect(feed?.defaultCategory).toBe(exp.category);
      expect(feed?.enabled).toBe(true);
      expect(isValidUrl(feed!.url)).toBe(true);
    }
  });

  it('supports multiple syndicated feed providers via buildXFeedUrl', () => {
    const rssBridgeUrl = buildXFeedUrl('@adgpi', 'rss_bridge');
    expect(rssBridgeUrl).toContain('rss-bridge');
    expect(rssBridgeUrl).toContain('u=adgpi');

    const nitterUrl = buildXFeedUrl('@IAF_MCC', 'nitter');
    expect(nitterUrl).toBe('https://nitter.net/IAF_MCC/rss');

    const twitterApiUrl = buildXFeedUrl('@DRDO_India', 'twitterapi');
    expect(twitterApiUrl).toContain('userName=DRDO_India');

    const customBase = buildXFeedUrl('@indiannavy', 'rss_bridge', 'https://custom-bridge.internal');
    expect(customBase).toContain('https://custom-bridge.internal');
  });

  it('correctly creates FeedConfig instances via createXFeedConfig', () => {
    const customConfig = createXFeedConfig(
      {
        handle: '@custom_iaf',
        name: 'Custom IAF Handler',
        domain: 'x.com',
        defaultCategory: 'airforce',
        isOfficialGov: true
      },
      'nitter',
      'https://nitter.internal'
    );

    expect(customConfig.id).toBe('feed-x-custom_iaf');
    expect(customConfig.tier).toBe(SourceTier.TIER_1_SOCIAL);
    expect(customConfig.url).toBe('https://nitter.internal/custom_iaf/rss');
    expect(customConfig.defaultCategory).toBe('airforce');
  });
});

describe('Social Text Normalizer & Sanitizer', () => {
  it('strips t.co and other URL shortener tracking links cleanly', () => {
    const raw = 'Maiden flight test successful https://t.co/aBc123XYZ from ITR Chandipur. Details: https://t.co/999';
    expect(stripTrackingUrls(raw)).toBe('Maiden flight test successful from ITR Chandipur. Details:');
  });

  it('decodes HTML entities and normalizes whitespace', () => {
    const raw = 'MoD &amp; IAF approve 97 LCA Tejas Mk1A procurement &gt; INR 65,000 Cr &quot;Make in India&quot;';
    const normalized = normalizeSocialText(raw);
    expect(normalized).toBe('MoD & IAF approve 97 LCA Tejas Mk1A procurement > INR 65,000 Cr "Make in India"');
  });

  it('synthesizes clean tweet headlines by stripping prefixes and trailing hashtags', () => {
    const tweet = 'ADG PI - INDIAN ARMY: Indian Army conducts combat exercise along Northern borders. https://t.co/Abc #IndianArmy #DefendersOfNation';
    const headline = cleanTweetHeadline(tweet);
    expect(headline).toBe('Indian Army conducts combat exercise along Northern borders.');
  });

  it('extracts Twitter/X handles correctly from strings and URLs', () => {
    expect(extractSocialHandle('https://x.com/adgpi/status/1890001112223334445')).toBe('@adgpi');
    expect(extractSocialHandle('https://twitter.com/IAF_MCC/status/987654')).toBe('@IAF_MCC');
    expect(extractSocialHandle('Official update from @DRDO_India on missile trials')).toBe('@DRDO_India');
    expect(extractSocialHandle('no handle present here')).toBeNull();
  });

  it('normalizes social StorySourceItems with canonical x.com URLs and verified author', () => {
    const rawItem: StorySourceItem = {
      id: 'feed-x-adgpi-123',
      title: 'ADG PI - INDIAN ARMY: Indian Army test fires advanced Pinaka MBRL rockets https://t.co/pinaka #IndianArmy',
      url: 'https://rss-bridge.defencewire.in/?action=display&u=adgpi#1890001112223334445',
      sourceName: 'ADG PI - Indian Army (@adgpi)',
      sourceDomain: 'x.com',
      tier: SourceTier.TIER_1_SOCIAL,
      publishedAt: '2026-08-31T09:00:00Z',
      snippet: 'Validating extended range multi-barrel rocket system precision strike capabilities.'
    };

    const normalized = normalizeSocialPostItem(rawItem, {
      handle: '@adgpi',
      name: 'ADG PI - Indian Army'
    });

    expect(normalized.title).toBe('Indian Army test fires advanced Pinaka MBRL rockets');
    expect(normalized.tier).toBe(SourceTier.TIER_1_SOCIAL);
    expect(normalized.url).toBe('https://x.com/adgpi/status/1890001112223334445');
    expect(normalized.author).toBe('ADG PI - Indian Army (@adgpi)');
  });
});

describe('X.com XML Feed Parsing & Noise Gating Integration', () => {
  const armyFeed = X_ARMED_FORCES_FEEDS[0]!;

  it('correctly parses and normalizes X.com syndicated feed entries', () => {
    const items = parseFeedXml(SAMPLE_RSS_BRIDGE_ATOM_XML, armyFeed);
    expect(items.length).toBe(2);

    const operational = items[0]!;
    expect(operational.tier).toBe(SourceTier.TIER_1_SOCIAL);
    expect(operational.title).toBe('Indian Army & IAF conduct joint combat airborne assault exercise in Ladakh sector.');
    expect(operational.snippet).toContain('validating rapid forward deployment');
    expect(operational.url).toContain('https://x.com/adgpi/status/1890001112223334445');
  });

  it('passes genuine tactical exercises through social noise gate while rejecting ceremonial posts', () => {
    const items = parseFeedXml(SAMPLE_RSS_BRIDGE_ATOM_XML, armyFeed);
    const operational = items[0]!;
    const ceremonial = items[1]!;

    expect(isSocialPostStrategic(operational, armyFeed)).toBe(true);
    expect(isDefenceRelevant(operational, armyFeed)).toBe(true);

    expect(isSocialPostStrategic(ceremonial, armyFeed)).toBe(false);
    expect(isDefenceRelevant(ceremonial, armyFeed)).toBe(false);
  });
});

describe('Circuit Breaker Resilience for X.com Feeds', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it('trips circuit breaker after consecutive failures and fails closed safely', async () => {
    const armyFeed = X_ARMED_FORCES_FEEDS[0]!;
    const mockFailingFetch = vi.fn().mockRejectedValue(new Error('Network connection refused'));

    // 3 consecutive failures
    await fetchFeedWithCircuitBreaker(armyFeed, { fetchFn: mockFailingFetch as any });
    await fetchFeedWithCircuitBreaker(armyFeed, { fetchFn: mockFailingFetch as any });
    const res3 = await fetchFeedWithCircuitBreaker(armyFeed, { fetchFn: mockFailingFetch as any });

    expect(res3).toEqual([]);
    expect(mockFailingFetch).toHaveBeenCalledTimes(3);

    // 4th call should immediately short-circuit without calling fetch
    const res4 = await fetchFeedWithCircuitBreaker(armyFeed, { fetchFn: mockFailingFetch as any });
    expect(res4).toEqual([]);
    expect(mockFailingFetch).toHaveBeenCalledTimes(3);
  });
});
