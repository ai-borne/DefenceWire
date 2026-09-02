/**
 * Unit Tests for Sansad Parliament Q&A Scraper & Parser
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  fetchSansadDefenceQuestions,
  normalizeQuestionNumber,
  normalizeSansadDate,
  parseSansadJsonPayload,
  parseSansadXmlFeed,
  SansadRawQuestion
} from '../../crawler/sansadScraper.js';
import { SourceTier } from '../../src/types/source.js';

describe('Sansad Parliament Q&A Scraper & Parser', () => {
  describe('normalizeSansadDate', () => {
    it('normalizes Indian DD/MM/YYYY, DD.MM.YYYY, and DD-MM-YYYY dates to YYYY-MM-DD', () => {
      expect(normalizeSansadDate('28/08/2026')).toBe('2026-08-28');
      expect(normalizeSansadDate('28.08.2026')).toBe('2026-08-28');
      expect(normalizeSansadDate('28-08-2026')).toBe('2026-08-28');
      expect(normalizeSansadDate('05/01/2026')).toBe('2026-01-05');
    });

    it('preserves valid ISO-8601 or YYYY-MM-DD date strings', () => {
      expect(normalizeSansadDate('2026-08-28')).toBe('2026-08-28');
      expect(normalizeSansadDate('2026-08-28T09:00:00Z')).toBe('2026-08-28');
    });

    it('parses RFC 2822 dates to YYYY-MM-DD', () => {
      expect(normalizeSansadDate('Fri, 28 Aug 2026 09:00:00 GMT')).toBe('2026-08-28');
    });

    it('returns a valid fallback ISO date for empty or invalid strings', () => {
      const fallback = normalizeSansadDate('');
      expect(fallback).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(normalizeSansadDate('invalid-date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('normalizeQuestionNumber', () => {
    it('formats raw numeric question numbers with SQ/USQ prefixes', () => {
      expect(normalizeQuestionNumber(2480, 'Unstarred')).toBe('USQ 2480');
      expect(normalizeQuestionNumber('145', 'Starred')).toBe('SQ 145');
    });

    it('normalizes Sansad file prefix codes like AU2480 and AS145', () => {
      expect(normalizeQuestionNumber('AU2480', 'Unstarred')).toBe('USQ 2480');
      expect(normalizeQuestionNumber('AS145', 'Starred')).toBe('SQ 145');
    });

    it('preserves already formatted strings cleanly', () => {
      expect(normalizeQuestionNumber('USQ 2480', 'Unstarred')).toBe('USQ 2480');
      expect(normalizeQuestionNumber('SQ 145', 'Starred')).toBe('SQ 145');
      expect(normalizeQuestionNumber('Question 500', 'Starred')).toBe('SQ 500');
    });
  });

  describe('parseSansadJsonPayload', () => {
    const rawQuestions: SansadRawQuestion[] = [
      {
        house: 'Lok Sabha',
        questionNo: 2480,
        type: 'Unstarred',
        date: '28/08/2026',
        ministry: 'Defence',
        minister: 'Raksha Rajya Mantri',
        member: 'Shri Rahul Sharma',
        subject: 'Progress of iDEX Scheme and Indigenisation Grants for Defence Startups',
        answer: 'Under the iDEX framework, 350+ contracts have been awarded with ₹2,000 Crore earmarked for innovation.',
        pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf'
      },
      {
        house: 'Rajya Sabha',
        questionNo: '145',
        type: 'Starred',
        date: '2026-08-29',
        ministry: 'Ministry of Defence',
        minister: 'Raksha Mantri',
        subject: 'Indigenous Engine Development for AMCA 5th Gen Fighter',
        answer: 'Joint development talks for 110kN aero-engine with international OEM are progressing under IDDM route.',
        url: 'https://sansad.in/rs/questions/detail/145'
      }
    ];

    it('transforms raw JSON question objects into verified StorySourceItem records', () => {
      const items = parseSansadJsonPayload(rawQuestions);
      expect(items.length).toBe(2);

      const lsItem = items[0]!;
      expect(lsItem.id).toContain('sansad-lok-sabha-usq-2480');
      expect(lsItem.title).toContain('Lok Sabha Unstarred Question No. 2480');
      expect(lsItem.title).toContain('Progress of iDEX Scheme');
      expect(lsItem.url).toBe('https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf');
      expect(lsItem.sourceName).toBe('Lok Sabha Secretariat');
      expect(lsItem.sourceDomain).toBe('sansad.in');
      expect(lsItem.tier).toBe(SourceTier.TIER_1_OFFICIAL);
      expect(lsItem.officialType).toBe('lok_sabha');
      expect(lsItem.isPrimary).toBe(true);
      expect(lsItem.snippet).toContain('Under the iDEX framework, 350+ contracts');
      expect(lsItem.parliamentMeta).toEqual({
        house: 'Lok Sabha',
        questionNumber: 'USQ 2480',
        questionType: 'Unstarred',
        answeringDate: '2026-08-28',
        ministry: 'Ministry of Defence',
        minister: 'Raksha Rajya Mantri',
        member: 'Shri Rahul Sharma',
        subject: 'Progress of iDEX Scheme and Indigenisation Grants for Defence Startups',
        pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf'
      });

      const rsItem = items[1]!;
      expect(rsItem.officialType).toBe('rajya_sabha');
      expect(rsItem.sourceName).toBe('Rajya Sabha Secretariat');
      expect(rsItem.parliamentMeta?.house).toBe('Rajya Sabha');
      expect(rsItem.parliamentMeta?.questionType).toBe('Starred');
      expect(rsItem.parliamentMeta?.questionNumber).toBe('SQ 145');
    });

    it('handles nested payload structures and sanitizes script/HTML in answers', () => {
      const wrappedPayload = {
        status: 'success',
        data: [
          {
            house: 'Lok Sabha',
            questionNo: '99',
            type: 'Starred',
            date: '2026-08-30',
            ministry: 'Defence',
            subject: 'Border Infrastructure <script>alert(1)</script>',
            answer: '<p>BRO has constructed <b>1,200 km</b> of strategic roads.</p>'
          }
        ]
      };

      const items = parseSansadJsonPayload(wrappedPayload);
      expect(items.length).toBe(1);
      expect(items[0]!.title).not.toContain('<script>');
      expect(items[0]!.snippet).toBe('BRO has constructed 1,200 km of strategic roads.');
      expect(items[0]!.snippet).not.toContain('<p>');
    });

    it('returns empty array when JSON payload is null, empty or invalid', () => {
      expect(parseSansadJsonPayload(null)).toEqual([]);
      expect(parseSansadJsonPayload({})).toEqual([]);
      expect(parseSansadJsonPayload('invalid json string')).toEqual([]);
    });
  });

  describe('parseSansadXmlFeed', () => {
    const SAMPLE_SANSAD_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Lok Sabha Defence Questions</title>
    <link>https://sansad.in</link>
    <item>
      <title><![CDATA[Lok Sabha Unstarred Question 3102: Indigenous Submarine Construction Project 75I]]></title>
      <link>https://sansad.in/ls/questions/3102</link>
      <pubDate>Mon, 31 Aug 2026 09:30:00 GMT</pubDate>
      <description><![CDATA[Field evaluation trials for Project 75I with AIP system are underway. Answering Minister: Raksha Mantri. Question No: USQ 3102.]]></description>
      <enclosure url="https://sansad.in/getFile/loksabhaquestions/annex/18/AU3102.pdf" type="application/pdf" />
    </item>
  </channel>
</rss>`;

    it('parses Sansad XML RSS feed and extracts parliament metadata correctly', () => {
      const items = parseSansadXmlFeed(SAMPLE_SANSAD_RSS, 'Lok Sabha');
      expect(items.length).toBe(1);

      const item = items[0]!;
      expect(item.officialType).toBe('lok_sabha');
      expect(item.tier).toBe(SourceTier.TIER_1_OFFICIAL);
      expect(item.parliamentMeta?.house).toBe('Lok Sabha');
      expect(item.parliamentMeta?.questionNumber).toBe('USQ 3102');
      expect(item.parliamentMeta?.questionType).toBe('Unstarred');
      expect(item.parliamentMeta?.pdfUrl).toBe('https://sansad.in/getFile/loksabhaquestions/annex/18/AU3102.pdf');
      expect(item.snippet).toContain('Field evaluation trials for Project 75I');
    });

    it('handles empty or malformed XML gracefully', () => {
      expect(parseSansadXmlFeed('', 'Lok Sabha')).toEqual([]);
      expect(parseSansadXmlFeed('<invalid xml>', 'Rajya Sabha')).toEqual([]);
    });
  });

  describe('fetchSansadDefenceQuestions', () => {
    it('fetches and parses Sansad questions via mock fetch successfully', async () => {
      const mockQuestions = [
        {
          house: 'Lok Sabha',
          questionNo: '1001',
          type: 'Unstarred',
          date: '2026-08-30',
          ministry: 'Defence',
          subject: 'Tejas Mk1A Deliveries',
          answer: 'HAL has ramped up production to 24 aircraft per year.',
          pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/AU1001.pdf'
        }
      ];

      const mockFetch = async () =>
        new Response(JSON.stringify(mockQuestions), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      const items = await fetchSansadDefenceQuestions({
        house: 'Lok Sabha',
        endpointUrl: 'https://sansad.in/api/ls/questions?ministry=defence',
        fetchFn: mockFetch as typeof fetch
      });

      expect(items.length).toBe(1);
      expect(items[0]!.parliamentMeta?.questionNumber).toBe('USQ 1001');
      expect(items[0]!.officialType).toBe('lok_sabha');
    });

    it('returns empty array when HTTP error or network failure occurs', async () => {
      const failingFetch = async () => new Response('Internal Server Error', { status: 500 });
      const items = await fetchSansadDefenceQuestions({
        endpointUrl: 'https://sansad.in/api/ls/questions',
        fetchFn: failingFetch as typeof fetch
      });
      expect(items).toEqual([]);
    });

    it('blocks SSRF attempts on internal/loopback IP endpoints', async () => {
      let fetchCalled = false;
      const trackingFetch = async () => {
        fetchCalled = true;
        return new Response('{}', { status: 200 });
      };

      const items = await fetchSansadDefenceQuestions({
        endpointUrl: 'http://169.254.169.254/latest/meta-data',
        fetchFn: trackingFetch as typeof fetch
      });

      expect(items).toEqual([]);
      expect(fetchCalled).toBe(false);
    });
  });
});
