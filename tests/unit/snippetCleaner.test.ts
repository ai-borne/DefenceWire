/**
 * Unit Tests for Snippet Cleaner & Boundary Truncation Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { cleanStorySnippet, stripSyndicationBoilerplate, truncateIntelligently } from '../../src/utils/snippetCleaner.js';

describe('Snippet Cleaner Utility', () => {
  describe('stripSyndicationBoilerplate', () => {
    it('strips "This article was originally published on idrw.org." prefix', () => {
      const input = 'This article was originally published on idrw.org. India is developing AMCA with stealth capability.';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('India is developing AMCA with stealth capability.');
    });

    it('strips trailing "Read the full article on idrw.org: ..." suffix', () => {
      const input = 'India is developing AMCA with stealth capability. Read the full article on idrw.org: Exclusive AMCA Details';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('India is developing AMCA with stealth capability.');
    });

    it('strips both leading and trailing IDRW boilerplate together', () => {
      const input = 'This article was originally published on idrw.org.\nIf several key cost and production milestones are met, India’s ambitious Advanced Medium Combat Aircraft (AMCA) programme will succeed.\nRead the full article on idrw.org: Exclusive: India’s AMCA Could Stay Below $100 Mil';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('If several key cost and production milestones are met, India’s ambitious Advanced Medium Combat Aircraft (AMCA) programme will succeed.');
    });

    it('strips WordPress "The post ... appeared first on ..." suffix', () => {
      const input = 'Ukraine’s intelligence report maps Zircon’s production chain and claims to identify U.S.-origin electronics inside the missile.\nThe post Russia’s Zircon May Not Be A Hypersonic Cruise Missile After All appeared first on TWZ.';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('Ukraine’s intelligence report maps Zircon’s production chain and claims to identify U.S.-origin electronics inside the missile.');
    });

    it('strips incomplete/truncated "appeared first on" suffix', () => {
      const input = 'Roketsan has conducted the first ground-launch tests of its ÇAKIR cruise missile.\nThe post Roketsan Tests Ground-Launched ÇAKIR Cruise Missile Against Land, Sea Targets appeared first on ';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('Roketsan has conducted the first ground-launch tests of its ÇAKIR cruise missile.');
    });

    it('strips "Originally published on [site]." prefix', () => {
      const input = 'Originally published on livefistdefence.com. DAC has cleared 97 additional Tejas Mk1A fighters.';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('DAC has cleared 97 additional Tejas Mk1A fighters.');
    });

    it('strips "[+1234 chars]" and "[...]" news aggregator suffixes', () => {
      const input = 'Indian Navy commissions 2nd Arihant class submarine INS Arighat. [+1450 chars]';
      const output = stripSyndicationBoilerplate(input);
      expect(output).toBe('Indian Navy commissions 2nd Arihant class submarine INS Arighat.');
    });
  });

  describe('truncateIntelligently', () => {
    it('leaves short text below maxLen untouched', () => {
      const input = 'Defence Minister reviews delivery timelines of the 83 LCA Tejas Mk1A fighters.';
      const output = truncateIntelligently(input, 280);
      expect(output).toBe(input);
    });

    it('prefers breaking at sentence boundary if within optimal length range', () => {
      const sentence1 = 'In Episode 1, we looked at a fundamental mistake companies make when entering the Indian defence ecosystem: there is no single customer called “the Army.”';
      const sentence2 = 'Different users have different operational requirements.';
      const sentence3 = 'The person who uses a system may not be the procurement authority or the budget holder.';
      const combined = `${sentence1} ${sentence2} ${sentence3}`;

      // Max length 240 should include sentence1 and sentence2 (total ~215 chars), ending cleanly with a period
      const output = truncateIntelligently(combined, 240, 100);
      expect(output).toBe(`${sentence1} ${sentence2}`);
      expect(output.endsWith('.')).toBe(true);
      expect(output.endsWith('...')).toBe(false);
    });

    it('breaks at word boundary with ellipsis if a single sentence exceeds maxLen', () => {
      const longSentence = 'The multi-role stealth combat drone program initiated by DRDO and ADA aims to validate autonomous flying-wing configuration along with advanced datalinks and internal weapon bays.';
      const output = truncateIntelligently(longSentence, 100);
      expect(output.length).toBeLessThanOrEqual(100);
      expect(output.endsWith('...')).toBe(true);
      expect(output).not.toContain('bay...'); // ensure whole word boundary
      expect(output).toBe('The multi-role stealth combat drone program initiated by DRDO and ADA aims to validate autonomous...');
    });

    it('cleans dangling punctuation before appending ellipsis', () => {
      const text = 'Testing military systems, radar capabilities, and avionics, under extreme high altitude conditions.';
      const output = truncateIntelligently(text, 50);
      expect(output).not.toContain(',...');
      expect(output.endsWith('...')).toBe(true);
    });

    it('does not produce double ellipses when input already ends with ellipsis', () => {
      const text = 'The development of special stand-off electronic warfare (EW) aircraft is leading to a change in the way...';
      const output = truncateIntelligently(text, 280);
      expect(output).toBe(text);
      expect(output).not.toContain('....');
    });
  });

  describe('cleanStorySnippet (Full Pipeline)', () => {
    it('handles null, undefined, or empty string gracefully', () => {
      expect(cleanStorySnippet(null)).toBe('');
      expect(cleanStorySnippet(undefined)).toBe('');
      expect(cleanStorySnippet('')).toBe('');
      expect(cleanStorySnippet('   ')).toBe('');
    });

    it('strips HTML tags and decodes HTML entities before cleaning', () => {
      const input = '<p>This article was originally published on <b>idrw.org</b>.</p><p>India&#039;s IACCS gives S-400 a decisive edge against regional EW threats.</p>';
      const output = cleanStorySnippet(input);
      expect(output).toBe("India's IACCS gives S-400 a decisive edge against regional EW threats.");
      expect(output).not.toContain('<p>');
      expect(output).not.toContain('&#039;');
      expect(output).not.toContain('idrw.org');
    });

    it('cleans real-world IDRW snippet completely', () => {
      const input = `This article was originally published on idrw.org.
Technotreon has developed an indigenous Rubberised Anti-Skid Track solution for India’s defence vehicles that can support  T-72,...
Read the full article on idrw.org: Pune-Based Technotreon Develops Indigenous`;

      const output = cleanStorySnippet(input, 280);
      expect(output).toContain('Technotreon has developed an indigenous Rubberised Anti-Skid Track solution');
      expect(output).not.toContain('This article was originally published');
      expect(output).not.toContain('Read the full article on idrw.org');
    });

    it('cleans Bharat Shakti snippet preventing abrupt cutoff mid-word', () => {
      const input = 'In Episode 1, we looked at a fundamental mistake companies make when entering the Indian defence ecosystem: there is no single customer called “the Army.” Different users have different operational requirements, and the person who uses a system may not be the ';
      const output = cleanStorySnippet(input, 260);
      expect(output.endsWith('the ')).toBe(false);
      expect(output.endsWith('the...')).toBe(false);
      expect(output).toBe('In Episode 1, we looked at a fundamental mistake companies make when entering the Indian defence ecosystem: there is no single customer called “the Army.”');
    });
  });
});
