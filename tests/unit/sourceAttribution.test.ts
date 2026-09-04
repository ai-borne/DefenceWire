/**
 * Unit Tests for Geopolitical Flag Resolution & Source Attribution DOM Factory
 * Tests domestic vs global flags, official badge integration, relative time, and XSS sanitization.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveGeopoliticalScope, renderSourceAttribution } from '../../src/utils/sourceAttribution.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Geopolitical Flag Resolution (resolveGeopoliticalScope)', () => {
  it('resolves domestic flag for Indian official government and parliamentary sources', () => {
    const pibSource: StorySourceItem = {
      id: 'pib-1',
      title: 'MoD Signs Contract',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=100',
      sourceName: 'Press Information Bureau (PIB MoD)',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-01T10:00:00Z',
      officialType: 'pib_mod'
    };

    const lokSabhaSource: StorySourceItem = {
      id: 'ls-1',
      title: 'Procurement of Fighter Jets',
      url: 'https://loksabha.nic.in/q1',
      sourceName: 'Lok Sabha Secretariat',
      sourceDomain: 'loksabha.nic.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-01T10:00:00Z',
      parliamentMeta: {
        house: 'Lok Sabha',
        questionNumber: '101',
        questionType: 'Starred',
        answeringDate: '2026-08-25',
        ministry: 'Defence'
      }
    };

    expect(resolveGeopoliticalScope(pibSource)).toBe(STRINGS.story.domesticFlag);
    expect(resolveGeopoliticalScope(lokSabhaSource)).toBe(STRINGS.story.domesticFlag);
  });

  it('resolves domestic flag for Indian national wire, news media, and defence portals', () => {
    const sources: Partial<StorySourceItem>[] = [
      { sourceName: 'The Hindu (National Security)', sourceDomain: 'thehindu.com' },
      { sourceName: 'The Indian Express (Defence)', sourceDomain: 'indianexpress.com' },
      { sourceName: 'Asian News International', sourceDomain: 'aninews.in' },
      { sourceName: 'ThePrint (Defence & Strategic Affairs)', sourceDomain: 'theprint.in' },
      { sourceName: 'Livefist Defence', sourceDomain: 'livefistdefence.com' },
      { sourceName: 'IDRW (Indian Defence Research Wing)', sourceDomain: 'idrw.org' },
      { sourceName: 'Bharat Shakti (Nitin Gokhale)', sourceDomain: 'bharatshakti.in' },
      { sourceName: 'Hindustan Times', sourceDomain: 'hindustantimes.com' },
      { sourceName: 'Manohar Parrikar IDSA', sourceDomain: 'idsa.in' }
    ];

    for (const src of sources) {
      const full = {
        id: 'test',
        title: 'Headline',
        url: 'https://example.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-09-01T10:00:00Z',
        ...src
      } as StorySourceItem;
      expect(resolveGeopoliticalScope(full)).toBe(STRINGS.story.domesticFlag);
    }
  });

  it('resolves global flag for foreign and international defence sources', () => {
    const foreignSources: Partial<StorySourceItem>[] = [
      { sourceName: 'Reuters (India Security)', sourceDomain: 'reuters.com' },
      { sourceName: 'Janes Defence Intelligence', sourceDomain: 'janes.com' },
      { sourceName: 'Defense News', sourceDomain: 'defensenews.com' },
      { sourceName: 'The War Zone (TWZ)', sourceDomain: 'twz.com' },
      { sourceName: 'SIPRI', sourceDomain: 'sipri.org' },
      { sourceName: 'Naval News', sourceDomain: 'navalnews.com' },
      { sourceName: 'USNI News', sourceDomain: 'usni.org' },
      { sourceName: 'Breaking Defense', sourceDomain: 'breakingdefense.com' },
      { sourceName: 'BBC News', sourceDomain: 'bbc.com' }
    ];

    for (const src of foreignSources) {
      const full = {
        id: 'test',
        title: 'Headline',
        url: 'https://example.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-09-01T10:00:00Z',
        ...src
      } as StorySourceItem;
      expect(resolveGeopoliticalScope(full)).toBe(STRINGS.story.globalFlag);
    }
  });
});

describe('Source Attribution DOM Rendering (renderSourceAttribution)', () => {
  it('renders domestic flag, sanitized source name, and relative time for standard Indian source', () => {
    const source: StorySourceItem = {
      id: 'src-hindu',
      title: 'Navy Commissions New Stealth Frigate',
      url: 'https://thehindu.com/news/national/frigate',
      sourceName: 'The Hindu (National Security)',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    };

    const el = renderSourceAttribution(source);
    expect(el.className).toBe('dw-source-attribution');

    const flagEl = el.querySelector('.dw-geo-flag');
    expect(flagEl).not.toBeNull();
    expect(flagEl?.textContent).toBe(STRINGS.story.domesticFlag);

    const nameEl = el.querySelector('.dw-source-name');
    expect(nameEl).not.toBeNull();
    expect(nameEl?.textContent).toBe('The Hindu');

    const timeEl = el.querySelector('.dw-river-meta');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.textContent).toContain('2h ago');

    // Should NOT contain official badge
    expect(el.querySelector('.dw-official-badge-container')).toBeNull();
  });

  it('renders global flag, sanitized source name, and relative time for foreign source', () => {
    const source: StorySourceItem = {
      id: 'src-reuters',
      title: 'Global Aerospace Trends',
      url: 'https://reuters.com/aerospace',
      sourceName: 'Reuters (India Security)',
      sourceDomain: 'reuters.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
    };

    const el = renderSourceAttribution(source);
    const flagEl = el.querySelector('.dw-geo-flag');
    expect(flagEl?.textContent).toBe(STRINGS.story.globalFlag);

    const nameEl = el.querySelector('.dw-source-name');
    expect(nameEl?.textContent).toBe('Reuters');

    const timeEl = el.querySelector('.dw-river-meta');
    expect(timeEl?.textContent).toContain('30m ago');
  });

  it('integrates official badge and omits plain source name when source is verified official', () => {
    const source: StorySourceItem = {
      id: 'src-mod',
      title: 'DAC Approves Capital Acquisition Projects',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=200',
      sourceName: 'Press Information Bureau (PIB MoD)',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      officialType: 'pib_mod'
    };

    const el = renderSourceAttribution(source);

    // Domestic flag present
    const flagEl = el.querySelector('.dw-geo-flag');
    expect(flagEl?.textContent).toBe(STRINGS.story.domesticFlag);

    // Official badge container present
    const badgeEl = el.querySelector('.dw-official-badge-container');
    expect(badgeEl).not.toBeNull();
    expect(badgeEl?.textContent).toContain(STRINGS.badges.pibMod);

    // Plain source name is replaced by the official badge
    expect(el.querySelector('.dw-source-name')).toBeNull();

    // Relative time is retained
    const timeEl = el.querySelector('.dw-river-meta');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.textContent).toContain('1h ago');
  });

  it('sanitizes malicious script tags and entities in sourceName to prevent XSS injection', () => {
    const maliciousSource: StorySourceItem = {
      id: 'xss-src',
      title: 'Safe Headline',
      url: 'https://evil.com/xss',
      sourceName: '<script>alert("XSS")</script>Injected Wire',
      sourceDomain: 'evil.com',
      tier: SourceTier.TIER_4_OSINT,
      publishedAt: new Date().toISOString()
    };

    const el = renderSourceAttribution(maliciousSource);
    expect(el.querySelectorAll('script').length).toBe(0);
    const nameEl = el.querySelector('.dw-source-name');
    expect(nameEl?.innerHTML).not.toContain('<script>');
    expect(nameEl?.textContent).toContain('Injected Wire');
  });

  it('gracefully handles missing publishedAt without rendering empty relative time', () => {
    const sourceNoTime: StorySourceItem = {
      id: 'no-time',
      title: 'Undated Report',
      url: 'https://aninews.in/report',
      sourceName: 'ANI',
      sourceDomain: 'aninews.in',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: ''
    };

    const el = renderSourceAttribution(sourceNoTime);
    expect(el.querySelector('.dw-river-meta')).toBeNull();
    expect(el.querySelector('.dw-source-name')?.textContent).toBe('ANI');
  });
});
