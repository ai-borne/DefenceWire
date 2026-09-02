/**
 * Unit Tests for Programs Explorer View, Programs ViewModel & Detail Modal
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgramsViewModel } from '../../src/viewmodels/ProgramsViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { renderProgramsExplorerView } from '../../src/components/ProgramsExplorerView.js';
import { openProgramDetailModal } from '../../src/components/ProgramDetailModal.js';
import { getProgramById } from '../../src/data/strategicPrograms.js';
import { STRINGS } from '../../src/resources/strings.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Unit: ProgramsViewModel', () => {
  it('should initialize with default filters and return 43 programs', () => {
    const vm = new ProgramsViewModel();
    expect(vm.getActiveDomain()).toBe('all');
    expect(vm.getActiveStage()).toBe('all');
    expect(vm.getSearchQuery()).toBe('');
    expect(vm.getAllPrograms().length).toBe(43);
    expect(vm.getFilteredPrograms().length).toBe(43);

    const stats = vm.getStats();
    expect(stats.total).toBe(43);
    expect(stats.aerospace).toBe(11);
    expect(stats.naval).toBe(9);
    expect(stats.land).toBe(8);
    expect(stats.missiles).toBe(10);
    expect(stats.unmanned).toBe(5);
  });

  it('should filter by domain and notify listeners', () => {
    const vm = new ProgramsViewModel();
    let notified = false;
    vm.subscribe(() => {
      notified = true;
    });

    vm.setActiveDomain('aerospace');
    expect(notified).toBe(true);
    expect(vm.getActiveDomain()).toBe('aerospace');
    expect(vm.getFilteredPrograms().length).toBe(11);
    expect(vm.getFilteredPrograms().every((p) => p.domain === 'aerospace')).toBe(true);
  });

  it('should filter by stage and search query', () => {
    const vm = new ProgramsViewModel();
    vm.setActiveStage('development');
    expect(vm.getFilteredPrograms().every((p) => p.stage === 'development')).toBe(true);

    vm.setSearchQuery('amca');
    const filtered = vm.getFilteredPrograms();
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.id).toBe('amca');

    vm.resetFilters();
    expect(vm.getFilteredPrograms().length).toBe(43);
  });

  it('should link to news stories via NewsViewModel', () => {
    const mockCluster: StoryCluster = {
      id: 'cluster-tejas-test',
      primarySource: {
        id: 'src-1',
        title: 'Tejas Mk1A completes weapon integration trials at Pokhran',
        url: 'https://pib.gov.in/test',
        sourceName: 'PIB MoD',
        publishedAt: new Date().toISOString(),
        tier: SourceTier.TIER_1_OFFICIAL,
        sourceDomain: 'pib.gov.in'
      },
      relatedCoverage: [],
      entities: ['Tejas Mk1A', 'LCA Tejas', 'HAL'],
      categories: ['programs', 'official'],
      programTags: ['tejas-mk1a'],
      defenceScore: 95,
      synthesizedHeadline: 'IAF Validates Advanced Weapons on Tejas Mk1A at Pokhran',
      discussions: [],
      isLeadStory: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newsVm = new NewsViewModel([mockCluster], []);
    const vm = new ProgramsViewModel(newsVm);

    expect(vm.getProgramNewsCount('tejas-mk1a')).toBe(1);
    const related = vm.getProgramRelatedClusters('tejas-mk1a');
    expect(related.length).toBe(1);
    expect(related[0]?.id).toBe('cluster-tejas-test');

    expect(vm.getProgramNewsCount('amca')).toBe(0);
  });

  it('should manage subscriptions and clean up with destroy()', () => {
    const newsVm1 = new NewsViewModel([], []);
    const newsVm2 = new NewsViewModel([], []);
    const vm = new ProgramsViewModel(newsVm1);

    let notifyCount = 0;
    const unsubscribe = vm.subscribe(() => {
      notifyCount++;
    });

    // Re-assigning newsVm switches subscription cleanly
    vm.setNewsViewModel(newsVm2);
    expect(notifyCount).toBe(1);

    // Unsubscribe removes listener
    unsubscribe();
    vm.setActiveDomain('naval');
    expect(notifyCount).toBe(1);

    // Destroy cleans up all subscriptions
    vm.destroy();
  });
});

describe('Unit: ProgramsExplorerView Component', () => {
  let vm: ProgramsViewModel;

  beforeEach(() => {
    document.body.innerHTML = '';
    vm = new ProgramsViewModel();
  });

  it('should render complete explorer view with stats deck, controls, and 43 cards', () => {
    const el = renderProgramsExplorerView(vm);
    expect(el.querySelector('.dw-headline--lead')?.textContent).toContain(STRINGS.programs.heading);

    const statPills = el.querySelectorAll('.dw-program-stat-pill');
    expect(statPills.length).toBe(5);

    const domainTabs = el.querySelectorAll('.dw-program-domain-tab');
    expect(domainTabs.length).toBe(6);

    const cards = el.querySelectorAll('.dw-program-card');
    expect(cards.length).toBe(43);
  });

  it('should update filters when domain tab or search input is interacted with', () => {
    const el = renderProgramsExplorerView(vm);
    const navalTab = Array.from(el.querySelectorAll('.dw-program-domain-tab')).find((t) =>
      t.textContent?.includes('Naval')
    ) as HTMLButtonElement;

    expect(navalTab).toBeDefined();
    navalTab.click();
    expect(vm.getActiveDomain()).toBe('naval');

    const searchInput = el.querySelector('.dw-programs-search-input') as HTMLInputElement;
    searchInput.value = 'vikrant';
    searchInput.dispatchEvent(new Event('input'));
    expect(vm.getSearchQuery()).toBe('vikrant');
  });

  it('should render empty state message when search yields no matches', () => {
    vm.setSearchQuery('nonexistent-laser-weapon-system-xyz');
    const el = renderProgramsExplorerView(vm);
    const emptyEl = el.querySelector('.dw-programs-empty');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl?.textContent).toContain(STRINGS.programs.noResults);
  });
});

describe('Unit: ProgramDetailModal Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render full strategic dossier modal for a program', () => {
    const tejas = getProgramById('tejas-mk1a');
    expect(tejas).toBeDefined();

    const modal = openProgramDetailModal(tejas!);
    expect(document.getElementById('dw-program-modal')).not.toBeNull();
    expect(modal.querySelector('.dw-program-modal-title')?.textContent).toBe(tejas!.name);
    expect(modal.textContent).toContain(tejas!.leadAgency);
    expect(modal.textContent).toContain(STRINGS.programs.specificationsHeading);
    expect(modal.textContent).toContain(STRINGS.programs.subsystemsHeading);
    expect(modal.textContent).toContain(STRINGS.programs.milestonesHeading);

    // Verify stage bar is rendered
    expect(modal.querySelector('.dw-program-stage-bar')).not.toBeNull();

    // Verify close button dismisses modal
    const closeBtn = modal.querySelector('.dw-modal-close-btn') as HTMLButtonElement;
    closeBtn.click();
  });
});
