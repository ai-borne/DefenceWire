/**
 * Unit Tests for Resilient RSS/Atom Feed Parser & Circuit Breakers
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { FeedConfig } from '../../crawler/feedTypes.js';
import {
  fetchFeedWithCircuitBreaker,
  getCircuitBreakerStatus,
  parseFeedXml,
  resetCircuitBreakers
} from '../../crawler/parser.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_FEED: FeedConfig = {
  id: 'mock-pib',
  name: 'PIB Defence (Mock)',
  url: 'https://pib.gov.in/test.xml',
  domain: 'pib.gov.in',
  tier: SourceTier.TIER_1_OFFICIAL,
  defaultCategory: 'strategic',
  enabled: true
};

const SAMPLE_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PIB Defence Press Releases</title>
    <link>https://pib.gov.in</link>
    <description>Official Indian Defence Releases</description>
    <item>
      <title><![CDATA[DAC Approves &amp; Clears 97 Additional Tejas Mk1A Fighter Aircraft]]></title>
      <link>https://pib.gov.in/PressReleasePage.aspx?PRID=2048999</link>
      <pubDate>Sun, 30 Aug 2026 08:30:00 GMT</pubDate>
      <description><![CDATA[<p>The Defence Acquisition Council chaired by Raksha Mantri accorded AoN for <b>₹67,000 Crore</b> procurement under Atmanirbhar Bharat.</p>]]></description>
    </item>
    <item>
      <title>Indian Navy inducts 2nd Arihant-class SSBN INS Arighat</title>
      <guid isPermaLink="true">https://pib.gov.in/PressReleasePage.aspx?PRID=2048888</guid>
      <pubDate>2026-08-29T10:00:00Z</pubDate>
      <description>Strategic deterrence strengthened with commissioning of nuclear submarine.</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Livefist Defence</title>
  <entry>
    <title>IAF Tejas Mk1A Squadron Prepares for Operational Induction</title>
    <link href="https://www.livefistdefence.com/iaf-tejas-mk1a-induction" />
    <updated>2026-08-30T09:00:00Z</updated>
    <summary>HAL flight testing reaches final phase ahead of first delivery.</summary>
  </entry>
</feed>`;

describe('Feed Parser & Circuit Breakers', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it('parses RSS 2.0 XML with CDATA, entities, and HTML tags stripped cleanly', () => {
    const items = parseFeedXml(SAMPLE_RSS_XML, MOCK_FEED);

    expect(items.length).toBe(2);

    const first = items[0];
    expect(first).toBeDefined();
    expect(first?.title).toBe('DAC Approves & Clears 97 Additional Tejas Mk1A Fighter Aircraft');
    expect(first?.url).toBe('https://pib.gov.in/PressReleasePage.aspx?PRID=2048999');
    expect(first?.sourceName).toBe('PIB Defence (Mock)');
    expect(first?.sourceDomain).toBe('pib.gov.in');
    expect(first?.tier).toBe(SourceTier.TIER_1_OFFICIAL);
    expect(first?.snippet).toContain('Defence Acquisition Council chaired by Raksha Mantri');
    expect(first?.snippet).not.toContain('<p>');
    expect(first?.snippet).not.toContain('<b>');

    const second = items[1];
    expect(second?.title).toBe('Indian Navy inducts 2nd Arihant-class SSBN INS Arighat');
    expect(second?.url).toBe('https://pib.gov.in/PressReleasePage.aspx?PRID=2048888');
  });

  it('assigns the same article id to the same feed item across two separate parse calls', () => {
    // Regression test: article ids used to embed Date.now(), so re-parsing
    // the same RSS item on the next 20-minute crawl produced a brand-new id.
    const firstParse = parseFeedXml(SAMPLE_RSS_XML, MOCK_FEED);
    const secondParse = parseFeedXml(SAMPLE_RSS_XML, MOCK_FEED);

    expect(firstParse[0]?.id).toBeDefined();
    expect(firstParse[0]?.id).toBe(secondParse[0]?.id);
    expect(firstParse[1]?.id).toBe(secondParse[1]?.id);
    expect(firstParse[0]?.id).not.toBe(firstParse[1]?.id);
  });

  it('parses Atom feed entries with link href and updated tags', () => {
    const items = parseFeedXml(SAMPLE_ATOM_XML, { ...MOCK_FEED, name: 'Livefist' });

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item?.title).toBe('IAF Tejas Mk1A Squadron Prepares for Operational Induction');
    expect(item?.url).toBe('https://www.livefistdefence.com/iaf-tejas-mk1a-induction');
    expect(item?.snippet).toBe('HAL flight testing reaches final phase ahead of first delivery.');
  });

  it('cleans numeric HTML entities like &#039; and &#8217; in titles and snippets', () => {
    const xmlWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Defence News</title>
    <item>
      <title>Russia&#039;s New MC-21 Airliner &amp; TATA&#039;s Javelin &#039;co-production&#039;</title>
      <link>https://frontierindia.com/russia-mc21</link>
      <pubDate>2026-08-31T10:00:00Z</pubDate>
      <description>Marking another milestone in Russia&#039;s aviation industry &#8211; &quot;strategic autonomy&quot;.</description>
    </item>
  </channel>
</rss>`;

    const items = parseFeedXml(xmlWithEntities, MOCK_FEED);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("Russia's New MC-21 Airliner & TATA's Javelin 'co-production'");
    expect(items[0]?.snippet).toContain("Russia's aviation industry – \"strategic autonomy\"");
    expect(items[0]?.title).not.toContain('&#039;');
    expect(items[0]?.snippet).not.toContain('&#039;');
    expect(items[0]?.snippet).not.toContain('&#8211;');
  });

  it('handles empty, invalid, or malformed XML gracefully without throwing', () => {
    expect(parseFeedXml('', MOCK_FEED)).toEqual([]);
    expect(parseFeedXml('not xml at all', MOCK_FEED)).toEqual([]);
    expect(parseFeedXml('<rss><channel><item><title></title></item></channel></rss>', MOCK_FEED)).toEqual([]);
  });

  it('fetches feed successfully when HTTP 200 is returned', async () => {
    const mockFetch = async () =>
      new Response(SAMPLE_RSS_XML, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });

    const items = await fetchFeedWithCircuitBreaker(MOCK_FEED, { fetchFn: mockFetch as typeof fetch });
    expect(items.length).toBe(2);

    const circuit = getCircuitBreakerStatus(MOCK_FEED.id);
    expect(circuit.isOpen).toBe(false);
    expect(circuit.failures).toBe(0);
  });

  it('trips circuit breaker after consecutive failures and returns empty results gracefully', async () => {
    const failingFetch = async () => new Response('Internal Error', { status: 500 });

    // Fail 1
    const res1 = await fetchFeedWithCircuitBreaker(MOCK_FEED, { fetchFn: failingFetch as typeof fetch });
    expect(res1).toEqual([]);
    expect(getCircuitBreakerStatus(MOCK_FEED.id).failures).toBe(1);

    // Fail 2
    await fetchFeedWithCircuitBreaker(MOCK_FEED, { fetchFn: failingFetch as typeof fetch });
    expect(getCircuitBreakerStatus(MOCK_FEED.id).failures).toBe(2);

    // Fail 3 -> Circuit Trips OPEN
    await fetchFeedWithCircuitBreaker(MOCK_FEED, { fetchFn: failingFetch as typeof fetch });
    expect(getCircuitBreakerStatus(MOCK_FEED.id).isOpen).toBe(true);

    // Immediate subsequent call should short-circuit and not even execute fetch
    let fetchCalled = false;
    const trackingFetch = async () => {
      fetchCalled = true;
      return new Response(SAMPLE_RSS_XML, { status: 200 });
    };

    const trippedRes = await fetchFeedWithCircuitBreaker(MOCK_FEED, { fetchFn: trackingFetch as typeof fetch });
    expect(trippedRes).toEqual([]);
    expect(fetchCalled).toBe(false);
  });

  it('extracts media:thumbnail and media:description from multimedia Atom feeds', () => {
    const atomWithMedia = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Indian Navy Media</title>
  <entry>
    <title>Stealth Frigate Conducts Live-Fire Missile Engagement in Arabian Sea</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=NAVY_TEST_101" />
    <updated>2026-08-31T08:00:00Z</updated>
    <media:group>
      <media:description>Indian Navy warship successfully neutralized high-speed aerial target with MRSAM missile.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/NAVY_TEST_101/hqdefault.jpg" />
    </media:group>
  </entry>
</feed>`;

    const items = parseFeedXml(atomWithMedia, { ...MOCK_FEED, domain: 'youtube.com', tier: SourceTier.TIER_1_SOCIAL });
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe('Stealth Frigate Conducts Live-Fire Missile Engagement in Arabian Sea');
    expect(items[0]?.url).toBe('https://www.youtube.com/watch?v=NAVY_TEST_101');
    expect(items[0]?.snippet).toContain('Indian Navy warship successfully neutralized');
    expect(items[0]?.imageUrl).toBe('https://i.ytimg.com/vi/NAVY_TEST_101/hqdefault.jpg');
    expect(items[0]?.tier).toBe(SourceTier.TIER_1_SOCIAL);
  });
});
