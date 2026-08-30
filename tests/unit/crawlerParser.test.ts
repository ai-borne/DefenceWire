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

  it('parses Atom feed entries with link href and updated tags', () => {
    const items = parseFeedXml(SAMPLE_ATOM_XML, { ...MOCK_FEED, name: 'Livefist' });

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item?.title).toBe('IAF Tejas Mk1A Squadron Prepares for Operational Induction');
    expect(item?.url).toBe('https://www.livefistdefence.com/iaf-tejas-mk1a-induction');
    expect(item?.snippet).toBe('HAL flight testing reaches final phase ahead of first delivery.');
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
});
