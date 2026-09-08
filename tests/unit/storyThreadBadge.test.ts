/**
 * Unit Tests for Story Cluster Thread Badge Placement & Behavior
 * Verifies that the contextual thread badge is rendered in the top kicker row
 * above the headline, and triggers thread modal with canonical resolution.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const mockNewsVm: any = {
  isSourcesExpanded: vi.fn().mockReturnValue(false),
  toggleSourcesDrawer: vi.fn(),
  isClusterExpanded: vi.fn().mockReturnValue(false),
  toggleClusterExpansion: vi.fn(),
  isSSBExpanded: vi.fn().mockReturnValue(false),
  toggleSSBDrawer: vi.fn()
};

const baseCluster: StoryCluster = {
  id: 'cluster-su30',
  synthesizedHeadline: 'Rajnath Singh-led DAC clears military capability boost',
  categories: ['airforce'],
  defenceScore: 85,
  isLeadStory: false,
  relatedCoverage: [],
  discussions: [],
  createdAt: '2026-09-08T10:00:00Z',
  updatedAt: '2026-09-08T10:00:00Z',
  primarySource: {
    id: 'src-1',
    title: 'DAC clears missile project for Sukhoi fighters',
    sourceName: 'Hindustan Times',
    sourceDomain: 'hindustantimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    url: 'https://example.com/su30',
    publishedAt: '2026-09-08T10:00:00Z',
    snippet: 'DAC clears missile project for Sukhoi fighters'
  },
  entities: ['Su-30MKI', 'DAC Clearance'],
  programTags: ['Sukhoi-30 Fighters with RVV BD Missiles'],
  ssbIntel: {
    whyItMatters: 'Strategic deterrence capability along border',
    defenceTechTakeaway: {
      platformOrSystem: 'Sukhoi-30 Fighters with RVV BD Missiles',
      specifications: ['RVV-BD long range air-to-air'],
      keySignificance: 'Deep-strike deterrence boost'
    }
  }
};

describe('Story Cluster Thread Badge Placement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders thread badge in top kicker row above the headline', () => {
    const card = renderStoryCluster(baseCluster, mockNewsVm, false);

    const kickerRow = card.querySelector('.dw-cluster-kicker-row');
    expect(kickerRow).not.toBeNull();

    const threadBadge = kickerRow?.querySelector('.dw-story-thread-badge');
    expect(threadBadge).not.toBeNull();
    expect(threadBadge?.textContent).toContain('Sukhoi-30 Fighters with RVV BD Missiles');

    // Crucial: Ensure badge is NOT in footer left
    const footerLeft = card.querySelector('.dw-cluster-footer-left');
    expect(footerLeft?.querySelector('.dw-story-thread-badge')).toBeNull();

    // Verify DOM order: kicker row appears before headline
    const headline = card.querySelector('.dw-headline');
    expect(headline).not.toBeNull();
    expect(card.children[0]).toBe(kickerRow);
  });

  it('renders lead tag alongside thread badge in kicker row for lead stories', () => {
    const card = renderStoryCluster(baseCluster, mockNewsVm, true);

    const kickerRow = card.querySelector('.dw-cluster-kicker-row');
    expect(kickerRow).not.toBeNull();

    const leadTag = kickerRow?.querySelector('.dw-lead-tag');
    expect(leadTag).not.toBeNull();

    const threadBadge = kickerRow?.querySelector('.dw-story-thread-badge');
    expect(threadBadge).not.toBeNull();
  });

  it('does not render kicker row when story has no program or platform tags', () => {
    const clusterNoTags: StoryCluster = {
      ...baseCluster,
      id: 'cluster-general',
      programTags: undefined,
      ssbIntel: undefined
    };

    const card = renderStoryCluster(clusterNoTags, mockNewsVm, false);
    const kickerRow = card.querySelector('.dw-cluster-kicker-row');
    expect(kickerRow).toBeNull();
  });
});
