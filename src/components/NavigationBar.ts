/**
 * Navigation Bar Component for DefenceWire.in
 * Filter pills for domain categories and the Wire feed.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { FilterCategory } from '../types/viewState.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';

interface NavItem {
  id: FilterCategory;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'all', label: STRINGS.nav.all },
  { id: 'river', label: STRINGS.nav.river },
  { id: 'tech', label: STRINGS.nav.tech },
  { id: 'strategic', label: STRINGS.nav.strategic },
  { id: 'programs', label: STRINGS.nav.programs },
  { id: 'procurement', label: STRINGS.nav.procurement },
  { id: 'suppliers', label: STRINGS.nav.suppliers },
  { id: 'threads', label: STRINGS.nav.threads },
  { id: 'graph', label: STRINGS.nav.graph },
  { id: 'ssb', label: STRINGS.nav.ssb },
  { id: 'official', label: STRINGS.nav.official },
  { id: 'archive', label: STRINGS.nav.archive }
] as const;

export function renderNavigationBar(newsVm: NewsViewModel): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'dw-nav';
  nav.setAttribute('aria-label', STRINGS.nav.categoriesAriaLabel);

  const inner = document.createElement('div');
  inner.className = 'dw-nav-inner';
  inner.setAttribute('role', 'tablist');

  const activeCategory = newsVm.getActiveCategory();

  NAV_ITEMS.forEach((item) => {
    const tab = document.createElement('button');
    tab.className = `dw-nav-tab ${item.id === activeCategory ? 'active' : ''}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', item.id === activeCategory ? 'true' : 'false');
    tab.textContent = item.label;

    tab.addEventListener('click', () => {
      newsVm.setActiveCategory(item.id);
    });

    inner.appendChild(tab);
  });

  nav.appendChild(inner);
  return nav;
}
