/**
 * Unit Tests for Social UI Badging, Verified Handles, and River Rendering
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { renderRiverRail } from '../../src/components/RiverRailView.js';
import { renderMainFeedContent } from '../../src/components/MainFeedRouter.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { ArchiveViewModel } from '../../src/viewmodels/ArchiveViewModel.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Social UI Badging & Component Rendering', () => {
  const mockWirePrimary: StorySourceItem = {
    id: 'wire-1',
    title: 'MoD issues Acceptance of Necessity for Tejas Mk1A follow-on batch',
    url: 'https://thehindu.com/news/national/tejas-aon',
    sourceName: 'The Hindu',
    sourceDomain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T08:00:00Z',
    snippet: 'DAC clears capital acquisition of additional 97 Tejas light combat aircraft.'
  };

  const mockSocialRiverItem: StorySourceItem = {
    id: 'social-item-1',
    title: 'Air Chief reviews fighter squadron operational readiness at forward air base',
    url: 'https://x.com/IAF_MCC/status/1820000000000000002',
    sourceName: 'Indian Air Force (@IAF_MCC)',
    sourceDomain: 'x.com',
    author: '@IAF_MCC',
    tier: SourceTier.TIER_1_SOCIAL,
    publishedAt: '2026-08-30T09:00:00Z'
  };

  const mockStandardRiverItem: StorySourceItem = {
    id: 'standard-item-1',
    title: 'Naval shipbuilding facility achieves key milestone in frigate construction',
    url: 'https://livefistdefence.com/frigate-milestone',
    sourceName: 'Livefist',
    sourceDomain: 'livefistdefence.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-08-30T08:30:00Z'
  };

  const mockClusterWithDiscussions: StoryCluster = {
    id: 'cluster-ui-1',
    synthesizedHeadline: 'DAC Approves 97 Additional Tejas Mk1A Fighters for Indian Air Force',
    primarySource: mockWirePrimary,
    relatedCoverage: [],
    discussions: [
      {
        id: 'disc-official',
        author: 'Indian Air Force',
        handleOrTitle: '@IAF_MCC',
        quote: 'Induction of indigenous Tejas fighters bolsters combat potential of IAF.',
        url: 'https://x.com/IAF_MCC/status/1820000000000000003',
        sourcePlatform: 'X/Twitter'
      },
      {
        id: 'disc-generic',
        author: 'Strategic Analyst',
        handleOrTitle: 'USI Senior Fellow',
        quote: 'Fleet expansion addresses squadron drawdown challenge effectively.',
        url: 'https://usiofindia.org/analysis',
        sourcePlatform: 'ThinkTank'
      }
    ],
    categories: ['airforce', 'procurement'],
    entities: ['Tejas Mk1A', 'DAC Clearance'],
    defenceScore: 92,
    isLeadStory: true,
    createdAt: '2026-08-30T08:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z'
  };

  it('renders verified badge and safe external link for official social discussion quotes in StoryClusterView', () => {
    const newsVm = new NewsViewModel([mockClusterWithDiscussions], []);
    // Before expansion: discussions drawer is hidden, toggle button is present
    const collapsedEl = renderStoryCluster(mockClusterWithDiscussions, newsVm, true);
    expect(collapsedEl.querySelector('.dw-discussions')).toBeNull();
    expect(collapsedEl.querySelector('.dw-sources-toggle-btn')).not.toBeNull();

    // After expanding sources drawer: discussions and quotes are rendered
    newsVm.setSourcesExpanded(mockClusterWithDiscussions.id, true);
    const element = renderStoryCluster(mockClusterWithDiscussions, newsVm, true);

    const discBox = element.querySelector('.dw-discussions');
    expect(discBox).not.toBeNull();

    const verifiedBadges = discBox!.querySelectorAll('.dw-verified-badge');
    expect(verifiedBadges.length).toBe(1);
    expect(verifiedBadges[0]?.textContent).toContain(STRINGS.story.officialSignalBadge);

    const links = discBox!.querySelectorAll<HTMLAnchorElement>('.dw-discussion-link');
    expect(links.length).toBe(2);
    expect(links[0]?.href).toBe('https://x.com/IAF_MCC/status/1820000000000000003');
    expect(links[0]?.rel).toBe('noopener noreferrer');
    expect(links[0]?.target).toBe('_blank');
  });

  it('renders standard platform tag without verified badge for generic think tank quotes', () => {
    const clusterGenericOnly: StoryCluster = {
      ...mockClusterWithDiscussions,
      discussions: [mockClusterWithDiscussions.discussions[1]!]
    };

    const newsVm = new NewsViewModel([clusterGenericOnly], []);
    newsVm.setSourcesExpanded(clusterGenericOnly.id, true);
    const element = renderStoryCluster(clusterGenericOnly, newsVm, false);

    const discBox = element.querySelector('.dw-discussions');
    expect(discBox).not.toBeNull();

    const verifiedBadges = discBox!.querySelectorAll('.dw-verified-badge');
    expect(verifiedBadges.length).toBe(0);
    expect(discBox!.textContent).toContain('USI Senior Fellow');
  });

  it('renders Tier 1 Social verified badge in RiverRailView for official operational updates', () => {
    const newsVm = new NewsViewModel([], [mockSocialRiverItem, mockStandardRiverItem]);
    const rail = renderRiverRail(newsVm, 5);

    const items = rail.querySelectorAll('.dw-river-item');
    expect(items.length).toBe(2);

    const socialMeta = items[0]?.querySelector('.dw-river-meta');
    expect(socialMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')).not.toBeNull();
    expect(socialMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')?.textContent).toBe(STRINGS.story.officialSignalBadge);

    const standardMeta = items[1]?.querySelector('.dw-river-meta');
    expect(standardMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')).toBeNull();
  });

  it('renders Tier 1 Social verified badge in MainFeedRouter River view', () => {
    const newsVm = new NewsViewModel([], [mockSocialRiverItem, mockStandardRiverItem]);
    const archiveVm = new ArchiveViewModel();

    const container = document.createElement('div');
    renderMainFeedContent(container, 'river', newsVm, archiveVm);

    const riverRows = container.querySelectorAll('.dw-river-item');
    expect(riverRows.length).toBe(2);

    const socialMeta = riverRows[0]?.querySelector('.dw-river-meta');
    expect(socialMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')).not.toBeNull();
    expect(socialMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')?.textContent).toBe(STRINGS.story.officialSignalBadge);

    const standardMeta = riverRows[1]?.querySelector('.dw-river-meta');
    expect(standardMeta?.querySelector('.dw-tier-TIER_1_SOCIAL')).toBeNull();
  });
});
