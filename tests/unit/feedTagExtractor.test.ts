/**
 * Unit Tests for Feed Category & Hashtag Extractor
 * Hard limit: <= 200 LOC.
 */

import { describe, expect, it } from 'vitest';
import { extractFeedTags, isNoiseCategoryTag } from '../../crawler/feedTagExtractor.js';

describe('feedTagExtractor', () => {
  describe('isNoiseCategoryTag', () => {
    it('blocks generic news, national, and editorial categories', () => {
      expect(isNoiseCategoryTag('News')).toBe(true);
      expect(isNoiseCategoryTag('#News')).toBe(true);
      expect(isNoiseCategoryTag('defence')).toBe(true);
      expect(isNoiseCategoryTag('Defense')).toBe(true);
      expect(isNoiseCategoryTag('india')).toBe(true);
      expect(isNoiseCategoryTag('Top News')).toBe(true);
      expect(isNoiseCategoryTag('press release')).toBe(true);
      expect(isNoiseCategoryTag('Editorial')).toBe(true);
      expect(isNoiseCategoryTag('')).toBe(true);
      expect(isNoiseCategoryTag('x')).toBe(true);
    });

    it('permits defence platforms, programs, agencies, and operational entities', () => {
      expect(isNoiseCategoryTag('Su-57')).toBe(false);
      expect(isNoiseCategoryTag('#Su57')).toBe(false);
      expect(isNoiseCategoryTag('Apache')).toBe(false);
      expect(isNoiseCategoryTag('TASL')).toBe(false);
      expect(isNoiseCategoryTag('EOS-05')).toBe(false);
      expect(isNoiseCategoryTag('LAC')).toBe(false);
      expect(isNoiseCategoryTag('Project 75I')).toBe(false);
      expect(isNoiseCategoryTag('DAC Clearance')).toBe(false);
    });
  });

  describe('extractFeedTags', () => {
    it('extracts and formats category and dc:subject elements into normalized hashtags', () => {
      const xml = `
        <item>
          <title>IAF initiates procurement</title>
          <category>Su-57</category>
          <category><![CDATA[Tejas Mk1A]]></category>
          <dc:subject>Project 75I</dc:subject>
        </item>
      `;

      const tags = extractFeedTags(xml);
      expect(tags).toContain('#Su-57');
      expect(tags).toContain('#TejasMk1A');
      expect(tags).toContain('#Project75I');
    });

    it('filters out generic noise categories from XML blocks', () => {
      const xml = `
        <item>
          <category>News</category>
          <category>India</category>
          <category><![CDATA[Defence]]></category>
          <dc:subject>Top News</dc:subject>
          <category>Apache</category>
        </item>
      `;

      const tags = extractFeedTags(xml);
      expect(tags).toEqual(['#Apache']);
    });

    it('extracts embedded hashtags from title and snippet while ignoring noise', () => {
      const xml = '<item></item>';
      const title = 'MoD clears #Su57 stealth jet acquisition and #TASL industrial partnership';
      const snippet = 'Strategic deterrence updated under #Atmanirbhar and #News banner.';

      const tags = extractFeedTags(xml, title, snippet);
      expect(tags).toContain('#Su57');
      expect(tags).toContain('#TASL');
      expect(tags).toContain('#Atmanirbhar');
      expect(tags).not.toContain('#News');
    });

    it('deduplicates tags across XML and text case-insensitively', () => {
      const xml = '<item><category>Apache</category></item>';
      const title = 'India signs for 6 more #apache helicopters';

      const tags = extractFeedTags(xml, title);
      expect(tags.length).toBe(1);
      expect(tags[0]).toBe('#Apache');
    });

    it('returns an empty array when no valid tags or hashtags are present', () => {
      const xml = '<item><category>News</category></item>';
      const tags = extractFeedTags(xml, 'Plain headline without tags', 'Plain description');
      expect(tags).toEqual([]);
    });

    it('strictly drops non-defence publisher category tags like India News, idrwTeam, Andhra Pradesh, and Space', () => {
      const xml = `
        <item>
          <category>India News</category>
          <category>idrwTeam</category>
          <category>Andhra Pradesh</category>
          <category>Space</category>
          <category>Trending</category>
          <category>Su-57</category>
          <category>TASL</category>
        </item>
      `;

      const tags = extractFeedTags(xml);
      expect(tags).toContain('#Su-57');
      expect(tags).toContain('#TASL');
      expect(tags).not.toContain('#IndiaNews');
      expect(tags).not.toContain('#IdrwTeam');
      expect(tags).not.toContain('#AndhraPradesh');
      expect(tags).not.toContain('#Space');
      expect(tags).not.toContain('#Trending');
    });
  });
});
