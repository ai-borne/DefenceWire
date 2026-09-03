/**
 * Strategic Programs Explorer View Component for DefenceWire.in
 * Visual catalog, domain filters, stage filters, real-time search, and stats desk for 43 programs.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { LifecycleStage, ProgramDomain } from '../types/programs.js';
import { ProgramsViewModel } from '../viewmodels/ProgramsViewModel.js';
import { SuppliersViewModel } from '../viewmodels/SuppliersViewModel.js';
import { renderProgramLifecycleCard } from './ProgramLifecycleCard.js';
import { openProgramDetailModal } from './ProgramDetailModal.js';

interface DomainFilterTab {
  id: ProgramDomain | 'all';
  label: string;
}

const DOMAIN_TABS: readonly DomainFilterTab[] = [
  { id: 'all', label: STRINGS.programs.domainAll },
  { id: 'aerospace', label: STRINGS.programs.domainAerospace },
  { id: 'naval', label: STRINGS.programs.domainNaval },
  { id: 'land', label: STRINGS.programs.domainLand },
  { id: 'missiles', label: STRINGS.programs.domainMissiles },
  { id: 'unmanned', label: STRINGS.programs.domainUnmanned }
] as const;

const STAGE_OPTIONS: readonly { id: LifecycleStage | 'all'; label: string }[] = [
  { id: 'all', label: STRINGS.programs.filterAllStages },
  { id: 'concept', label: STRINGS.programs.stageConcept },
  { id: 'sanctioned', label: STRINGS.programs.stageSanctioned },
  { id: 'development', label: STRINGS.programs.stageDevelopment },
  { id: 'trials', label: STRINGS.programs.stageTrials },
  { id: 'production', label: STRINGS.programs.stageProduction },
  { id: 'induction', label: STRINGS.programs.stageInduction }
] as const;

export function renderProgramsExplorerView(programsVm: ProgramsViewModel, suppliersVm?: SuppliersViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-programs-explorer';

  // 1. Header & Title Block
  const headerBlock = document.createElement('div');
  headerBlock.className = 'dw-programs-header-block';

  const heading = document.createElement('h2');
  heading.className = 'dw-headline--lead';
  heading.textContent = `🚀 ${STRINGS.programs.heading}`;
  headerBlock.appendChild(heading);

  const sub = document.createElement('p');
  sub.className = 'dw-snippet';
  sub.textContent = STRINGS.programs.subheading;
  headerBlock.appendChild(sub);

  container.appendChild(headerBlock);

  // 2. High-Level Stats Deck
  const stats = programsVm.getStats();
  const statsDeck = document.createElement('div');
  statsDeck.className = 'dw-programs-stats-deck';

  const statPills = [
    { label: STRINGS.programs.statsTotal, value: stats.total, badgeClass: 'dw-stat-total' },
    { label: STRINGS.programs.statsProduction, value: stats.inProductionOrInducted, badgeClass: 'dw-stat-prod' },
    { label: STRINGS.programs.statsTrials, value: stats.inTrials, badgeClass: 'dw-stat-trials' },
    { label: STRINGS.programs.statsDev, value: stats.inDevelopment, badgeClass: 'dw-stat-dev' },
    { label: STRINGS.programs.statsConcept, value: stats.inConceptOrSanctioned, badgeClass: 'dw-stat-concept' }
  ];

  statPills.forEach((s) => {
    const pill = document.createElement('div');
    pill.className = `dw-program-stat-pill ${s.badgeClass}`;
    pill.innerHTML = `<span class="dw-stat-val">${s.value}</span> <span class="dw-stat-lbl">${sanitizePlainText(s.label)}</span>`;
    statsDeck.appendChild(pill);
  });
  container.appendChild(statsDeck);

  // 3. Search & Filters Bar
  const controlsBar = document.createElement('div');
  controlsBar.className = 'dw-programs-controls-bar';

  // Search input
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dw-programs-search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-programs-search-input';
  searchInput.placeholder = STRINGS.programs.searchPlaceholder;
  searchInput.value = programsVm.getSearchQuery();
  searchInput.setAttribute('aria-label', STRINGS.programs.searchPlaceholder);

  searchInput.addEventListener('input', () => {
    programsVm.setSearchQuery(searchInput.value);
  });

  searchWrap.appendChild(searchInput);
  controlsBar.appendChild(searchWrap);

  // Stage dropdown selector
  const stageSelect = document.createElement('select');
  stageSelect.className = 'dw-programs-stage-select';
  stageSelect.setAttribute('aria-label', STRINGS.programs.stageBarAriaLabel);

  STAGE_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    option.selected = programsVm.getActiveStage() === opt.id;
    stageSelect.appendChild(option);
  });

  stageSelect.addEventListener('change', () => {
    programsVm.setActiveStage(stageSelect.value as LifecycleStage | 'all');
  });

  controlsBar.appendChild(stageSelect);
  container.appendChild(controlsBar);

  // 4. Domain Filter Tabs
  const domainTabsNav = document.createElement('div');
  domainTabsNav.className = 'dw-programs-domain-nav';
  domainTabsNav.setAttribute('role', 'tablist');

  const activeDomain = programsVm.getActiveDomain();

  DOMAIN_TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-program-domain-tab ${btnClass(tab.id)} ${tab.id === activeDomain ? 'active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === activeDomain ? 'true' : 'false');
    btn.textContent = tab.label;

    btn.addEventListener('click', () => {
      programsVm.setActiveDomain(tab.id);
    });

    domainTabsNav.appendChild(btn);
  });

  container.appendChild(domainTabsNav);

  // 5. Programs Grid
  const programs = programsVm.getFilteredPrograms();
  const grid = document.createElement('div');
  grid.className = 'dw-programs-grid';

  if (programs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dw-cluster dw-programs-empty';
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.programs.noResults;
    empty.appendChild(p);
    grid.appendChild(empty);
  } else {
    programs.forEach((prog) => {
      const newsCount = programsVm.getProgramNewsCount(prog.id);
      const card = renderProgramLifecycleCard(prog, {
        newsCount,
        onSelect: (p) => {
          if (typeof window !== 'undefined') {
            window.location.hash = `#program/${encodeURIComponent(p.id)}`;
          }
          openProgramDetailModal(p, {
            relatedClusters: programsVm.getProgramRelatedClusters(p.id),
            getSupplierRelatedClusters: suppliersVm ? (id) => suppliersVm.getSupplierRelatedClusters(id) : undefined
          });
        }
      });
      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
  return container;
}

function btnClass(domain: ProgramDomain | 'all'): string {
  if (domain === 'all') return 'dw-domain-tab--all';
  return `dw-domain-tab--${domain}`;
}
