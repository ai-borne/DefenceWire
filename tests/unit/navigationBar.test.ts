/**
 * Unit Tests for NavigationBar Component
 * Verifies MOAT tabs rendering, ARIA attributes, and category selection.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { renderNavigationBar } from '../../src/components/NavigationBar.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { STRINGS } from '../../src/resources/strings.js';
import { FilterCategory } from '../../src/types/viewState.js';

describe('NavigationBar Component', () => {
  it('should render nav element with correct aria-label and tablist role', () => {
    const newsVm = new NewsViewModel();
    const navElement = renderNavigationBar(newsVm);

    expect(navElement.tagName.toLowerCase()).toBe('nav');
    expect(navElement.className).toContain('dw-nav');
    expect(navElement.getAttribute('aria-label')).toBe('Defence Categories');

    const tablist = navElement.querySelector('.dw-nav-inner');
    expect(tablist).not.toBeNull();
    expect(tablist?.getAttribute('role')).toBe('tablist');
  });

  it('should render all 11 MOAT navigation tabs in expected order', () => {
    const newsVm = new NewsViewModel();
    const navElement = renderNavigationBar(newsVm);

    const tabs = Array.from(navElement.querySelectorAll<HTMLButtonElement>('.dw-nav-tab'));
    expect(tabs.length).toBe(11);

    const expectedLabels = [
      STRINGS.nav.all,
      STRINGS.nav.official,
      STRINGS.nav.programs,
      STRINGS.nav.tenders,
      STRINGS.nav.idex,
      STRINGS.nav.tech,
      STRINGS.nav.strategic,
      STRINGS.nav.procurement,
      STRINGS.nav.ssb,
      STRINGS.nav.river,
      STRINGS.nav.archive
    ];

    tabs.forEach((tab, index) => {
      expect(tab.textContent).toBe(expectedLabels[index]);
      expect(tab.getAttribute('role')).toBe('tab');
    });
  });

  it('should mark the default active category (all / Top Stories) with active class and aria-selected=true', () => {
    const newsVm = new NewsViewModel();
    const navElement = renderNavigationBar(newsVm);

    const tabs = Array.from(navElement.querySelectorAll<HTMLButtonElement>('.dw-nav-tab'));
    const allTab = tabs[0]!;

    expect(allTab.classList.contains('active')).toBe(true);
    expect(allTab.getAttribute('aria-selected')).toBe('true');

    // All other tabs should not be active
    tabs.slice(1).forEach((tab) => {
      expect(tab.classList.contains('active')).toBe(false);
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });
  });

  it('should highlight the active category when viewModel is pre-configured', () => {
    const categoriesToTest: FilterCategory[] = [
      'official',
      'programs',
      'tenders',
      'idex',
      'tech',
      'strategic',
      'procurement',
      'ssb',
      'river',
      'archive'
    ];

    for (const category of categoriesToTest) {
      const newsVm = new NewsViewModel();
      newsVm.setActiveCategory(category);

      const navElement = renderNavigationBar(newsVm);
      const activeTabs = Array.from(navElement.querySelectorAll<HTMLButtonElement>('.dw-nav-tab.active'));

      expect(activeTabs.length).toBe(1);
      expect(activeTabs[0]!.getAttribute('aria-selected')).toBe('true');

      const expectedLabel = (STRINGS.nav as Record<string, string>)[category];
      expect(activeTabs[0]!.textContent).toBe(expectedLabel);
    }
  });

  it('should call viewModel.setActiveCategory when a tab is clicked', () => {
    const newsVm = new NewsViewModel();
    const navElement = renderNavigationBar(newsVm);

    const tabs = Array.from(navElement.querySelectorAll<HTMLButtonElement>('.dw-nav-tab'));

    // Click Official & Parliament tab (index 1)
    const officialTab = tabs.find((t) => t.textContent === STRINGS.nav.official);
    expect(officialTab).toBeDefined();
    officialTab!.click();
    expect(newsVm.getActiveCategory()).toBe('official');

    // Click Programs tab
    const programsTab = tabs.find((t) => t.textContent === STRINGS.nav.programs);
    expect(programsTab).toBeDefined();
    programsTab!.click();
    expect(newsVm.getActiveCategory()).toBe('programs');

    // Click Tenders & RFPs tab
    const tendersTab = tabs.find((t) => t.textContent === STRINGS.nav.tenders);
    expect(tendersTab).toBeDefined();
    tendersTab!.click();
    expect(newsVm.getActiveCategory()).toBe('tenders');

    // Click iDEX & Startups tab
    const idexTab = tabs.find((t) => t.textContent === STRINGS.nav.idex);
    expect(idexTab).toBeDefined();
    idexTab!.click();
    expect(newsVm.getActiveCategory()).toBe('idex');

    // Click River tab
    const riverTab = tabs.find((t) => t.textContent === STRINGS.nav.river);
    expect(riverTab).toBeDefined();
    riverTab!.click();
    expect(newsVm.getActiveCategory()).toBe('river');

    // Click Archive tab
    const archiveTab = tabs.find((t) => t.textContent === STRINGS.nav.archive);
    expect(archiveTab).toBeDefined();
    archiveTab!.click();
    expect(newsVm.getActiveCategory()).toBe('archive');
  });
});
