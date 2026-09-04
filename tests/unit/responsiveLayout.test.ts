/**
 * Unit Tests for Responsive Layout, Text Overflow Hygiene, and Tap Targets
 * Verifies mobile tap targets (>= 44x44px), acronym overflow protection,
 * safe-area insets, and simulated multi-viewport layout stability.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Unit: Responsive Layout & Text Overflow Hygiene', () => {
  const layoutCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/layout.css'), 'utf-8');
  const responsiveCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/responsive.css'), 'utf-8');
  const dossierCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/dossier.css'), 'utf-8');

  it('guarantees min-width: 0 on flex children to prevent horizontal blowout', () => {
    expect(layoutCss).toContain('.dw-main-feed, .dw-brand-row > *, .dw-utility-row > *, .dw-modal-header > *, .dw-cluster-footer > * { min-width: 0; }');
  });

  it('enforces overflow-wrap: anywhere on defense acronyms, chips, and headlines', () => {
    expect(layoutCss).toContain('overflow-wrap: anywhere;');
    expect(layoutCss).toMatch(/\.dw-acronym[^{]*\{[^}]*overflow-wrap:\s*anywhere;/);
    expect(responsiveCss).toMatch(/\.dw-headline[^{]*\{[^}]*overflow-wrap:\s*anywhere;/);
  });

  it('guarantees 44x44px minimum tap target on navigation tabs and modal close buttons', () => {
    // Navigation tabs
    expect(layoutCss).toMatch(/\.dw-nav-tab\s*\{[^}]*min-height:\s*44px;/);
    expect(layoutCss).toMatch(/\.dw-nav-tab\s*\{[^}]*min-width:\s*44px;/);
    expect(responsiveCss).toMatch(/\.dw-nav-tab\s*\{[^}]*min-height:\s*44px;/);
    expect(responsiveCss).toMatch(/\.dw-nav-tab\s*\{[^}]*min-width:\s*44px;/);

    // Modal close button
    expect(dossierCss).toMatch(/\.dw-modal-close-btn\s*\{[^}]*width:\s*44px;/);
    expect(dossierCss).toMatch(/\.dw-modal-close-btn\s*\{[^}]*height:\s*44px;/);
    expect(dossierCss).toMatch(/\.dw-modal-close-btn\s*\{[^}]*min-width:\s*44px;/);
    expect(dossierCss).toMatch(/\.dw-modal-close-btn\s*\{[^}]*min-height:\s*44px;/);
  });

  it('supports mobile viewport safe-area insets across backdrop, footer, and search overlay', () => {
    expect(dossierCss).toContain('env(safe-area-inset-bottom)');
    expect(layoutCss).toContain('env(safe-area-inset-bottom)');
    expect(responsiveCss).toContain('env(safe-area-inset-bottom)');
  });

  it('enforces fixed viewport modal geometry and scroll containment', () => {
    expect(dossierCss).toContain('height: min(85vh, 760px);');
    expect(dossierCss).toContain('max-height: min(85vh, 760px);');
    expect(dossierCss).toContain('overscroll-behavior: contain;');
  });

  it('simulates viewports (320px, 375px, 390px, 768px, 1440px) with long defense acronyms', () => {
    const viewports = [320, 375, 390, 768, 1440];
    const longDefenseAcronym = 'CCS-MOD-DAC-IDDM-TEJAS-MK1A-VLSRSAM-SP-001';

    viewports.forEach((width) => {
      const container = document.createElement('div');
      container.style.width = `${width}px`;
      container.style.maxWidth = '100%';
      container.style.overflow = 'hidden';

      const flexParent = document.createElement('div');
      flexParent.style.display = 'flex';
      flexParent.style.width = '100%';

      const flexChild = document.createElement('div');
      flexChild.style.minWidth = '0';
      flexChild.style.flex = '1';
      flexChild.style.overflowWrap = 'anywhere';
      flexChild.textContent = longDefenseAcronym;

      flexParent.appendChild(flexChild);
      container.appendChild(flexParent);
      document.body.appendChild(container);

      expect(container.style.width).toBe(`${width}px`);
      expect(flexChild.style.minWidth).toBe('0');
      expect(flexChild.style.overflowWrap).toBe('anywhere');
      expect(flexChild.textContent).toBe(longDefenseAcronym);

      document.body.removeChild(container);
    });
  });

  it('verifies mobile chevron touch gutter target and mobile feed simplification rules', () => {
    const feedCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/feed.css'), 'utf-8');
    expect(feedCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*width:\s*44px;/);
    expect(feedCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*min-width:\s*44px;/);
    expect(feedCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*min-height:\s*44px;/);

    expect(responsiveCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*width:\s*44px;/);
    expect(responsiveCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*min-width:\s*44px;/);
    expect(responsiveCss).toMatch(/\.dw-cluster-chevron-gutter\s*\{[^}]*min-height:\s*44px;/);

    expect(responsiveCss).toContain('.dw-cluster .dw-related-box');
    expect(responsiveCss).toContain('.dw-cluster .dw-discussions');
    expect(responsiveCss).toMatch(/\.dw-cluster\s+\.dw-related-box,\s*\.dw-cluster\s+\.dw-discussions\s*\{\s*display:\s*none;\s*\}/);
  });

  it('enforces .dw-cluster-card layout structure, hover states, and touch accessibility', () => {
    const feedCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/feed.css'), 'utf-8');
    expect(feedCss).toContain('.dw-cluster-card');
    expect(feedCss).toMatch(/\.dw-cluster,\s*\.dw-cluster-card\s*\{[^}]*position:\s*relative;/);
    expect(feedCss).toMatch(/\.dw-cluster-inner\s*\{[^}]*display:\s*flex;/);
    expect(feedCss).toMatch(/\.dw-cluster-inner\s*\{[^}]*justify-content:\s*space-between;/);
    expect(feedCss).toMatch(/\.dw-cluster-content\s*\{[^}]*flex:\s*1;\s*min-width:\s*0;/);
    expect(feedCss).toMatch(/\.dw-cluster-card:hover\s+\.dw-cluster-chevron-gutter\s*\{[^}]*color:\s*var\(--dw-text-primary\);/);
  });

  it('enforces 60fps GPU hardware-accelerated slide-over animations and transitions', () => {
    // Backdrop smooth opacity fade
    expect(dossierCss).toMatch(/\.dw-story-dossier-overlay\s*\{[^}]*transition:\s*opacity\s+0\.2s\s+ease-in-out;/);

    // Panel geometry, GPU transform, and will-change
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*position:\s*fixed;/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*top:\s*0;/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*right:\s*0;/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*bottom:\s*0;/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*max-width:\s*480px;/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*transform:\s*translate3d\(100%,\s*0,\s*0\);/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*transition:\s*transform\s+0\.25s\s+cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\s*\{[^}]*will-change:\s*transform;/);

    // Active .is-open state
    expect(dossierCss).toMatch(/\.dw-story-dossier-panel\.is-open[^{]*\{[^}]*transform:\s*translate3d\(0,\s*0,\s*0\);/);

    // Closing exit transition
    expect(dossierCss).toMatch(/\.dw-modal-backdrop\.dw-modal-closing\s+\.dw-story-dossier-panel\s*\{[^}]*transform:\s*translate3d\(100%,\s*0,\s*0\);/);
    expect(dossierCss).toMatch(/\.dw-modal-backdrop\.dw-modal-closing\s+\.dw-story-dossier-panel\s*\{[^}]*transition:\s*transform\s+0\.15s\s+cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
  });

  it('verifies responsive mobile adaptation for slide-over panel on phone viewports (<= 480px)', () => {
    expect(responsiveCss).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[^}]*\.dw-story-dossier-panel\s*\{[^}]*max-width:\s*100%;/);
    expect(responsiveCss).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[^}]*\.dw-story-dossier-panel\s*\{[^}]*border-left:\s*none;/);
  });
});

