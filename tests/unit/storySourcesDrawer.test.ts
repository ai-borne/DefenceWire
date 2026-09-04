/**
 * Unit Tests for StorySourcesDrawer Component
 * Validates related coverage links, perspectives/quotes, verified badges, and strict XSS defense.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { renderStorySourcesDrawer } from '../../src/components/StorySourcesDrawer.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StoryCluster, StorySourceItem, DiscussionQuote } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

const mockRelatedItems: StorySourceItem[] = [
  {
    id: 'rel-1',
    title: 'DRDO Hands Over Upgraded Uttam Radar to HAL',
    url: 'https://idsa.in/drdo-uttam-radar',
    sourceName: 'Manohar Parrikar IDSA',
    sourceDomain: 'idsa.in',
    tier: SourceTier.TIER_4_OSINT,
    publishedAt: new Date(Date.now() - 3600 * 1000).toISOString()
  },
  {
    id: 'rel-2',
    title: 'IAF Air Chief Reviews Tejas Serial Production',
    url: 'https://aninews.in/iaf-tejas-review',
    sourceName: 'ANI',
    sourceDomain: 'aninews.in',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: ''
  }
];

const mockDiscussions: DiscussionQuote[] = [
  {
    id: 'disc-1',
    author: 'Air Chief Marshal VR Chaudhari',
    handleOrTitle: 'CAS IAF (@IAF_MCC)',
    quote: 'The indigenous fighter program represents our decisive leap towards atmanirbharta.',
    sourcePlatform: 'X/Twitter',
    url: 'https://x.com/IAF_MCC/status/123456789'
  },
  {
    id: 'disc-2',
    author: 'Dr. Sameer V. Kamat',
    handleOrTitle: 'Secretary DDR&D and Chairman DRDO',
    quote: 'Indigenous sensor fusion technology has achieved field-qualification benchmarks.',
    sourcePlatform: 'PressBriefing'
  }
];

describe('StorySourcesDrawer Component', () => {
  it('renders related coverage sub-list only when no discussions exist', () => {
    const cluster: Pick<StoryCluster, 'id' | 'relatedCoverage' | 'discussions'> = {
      id: 'cluster-rel-only',
      relatedCoverage: mockRelatedItems,
      discussions: []
    };

    const drawer = renderStorySourcesDrawer(cluster);
    expect(drawer.className).toBe('dw-sources-drawer');
    expect(drawer.id).toBe('sources-drawer-cluster-rel-only');
    expect(drawer.getAttribute('aria-label')).toBe(STRINGS.story.relatedCoverageHeading);

    // Related box rendered
    const relatedBox = drawer.querySelector('.dw-related-box');
    expect(relatedBox).not.toBeNull();
    expect(relatedBox?.querySelector('.dw-related-heading')?.textContent).toBe(`${STRINGS.story.relatedCoverageHeading}:`);

    const items = relatedBox!.querySelectorAll('.dw-related-item');
    expect(items.length).toBe(2);

    const firstLink = items[0]?.querySelector('a');
    expect(firstLink?.textContent).toBe(mockRelatedItems[0]?.title);
    expect(firstLink?.href).toBe(mockRelatedItems[0]?.url);
    expect(firstLink?.target).toBe('_blank');
    expect(firstLink?.rel).toBe('noopener noreferrer');

    const firstMeta = items[0]?.querySelector('.dw-river-meta');
    expect(firstMeta?.textContent).toContain('IDSA');
    expect(firstMeta?.textContent).toContain('1h ago');

    // Second item has no publishedAt -> should not have trailing comma or empty timestamp
    const secondMeta = items[1]?.querySelector('.dw-river-meta');
    expect(secondMeta?.textContent).toBe('(ANI)');

    // Discussions box NOT rendered
    expect(drawer.querySelector('.dw-discussions')).toBeNull();
  });

  it('renders perspectives & quotes only when no related coverage exists', () => {
    const cluster: Pick<StoryCluster, 'id' | 'relatedCoverage' | 'discussions'> = {
      id: 'cluster-disc-only',
      relatedCoverage: [],
      discussions: mockDiscussions
    };

    const drawer = renderStorySourcesDrawer(cluster);
    expect(drawer.querySelector('.dw-related-box')).toBeNull();

    const discBox = drawer.querySelector('.dw-discussions');
    expect(discBox).not.toBeNull();
    expect(discBox?.querySelector('.dw-related-heading')?.textContent).toBe(`${STRINGS.story.perspectivesHeading}:`);

    const quotes = discBox!.querySelectorAll('.dw-discussion-quote');
    expect(quotes.length).toBe(2);
    expect(quotes[0]?.textContent).toContain(mockDiscussions[0]?.quote);

    const verifiedBadges = discBox!.querySelectorAll('.dw-verified-badge');
    expect(verifiedBadges.length).toBe(1);
    expect(verifiedBadges[0]?.textContent).toContain(STRINGS.story.officialSignalBadge);

    // First discussion has URL -> anchor link
    const link = discBox!.querySelector('a.dw-discussion-link');
    expect(link?.getAttribute('href')).toBe(mockDiscussions[0]?.url);
    expect(link?.textContent).toBe('[X/Twitter]');

    // Second discussion has no URL -> span
    const span = discBox!.querySelector('span.dw-discussion-platform');
    expect(span?.textContent).toBe('[PressBriefing]');
  });

  it('renders both related coverage and perspectives in proper sequence when both exist', () => {
    const cluster: Pick<StoryCluster, 'id' | 'relatedCoverage' | 'discussions'> = {
      id: 'cluster-both',
      relatedCoverage: mockRelatedItems,
      discussions: mockDiscussions
    };

    const drawer = renderStorySourcesDrawer(cluster);
    const relatedBox = drawer.querySelector('.dw-related-box');
    const discBox = drawer.querySelector('.dw-discussions');

    expect(relatedBox).not.toBeNull();
    expect(discBox).not.toBeNull();
    // Related box comes before discussions box in the drawer
    expect(drawer.children[0]).toBe(relatedBox);
    expect(drawer.children[1]).toBe(discBox);
  });

  it('strictly escapes XSS vectors in quotes, authors, titles, and strips unsafe protocols', () => {
    const maliciousCluster: Pick<StoryCluster, 'id' | 'relatedCoverage' | 'discussions'> = {
      id: 'xss-test',
      relatedCoverage: [
        {
          id: 'rel-xss',
          title: '<script>alert("xss-rel-title")</script>Unsafe Title',
          url: 'javascript:alert("evil")',
          sourceName: '<b>Malicious Source</b>',
          sourceDomain: 'evil.com',
          tier: SourceTier.TIER_4_OSINT,
          publishedAt: '2026-09-01T00:00:00Z'
        }
      ],
      discussions: [
        {
          id: 'disc-xss',
          author: '<img src=x onerror=alert(1)>Hacker',
          handleOrTitle: 'Director <iframe src=x></iframe>',
          quote: '<script>document.location="https://attacker.com"</script>Sovereign quote statement.',
          sourcePlatform: 'X/Twitter',
          url: 'javascript:void(0)'
        }
      ]
    };

    const drawer = renderStorySourcesDrawer(maliciousCluster);

    // No executable scripts or iframes in DOM
    expect(drawer.querySelectorAll('script').length).toBe(0);
    expect(drawer.querySelectorAll('iframe').length).toBe(0);
    expect(drawer.querySelectorAll('img').length).toBe(0);

    // Content safely escaped
    expect(drawer.innerHTML).not.toContain('<script>');
    expect(drawer.innerHTML).not.toContain('onerror=');

    // Unsafe javascript: links neutralized
    const relLink = drawer.querySelector('.dw-related-item a');
    expect(relLink?.getAttribute('href')).toBe('#');

    const discLink = drawer.querySelector('.dw-discussion-link');
    expect(discLink?.getAttribute('href')).toBe('#');
  });
});

describe('StoryClusterView - Sources Drawer Card Integration', () => {
  const baseCluster: StoryCluster = {
    id: 'cluster-card-test',
    synthesizedHeadline: 'Sovereign Combat Fleet Expansion',
    primarySource: {
      id: 'src-1',
      title: 'MoD Announces Fleet Expansion',
      url: 'https://pib.gov.in/fleet',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-01T10:00:00Z',
      snippet: 'DAC approves capital procurement.'
    },
    relatedCoverage: mockRelatedItems,
    discussions: mockDiscussions,
    categories: ['procurement'],
    entities: ['HAL', 'DRDO'],
    defenceScore: 95,
    isLeadStory: false,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  };

  it('renders collapsed card with [+X sources] button and no drawer at rest', () => {
    const newsVm = new NewsViewModel([baseCluster], []);
    const card = renderStoryCluster(baseCluster, newsVm, false);

    expect(card.querySelector('.dw-sources-drawer-wrapper')).toBeNull();
    const btn = card.querySelector('.dw-sources-toggle-btn');
    expect(btn).not.toBeNull();
    // 2 related items + 1 discussion block = 3 sources
    expect(btn?.textContent).toBe('+3 sources');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders expanded sources drawer directly above footer when open', () => {
    const newsVm = new NewsViewModel([baseCluster], []);
    newsVm.setSourcesExpanded(baseCluster.id, true);

    const card = renderStoryCluster(baseCluster, newsVm, false);
    const drawerWrapper = card.querySelector('.dw-sources-drawer-wrapper.is-open');
    expect(drawerWrapper).not.toBeNull();

    const footer = card.querySelector('.dw-cluster-footer');
    expect(footer).not.toBeNull();

    // Drawer wrapper is directly before footer in the DOM
    expect(drawerWrapper?.nextElementSibling).toBe(footer);

    const btn = card.querySelector('.dw-sources-toggle-btn');
    expect(btn?.classList.contains('is-expanded')).toBe(true);
    expect(btn?.textContent).toBe(STRINGS.story.sourcesCollapse);
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
  });

  it('omits sources button when cluster has zero corroborating sources but retains footer attribution', () => {
    const emptyCluster: StoryCluster = {
      ...baseCluster,
      id: 'cluster-empty',
      relatedCoverage: [],
      discussions: []
    };
    const newsVm = new NewsViewModel([emptyCluster], []);
    const card = renderStoryCluster(emptyCluster, newsVm, false);

    expect(card.querySelector('.dw-sources-toggle-btn')).toBeNull();
    const footerLeft = card.querySelector('.dw-cluster-footer-left') as HTMLElement;
    expect(footerLeft).not.toBeNull();
    expect(footerLeft.querySelector('.dw-source-attribution')).not.toBeNull();
    const actions = card.querySelector('.dw-cluster-actions') as HTMLElement;
    expect(actions).not.toBeNull();
  });

  it('renders singular "+1 source" when exactly one corroborating item exists', () => {
    const singleCluster: StoryCluster = {
      ...baseCluster,
      id: 'cluster-single',
      relatedCoverage: [mockRelatedItems[0]!],
      discussions: []
    };
    const newsVm = new NewsViewModel([singleCluster], []);
    const card = renderStoryCluster(singleCluster, newsVm, false);

    const btn = card.querySelector('.dw-sources-toggle-btn');
    expect(btn?.textContent).toBe('+1 source');
  });

  it('toggles sources drawer via button click', () => {
    const newsVm = new NewsViewModel([baseCluster], []);
    const card = renderStoryCluster(baseCluster, newsVm, false);

    const btn = card.querySelector('.dw-sources-toggle-btn') as HTMLButtonElement;
    expect(newsVm.isSourcesExpanded(baseCluster.id)).toBe(false);

    btn.click();
    expect(newsVm.isSourcesExpanded(baseCluster.id)).toBe(true);
  });
});
