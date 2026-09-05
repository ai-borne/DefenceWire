/**
 * Integration Tests for Programs Navigation, Hash Deep-Linking & Dossier Interactions
 * Programs/Suppliers are lazy-loaded (dynamic import on first tab click or
 * permalink hit — see main.ts's ensureProgramsVm/ensureSuppliersVm and
 * dossierPermalinkService.ts), so every assertion that depends on that
 * content appearing must wait for it via vi.waitFor rather than asserting
 * immediately after the synchronous click/initializeApp() call.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeApp } from '../../src/main.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Integration: Programs Tab & Deep-Linking', () => {
  beforeEach(() => {
    window.location.hash = '';
    if (typeof window.localStorage !== 'undefined') {
      window.localStorage.clear();
    }
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should navigate to Programs Explorer view when Programs tab is clicked', async () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;

    expect(programsTab).toBeDefined();
    programsTab.click();

    expect(programsTab.classList.contains('active')).toBe(true);
    expect(programsTab.getAttribute('aria-selected')).toBe('true');

    await vi.waitFor(() => {
      const explorer = document.querySelector('.dw-programs-explorer');
      expect(explorer).not.toBeNull();
      expect(explorer?.textContent).toContain(STRINGS.programs.heading);
    });

    const cards = document.querySelectorAll('.dw-program-card');
    expect(cards.length).toBe(43);
  });

  it('should filter cards when domain tab is clicked inside Programs view', async () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;
    programsTab.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.dw-programs-explorer')).not.toBeNull();
    });

    const missilesTab = Array.from(document.querySelectorAll('.dw-program-domain-tab')).find(
      (el) => el.textContent?.includes('Missiles')
    ) as HTMLButtonElement;

    expect(missilesTab).toBeDefined();
    missilesTab.click();

    const cards = document.querySelectorAll('.dw-program-card');
    expect(cards.length).toBe(10);
    expect(cards[0]?.getAttribute('data-domain')).toBe('missiles');
  });

  it('should open Program Detail Modal when card dossier link is clicked', async () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;
    programsTab.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.dw-program-dossier-btn')).not.toBeNull();
    });

    const firstCardDossierBtn = document.querySelector('.dw-program-dossier-btn') as HTMLAnchorElement;
    firstCardDossierBtn.click();

    const modal = document.getElementById('dw-program-modal');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.dw-program-modal-title')).not.toBeNull();
  });

  it('should automatically open Program Detail Modal on hash deep-link (#program/:id)', async () => {
    window.location.hash = '#program/amca';
    initializeApp();

    await vi.waitFor(() => {
      const modal = document.getElementById('dw-program-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('AMCA');
      expect(modal?.textContent).toContain(STRINGS.programs.specificationsHeading);
    });
  });

  it('should handle alias deep-links (#program/:alias)', async () => {
    window.location.hash = '#program/zorawar';
    initializeApp();

    await vi.waitFor(() => {
      const modal = document.getElementById('dw-program-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Zorawar');
    });
  });

  it('should dismiss modal on Escape key press', async () => {
    window.location.hash = '#program/amca';
    initializeApp();

    await vi.waitFor(() => {
      expect(document.getElementById('dw-program-modal')).not.toBeNull();
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
    );

    // Modal closing class applied
    const modal = document.getElementById('dw-program-modal');
    expect(modal?.classList.contains('dw-modal-closing')).toBe(true);
  });
});
