/**
 * Shared accessible tab controller for dossier modals (Program & Supplier).
 * Extracted so ProgramDetailModal.ts and SupplierDetailModal.ts don't each
 * carry a near-identical copy of the tablist/keydown-nav wiring.
 * Hard limit: <= 300 LOC.
 */

export interface DossierTabDef {
  id: string;
  label: string;
}

export interface DossierTabOptions {
  tabIdPrefix: string;
  tabBtnClass: string;
  ariaLabel: string;
  defaultId: string;
}

export function buildDossierTabs(
  tabList: HTMLElement,
  body: HTMLElement,
  tabDefs: DossierTabDef[],
  panels: Record<string, HTMLElement>,
  options: DossierTabOptions
): void {
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', options.ariaLabel);

  Object.entries(panels).forEach(([id, panel]) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${options.tabIdPrefix}-${id}`);
    if (id !== options.defaultId) panel.hidden = true;
    body.appendChild(panel);
  });

  const tabButtons: HTMLButtonElement[] = [];
  const switchTab = (activeId: string) => {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tabId === activeId;
      btn.setAttribute('aria-selected', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      btn.classList.toggle('active', isActive);
    });
    Object.entries(panels).forEach(([id, p]) => {
      const isActive = id === activeId;
      p.hidden = !isActive;
      p.classList.toggle('active', isActive);
    });
  };

  tabDefs.forEach((t, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.id = `${options.tabIdPrefix}-${t.id}`;
    btn.dataset.tabId = t.id;
    btn.setAttribute('aria-controls', panels[t.id]!.id);
    btn.setAttribute('aria-selected', String(idx === 0));
    btn.tabIndex = idx === 0 ? 0 : -1;
    btn.className = `${options.tabBtnClass} ${idx === 0 ? 'active' : ''}`;
    btn.textContent = t.label;
    btn.addEventListener('click', () => switchTab(t.id));
    tabButtons.push(btn);
    tabList.appendChild(btn);
  });

  tabList.addEventListener('keydown', (e: KeyboardEvent) => {
    const currIdx = tabButtons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (currIdx === -1) return;
    let nextIdx = -1;
    if (e.key === 'ArrowRight') nextIdx = (currIdx + 1) % tabButtons.length;
    else if (e.key === 'ArrowLeft') nextIdx = (currIdx - 1 + tabButtons.length) % tabButtons.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabButtons.length - 1;

    if (nextIdx !== -1) {
      e.preventDefault();
      const targetBtn = tabButtons[nextIdx];
      if (targetBtn && targetBtn.dataset.tabId) {
        switchTab(targetBtn.dataset.tabId);
        targetBtn.focus();
      }
    }
  });
}
