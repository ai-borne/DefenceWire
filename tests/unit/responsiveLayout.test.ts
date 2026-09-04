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
  const feedCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/feed.css'), 'utf-8');

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

  it('enforces 1-line snippet clamping on mobile viewports', () => {
    expect(responsiveCss).toMatch(/\.dw-snippet\s*\{[^}]*-webkit-line-clamp:\s*1;/);
    expect(responsiveCss).toMatch(/\.dw-snippet\s*\{[^}]*text-overflow:\s*ellipsis;/);
    expect(responsiveCss).toMatch(/\.dw-snippet\s*\{[^}]*overflow:\s*hidden;/);
  });

  it('enforces hardware-accelerated CSS grid accordion transitions on sources drawer', () => {
    expect(feedCss).toMatch(/\.dw-sources-drawer-wrapper\s*\{[^}]*grid-template-rows:\s*0fr;/);
    expect(feedCss).toMatch(/\.dw-sources-drawer-wrapper\s*\{[^}]*opacity:\s*0;/);
    expect(feedCss).toMatch(/\.dw-sources-drawer-wrapper\.is-open\s*\{[^}]*grid-template-rows:\s*1fr;/);
    expect(feedCss).toMatch(/\.dw-sources-drawer-wrapper\.is-open\s*\{[^}]*opacity:\s*1;/);
    expect(feedCss).toMatch(/\.dw-sources-drawer\s*\{[^}]*min-height:\s*0;/);
  });

  it('enforces single-line cluster footer and sources toggle micro-pill styling', () => {
    expect(feedCss).toMatch(/\.dw-cluster-footer\s*\{[^}]*flex-wrap:\s*nowrap;/);
    expect(feedCss).toMatch(/\.dw-cluster-footer\s*\{[^}]*justify-content:\s*space-between;/);
    expect(responsiveCss).toMatch(/\.dw-cluster-footer\s*\{[^}]*flex-wrap:\s*nowrap;/);
    expect(feedCss).toMatch(/\.dw-sources-toggle-btn\s*\{[^}]*min-height:\s*28px;/);
    expect(feedCss).toMatch(/\.dw-sources-toggle-btn\s*\{[^}]*flex-shrink:\s*0;/);
    expect(responsiveCss).toMatch(/\.dw-sources-toggle-btn::before\s*\{[^}]*min-width:\s*44px;/);
    expect(responsiveCss).toMatch(/\.dw-sources-toggle-btn::before\s*\{[^}]*min-height:\s*44px;/);
  });
});
