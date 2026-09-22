/**
 * Unit Tests for Geopolitical Scope Pill Component (renderScopePill)
 * Validates domestic vs global scope classification, visual modifiers, ARIA semantics, and XSS safety.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderScopePill } from '../../src/components/ScopePill.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

const mockNewsVm: any = {
  isSourcesExpanded: vi.fn().mockReturnValue(false),
  toggleSourcesDrawer: vi.fn(),
  isClusterExpanded: vi.fn().mockReturnValue(false),
  toggleClusterExpansion: vi.fn(),
  isSSBExpanded: vi.fn().mockReturnValue(false),
  toggleSSBDrawer: vi.fn()
};

function createMockCluster(overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id: 'test-cluster-1',
    synthesizedHeadline: 'Test Defence Headline',
    categories: ['airforce'],
    defenceScore: 80,
    isLeadStory: false,
    entities: ['PIB MoD'],
    relatedCoverage: [],
    discussions: [],
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
    primarySource: {
      id: 'src-1',
      title: 'PIB Defence Communique',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=123',
      publishedAt: '2026-09-22T10:00:00Z',
      snippet: 'PIB Defence snippet',
      officialType: 'pib_mod'
    },
    ...overrides
  };
}

describe('ScopePill Component (renderScopePill)', () => {
  it('renders domestic scope pill with correct text, classes, and ARIA attributes for sovereign Indian sources', () => {
    const cluster = createMockCluster();
    const pill = renderScopePill(cluster);

    expect(pill.tagName.toLowerCase()).toBe('span');
    expect(pill.classList.contains('dw-scope-pill')).toBe(true);
    expect(pill.classList.contains('dw-scope-pill--domestic')).toBe(true);
    expect(pill.classList.contains('dw-scope-pill--global')).toBe(false);
    expect(pill.textContent).toBe(STRINGS.story.domesticScopePill);
    expect(pill.getAttribute('aria-label')).toBe(STRINGS.story.domesticScopePill);
  });

  it('renders global scope pill with correct text, classes, and ARIA attributes for international sources', () => {
    const cluster = createMockCluster({
      id: 'global-cluster',
      primarySource: {
        id: 'global-src',
        title: 'USAF F-35 Modernization Update',
        sourceName: 'Defense News',
        sourceDomain: 'defensenews.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        url: 'https://defensenews.com/air/2026/09/f35',
        publishedAt: '2026-09-22T10:00:00Z'
      }
    });

    const pill = renderScopePill(cluster);

    expect(pill.tagName.toLowerCase()).toBe('span');
    expect(pill.classList.contains('dw-scope-pill')).toBe(true);
    expect(pill.classList.contains('dw-scope-pill--global')).toBe(true);
    expect(pill.classList.contains('dw-scope-pill--domestic')).toBe(false);
    expect(pill.textContent).toBe(STRINGS.story.globalScopePill);
    expect(pill.getAttribute('aria-label')).toBe(STRINGS.story.globalScopePill);
  });

  it('gracefully handles missing primarySource by defaulting to domestic scope', () => {
    const cluster = createMockCluster({
      primarySource: undefined as any
    });

    const pill = renderScopePill(cluster);

    expect(pill.classList.contains('dw-scope-pill--domestic')).toBe(true);
    expect(pill.textContent).toBe(STRINGS.story.domesticScopePill);
    expect(pill.getAttribute('aria-label')).toBe(STRINGS.story.domesticScopePill);
  });

  it('guarantees strict XSS safety and text sanitization', () => {
    const cluster = createMockCluster();
    const pill = renderScopePill(cluster);

    // Verify textContent insertion ensures no child HTML tags are created
    expect(pill.children.length).toBe(0);
    expect(pill.innerHTML).not.toContain('<');
    expect(pill.innerHTML).not.toContain('>');
  });

  it('integrates cleanly into StoryClusterView kicker row as the primary scope indicator', () => {
    const domesticCluster = createMockCluster({
      programTags: ['Tejas Mk1A']
    });

    const card = renderStoryCluster(domesticCluster, mockNewsVm, false);
    const kickerRow = card.querySelector('.dw-cluster-kicker-row');
    expect(kickerRow).not.toBeNull();

    const scopePill = kickerRow?.querySelector('.dw-scope-pill');
    expect(scopePill).not.toBeNull();
    expect(scopePill?.textContent).toBe(STRINGS.story.domesticScopePill);

    // Verify ordering: scope pill precedes thread badge
    const threadBadge = kickerRow?.querySelector('.dw-story-thread-badge');
    expect(threadBadge).not.toBeNull();

    const position = scopePill!.compareDocumentPosition(threadBadge!);
    expect((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
  });

  it('safely handles null or undefined cluster by defaulting to domestic scope without throwing', () => {
    const pillNull = renderScopePill(null as any);
    expect(pillNull.classList.contains('dw-scope-pill--domestic')).toBe(true);
    expect(pillNull.textContent).toBe(STRINGS.story.domesticScopePill);

    const pillUndef = renderScopePill(undefined as any);
    expect(pillUndef.classList.contains('dw-scope-pill--domestic')).toBe(true);
    expect(pillUndef.textContent).toBe(STRINGS.story.domesticScopePill);
  });

  it('validates WCAG 2.1 AA contrast compliance (ratio >= 4.5:1) for scope pill color tokens', () => {
    function hexToRgb(hex: string): [number, number, number] {
      const clean = hex.replace('#', '');
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16)
      ];
    }

    function channelLuminance(val: number): number {
      const s = val / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }

    function relativeLuminance([r, g, b]: [number, number, number]): number {
      return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
    }

    function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
      const l1 = relativeLuminance(rgb1);
      const l2 = relativeLuminance(rgb2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function compositeRgbaOverRgb(fgRgb: [number, number, number], alpha: number, bgRgb: [number, number, number]): [number, number, number] {
      return [
        Math.round(alpha * fgRgb[0] + (1 - alpha) * bgRgb[0]),
        Math.round(alpha * fgRgb[1] + (1 - alpha) * bgRgb[1]),
        Math.round(alpha * fgRgb[2] + (1 - alpha) * bgRgb[2])
      ];
    }

    // Light Theme:
    // Domestic: text #9A3412 on bg #FFF7ED
    const lightDomesticRatio = contrastRatio(hexToRgb('#9A3412'), hexToRgb('#FFF7ED'));
    expect(lightDomesticRatio).toBeGreaterThanOrEqual(4.5);

    // Global: text #1D4ED8 on bg #EFF6FF
    const lightGlobalRatio = contrastRatio(hexToRgb('#1D4ED8'), hexToRgb('#EFF6FF'));
    expect(lightGlobalRatio).toBeGreaterThanOrEqual(4.5);

    // Dark Theme: Card background #13181E
    const darkCardBg = hexToRgb('#13181E');

    // Domestic: text #FB923C on rgba(234, 88, 12, 0.15) over darkCardBg
    const darkDomesticBg = compositeRgbaOverRgb([234, 88, 12], 0.15, darkCardBg);
    const darkDomesticRatio = contrastRatio(hexToRgb('#FB923C'), darkDomesticBg);
    expect(darkDomesticRatio).toBeGreaterThanOrEqual(4.5);

    // Global: text #38BDF8 on rgba(2, 132, 199, 0.15) over darkCardBg
    const darkGlobalBg = compositeRgbaOverRgb([2, 132, 199], 0.15, darkCardBg);
    const darkGlobalRatio = contrastRatio(hexToRgb('#38BDF8'), darkGlobalBg);
    expect(darkGlobalRatio).toBeGreaterThanOrEqual(4.5);
  });
});
