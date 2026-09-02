/**
 * Integration Tests for Programs Navigation, Hash Deep-Linking & Dossier Interactions
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

  it('should navigate to Programs Explorer view when Programs tab is clicked', () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;

    expect(programsTab).toBeDefined();
    programsTab.click();

    expect(programsTab.classList.contains('active')).toBe(true);
    expect(programsTab.getAttribute('aria-selected')).toBe('true');

    const explorer = document.querySelector('.dw-programs-explorer');
    expect(explorer).not.toBeNull();
    expect(explorer?.textContent).toContain(STRINGS.programs.heading);

    const cards = document.querySelectorAll('.dw-program-card');
    expect(cards.length).toBe(43);
  });

  it('should filter cards when domain tab is clicked inside Programs view', () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;
    programsTab.click();

    const missilesTab = Array.from(document.querySelectorAll('.dw-program-domain-tab')).find(
      (el) => el.textContent?.includes('Missiles')
    ) as HTMLButtonElement;

    expect(missilesTab).toBeDefined();
    missilesTab.click();

    const cards = document.querySelectorAll('.dw-program-card');
    expect(cards.length).toBe(10);
    expect(cards[0]?.getAttribute('data-domain')).toBe('missiles');
  });

  it('should open Program Detail Modal when card dossier link is clicked', () => {
    initializeApp();

    const programsTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.programs
    ) as HTMLButtonElement;
    programsTab.click();

    const firstCardDossierBtn = document.querySelector('.dw-program-dossier-btn') as HTMLAnchorElement;
    expect(firstCardDossierBtn).not.toBeNull();
    firstCardDossierBtn.click();

    const modal = document.getElementById('dw-program-modal');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.dw-program-modal-title')).not.toBeNull();
  });

  it('should automatically open Program Detail Modal on hash deep-link (#program/:id)', () => {
    window.location.hash = '#program/amca';
    initializeApp();

    const modal = document.getElementById('dw-program-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('AMCA');
    expect(modal?.textContent).toContain(STRINGS.programs.specificationsHeading);
  });

  it('should handle alias deep-links (#program/:alias)', () => {
    window.location.hash = '#program/zorawar';
    initializeApp();

    const modal = document.getElementById('dw-program-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Zorawar');
  });

  it('should dismiss modal on Escape key press', () => {
    window.location.hash = '#program/amca';
    initializeApp();

    const modal = document.getElementById('dw-program-modal');
    expect(modal).not.toBeNull();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
    );

    // Modal closing class applied
    expect(modal?.classList.contains('dw-modal-closing')).toBe(true);
  });
});
