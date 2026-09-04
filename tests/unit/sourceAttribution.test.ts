/**
 * Unit Tests for Source Attribution & Geopolitical Scope Resolver
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  resolveGeopoliticalScope,
  getGeopoliticalFlag,
  renderSourceAttribution
} from '../../src/utils/sourceAttribution.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StorySourceItem, StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Source Attribution & Geopolitical Scope Resolver', () => {
  const mockPibSource: StorySourceItem = {
    id: 'src-pib-1',
    title: 'MoD Contract Signed for Tejas Radars',
    url: 'https://pib.gov.in/PressRelease.aspx?PRID=12345',
    sourceName: 'Press Information Bureau (PIB MoD)',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-09-04T08:00:00Z',
    isPrimary: true,
    officialType: 'pib_mod'
  };

  const mockDomesticNewsSource: StorySourceItem = {
    id: 'src-hindu-1',
    title: 'IAF Air Chief Reviews Northern Air Defences',
    url: 'https://thehindu.com/news/national/iaf-review',
    sourceName: 'The Hindu (National Security)',
    sourceDomain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-09-04T07:30:00Z'
  };

  const mockGlobalNewsSource: StorySourceItem = {
    id: 'src-twz-1',
    title: 'Stealth Drone Concepts Displayed at Indo-Pacific Expo',
    url: 'https://www.twz.com/sea/stealth-drone-concept',
    sourceName: 'The War Zone (TWZ)',
    sourceDomain: 'twz.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-09-04T06:00:00Z'
  };

  const mockJanesSource: StorySourceItem = {
    id: 'src-janes-1',
    title: 'Submarine Acoustic Signature Assessment',
    url: 'https://janes.com/defence-news/naval-weapons',
    sourceName: 'Janes Defence (Asia-Pacific)',
    sourceDomain: 'janes.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-09-04T05:00:00Z'
  };

  describe('resolveGeopoliticalScope', () => {
    it('identifies official government sources as domestic', () => {
      expect(resolveGeopoliticalScope(mockPibSource)).toBe('domestic');
      expect(resolveGeopoliticalScope({
        sourceName: 'Ministry of Defence',
        sourceDomain: 'mod.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL
      })).toBe('domestic');
    });

    it('identifies domestic news portals with .in or known Indian domains as domestic', () => {
      expect(resolveGeopoliticalScope(mockDomesticNewsSource)).toBe('domestic');
      expect(resolveGeopoliticalScope({ sourceDomain: 'aninews.in' })).toBe('domestic');
      expect(resolveGeopoliticalScope({ sourceDomain: 'idrw.org' })).toBe('domestic');
      expect(resolveGeopoliticalScope({ sourceDomain: 'livefistdefence.com' })).toBe('domestic');
      expect(resolveGeopoliticalScope({ sourceDomain: 'indianexpress.com' })).toBe('domestic');
    });

    it('identifies international defence portals as global', () => {
      expect(resolveGeopoliticalScope(mockGlobalNewsSource)).toBe('global');
      expect(resolveGeopoliticalScope(mockJanesSource)).toBe('global');
      expect(resolveGeopoliticalScope({ sourceDomain: 'defensenews.com' })).toBe('global');
      expect(resolveGeopoliticalScope({ sourceDomain: 'reuters.com' })).toBe('global');
      expect(resolveGeopoliticalScope({ sourceDomain: 'aviationweek.com' })).toBe('global');
      expect(resolveGeopoliticalScope({ sourceDomain: 'csis.org' })).toBe('global');
    });

    it('handles null, undefined, or empty source safely with domestic fallback', () => {
      expect(resolveGeopoliticalScope(null)).toBe('domestic');
      expect(resolveGeopoliticalScope(undefined)).toBe('domestic');
      expect(resolveGeopoliticalScope({})).toBe('domestic');
    });
  });

  describe('getGeopoliticalFlag', () => {
    it('returns domestic and global flags conforming to centralized strings SSOT', () => {
      expect(getGeopoliticalFlag('domestic')).toBe(STRINGS.story.domesticFlag);
      expect(getGeopoliticalFlag('domestic')).toBe('🇮🇳');
      expect(getGeopoliticalFlag('global')).toBe(STRINGS.story.globalFlag);
      expect(getGeopoliticalFlag('global')).toBe('🌏');
    });
  });

  describe('renderSourceAttribution', () => {
    it('renders unified top line with domestic flag, official badge, and time ago for official sources', () => {
      const el = renderSourceAttribution(mockPibSource);

      expect(el.className).toBe('dw-source-attribution');
      const flagEl = el.querySelector('.dw-source-flag');
      expect(flagEl?.textContent).toBe('🇮🇳');
      expect(flagEl?.getAttribute('aria-label')).toBe('Domestic (India)');

      const badgeEl = el.querySelector('.dw-official-badge');
      expect(badgeEl).not.toBeNull();
      expect(badgeEl?.textContent).toBe(STRINGS.badges.pibMod);

      const timeEl = el.querySelector('.dw-attribution-time');
      expect(timeEl).not.toBeNull();
      expect(timeEl?.textContent).toMatch(/• \d+[mhd] ago|• Just now/);
    });

    it('renders unified top line with global flag, clean brand name, and time ago for global sources', () => {
      const el = renderSourceAttribution(mockGlobalNewsSource);

      expect(el.className).toBe('dw-source-attribution');
      const flagEl = el.querySelector('.dw-source-flag');
      expect(flagEl?.textContent).toBe('🌏');
      expect(flagEl?.getAttribute('aria-label')).toBe('International / Global');

      const nameEl = el.querySelector('.dw-source-name');
      expect(nameEl).not.toBeNull();
      expect(nameEl?.textContent).toBe('The War Zone');

      const badgeEl = el.querySelector('.dw-official-badge');
      expect(badgeEl).toBeNull();

      const timeEl = el.querySelector('.dw-attribution-time');
      expect(timeEl).not.toBeNull();
    });

    it('sanitizes malicious plain text in source names', () => {
      const maliciousSource: StorySourceItem = {
        ...mockGlobalNewsSource,
        sourceName: '<script>alert("xss")</script>Dangerous Source'
      };
      const el = renderSourceAttribution(maliciousSource);
      const nameEl = el.querySelector('.dw-source-name');
      expect(nameEl?.innerHTML).not.toContain('<script>');
      expect(nameEl?.textContent).toContain('Dangerous Source');
    });
  });

  describe('Integration with StoryClusterView', () => {
    it('renders top attribution above headline and eliminates duplicate source line from footer', () => {
      const cluster: StoryCluster = {
        id: 'cluster-attribution-test',
        synthesizedHeadline: 'BrahMos Missile Extended Range Flight Test Successful',
        primarySource: mockPibSource,
        relatedCoverage: [],
        discussions: [],
        categories: ['strategic'],
        entities: ['BrahMos', 'DRDO'],
        defenceScore: 90,
        isLeadStory: false,
        createdAt: '2026-09-04T08:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z'
      };

      const newsVm = new NewsViewModel();
      const card = renderStoryCluster(cluster, newsVm);

      // 1. Top attribution exists before headline
      const topAttribution = card.querySelector('.dw-source-attribution');
      expect(topAttribution).not.toBeNull();
      expect(topAttribution?.querySelector('.dw-source-flag')?.textContent).toBe('🇮🇳');
      expect(topAttribution?.querySelector('.dw-official-badge')?.textContent).toBe(STRINGS.badges.pibMod);

      const headlineEl = card.querySelector('.dw-headline');
      expect(headlineEl).not.toBeNull();
      expect(topAttribution?.compareDocumentPosition(headlineEl!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

      // 2. Footer contains entity chips and action buttons without duplicate dw-source-line
      const footerEl = card.querySelector('.dw-cluster-footer');
      expect(footerEl).not.toBeNull();
      expect(footerEl?.querySelector('.dw-source-line')).toBeNull();

      const entityChips = footerEl?.querySelectorAll('.dw-entity-chip');
      expect(entityChips?.length).toBe(2);
      expect(entityChips?.[0]?.textContent).toBe('#BrahMos');

      const actionsGroup = footerEl?.querySelector('.dw-cluster-actions');
      expect(actionsGroup).not.toBeNull();
    });
  });
});
