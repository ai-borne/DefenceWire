/**
 * Unit Tests for NewsViewModel Story Dossier Observables & StoryClusterView Chevron Gutter
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('NewsViewModel Dossier Observables & Gutter Integration', () => {
  const mockCluster: StoryCluster = {
    id: 'cluster-tejas-mk1a',
    synthesizedHeadline: 'IAF Inducts Advanced Tejas Mk1A Squadron',
    primarySource: {
      id: 'src-pib-1',
      title: 'MoD Announces Tejas Induction',
      url: 'https://pib.gov.in/release1',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      snippet: 'Light Combat Aircraft induction strengthens western air defence.',
      publishedAt: '2026-09-04T08:00:00Z',
      isPrimary: true
    },
    relatedCoverage: [
      {
        id: 'rel-1',
        title: 'HAL Delivers Mk1A Ahead of Schedule',
        url: 'https://thehindu.com/hal-delivery',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-09-04T08:30:00Z'
      }
    ],
    discussions: [
      {
        id: 'disc-1',
        author: 'Air Marshal (Retd)',
        handleOrTitle: '@defence_analyst',
        quote: 'Tejas Mk1A AESA radar and EW suite provide key tactical edge.',
        sourcePlatform: 'X/Twitter',
        url: 'https://x.com/defence_analyst/1'
      }
    ],
    entities: ['Tejas Mk1A', 'IAF', 'HAL'],
    ssbIntel: {
      whyItMatters: 'Accelerates indigenous fighter squadron strength.',
      strategicAngle: 'Deterrence balance along the Line of Actual Control.',
      defenceTechTakeaway: {
        platformOrSystem: 'Tejas Mk1A',
        indigenousContentPercentage: 65,
        specifications: ['Uttam AESA Radar', 'Self-Protection Jammer'],
        keySignificance: 'First squadron with indigenous AESA radar.'
      }
    },
    categories: ['tech', 'official'],
    defenceScore: 92,
    isLeadStory: true,
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:30:00Z'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('manages dossier active cluster state and exposes observable getter', () => {
    const vm = new NewsViewModel([mockCluster]);
    expect(vm.getActiveDossierClusterId()).toBeNull();
    expect(vm.getActiveDossierCluster()).toBeUndefined();

    vm.openStoryDossier(mockCluster.id);
    expect(vm.getActiveDossierClusterId()).toBe(mockCluster.id);
    expect(vm.getActiveDossierCluster()?.id).toBe(mockCluster.id);

    vm.closeStoryDossier();
    expect(vm.getActiveDossierClusterId()).toBeNull();
    expect(vm.getActiveDossierCluster()).toBeUndefined();
  });

  it('notifies onDossierChange subscribers with clusterId on open and null on close', () => {
    const vm = new NewsViewModel([mockCluster]);
    const listener = vi.fn();
    const unsubscribe = vm.onDossierChange(listener);

    vm.openStoryDossier(mockCluster.id);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(mockCluster.id);

    // Idempotent open of same cluster should not trigger listener again
    vm.openStoryDossier(mockCluster.id);
    expect(listener).toHaveBeenCalledTimes(1);

    vm.closeStoryDossier();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(null);

    // Idempotent close should not trigger listener again
    vm.closeStoryDossier();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    vm.openStoryDossier(mockCluster.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('preserves feed state without notifying feed subscribers unless explicitly requested', () => {
    const vm = new NewsViewModel([mockCluster]);
    const feedListener = vi.fn();
    vm.subscribe(feedListener);

    vm.openStoryDossier(mockCluster.id, false);
    expect(feedListener).not.toHaveBeenCalled();

    vm.closeStoryDossier(false);
    expect(feedListener).not.toHaveBeenCalled();

    vm.openStoryDossier(mockCluster.id, true);
    expect(feedListener).toHaveBeenCalledTimes(1);
  });

  it('renders right-side chevron gutter dock on story cluster card', () => {
    const vm = new NewsViewModel([mockCluster]);
    const card = renderStoryCluster(mockCluster, vm, true);

    const gutter = card.querySelector<HTMLButtonElement>('.dw-cluster-chevron-gutter');
    expect(gutter).not.toBeNull();
    expect(gutter?.getAttribute('type')).toBe('button');
    expect(gutter?.getAttribute('aria-label')).toBe(STRINGS.story.openDossierAriaLabel);
    expect(gutter?.getAttribute('title')).toBe(STRINGS.story.openDossierAriaLabel);
    expect(gutter?.textContent).toContain('›');
  });

  it('opens slide-over dossier and updates NewsViewModel when chevron gutter is clicked', async () => {
    const vm = new NewsViewModel([mockCluster]);
    const card = renderStoryCluster(mockCluster, vm, false);
    document.body.appendChild(card);

    const gutter = card.querySelector<HTMLButtonElement>('.dw-cluster-chevron-gutter');
    expect(gutter).not.toBeNull();

    gutter?.click();

    expect(vm.getActiveDossierClusterId()).toBe(mockCluster.id);

    await vi.waitFor(() => {
      const overlay = document.getElementById('dw-story-dossier-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay?.textContent).toContain(mockCluster.synthesizedHeadline);
    });

    const overlay = document.getElementById('dw-story-dossier-overlay');
    const backBtn = overlay?.querySelector<HTMLButtonElement>('.dw-dossier-back-btn');
    expect(backBtn).not.toBeNull();
    backBtn?.click();
    vi.advanceTimersByTime(200);

    await vi.waitFor(() => {
      expect(vm.getActiveDossierClusterId()).toBeNull();
      expect(document.getElementById('dw-story-dossier-overlay')).toBeNull();
    });
  });

  it('ensures inline summary toggle operates independently of dossier chevron gutter', async () => {
    const vm = new NewsViewModel([mockCluster]);
    const card = renderStoryCluster(mockCluster, vm, false);
    document.body.appendChild(card);

    const toggleBtn = card.querySelector<HTMLButtonElement>('.dw-ssb-toggle-btn');
    expect(toggleBtn).not.toBeNull();

    // Toggle summary
    toggleBtn?.click();
    expect(vm.isSSBExpanded(mockCluster.id)).toBe(true);
    expect(vm.getActiveDossierClusterId()).toBeNull();

    // Opening dossier should not alter SSB expanded state
    const gutter = card.querySelector<HTMLButtonElement>('.dw-cluster-chevron-gutter');
    gutter?.click();
    expect(vm.getActiveDossierClusterId()).toBe(mockCluster.id);
    expect(vm.isSSBExpanded(mockCluster.id)).toBe(true);

    await vi.waitFor(() => {
      expect(document.getElementById('dw-story-dossier-overlay')).not.toBeNull();
    });
  });
});
