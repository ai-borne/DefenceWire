/**
 * Integration Tests for Feed Rendering & UI Interactions
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeApp } from '../../src/main.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Integration: Feed Rendering & UI Components', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should render complete Techmeme UI structure on initializeApp', () => {
    initializeApp();

    const app = document.getElementById('app');
    expect(app).not.toBeNull();

    // Verify Header
    const header = app?.querySelector('header.dw-header');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Defence');
    expect(header?.textContent).toContain(STRINGS.app.institutionalBadge);

    // Verify Live Clock & Search Input
    const clock = app?.querySelector('#dw-header-ist-clock');
    expect(clock).not.toBeNull();
    const searchInput = app?.querySelector('input[type="search"]');
    expect(searchInput).not.toBeNull();

    // Verify Navigation Tabs
    const navTabs = app?.querySelectorAll('.dw-nav-tab');
    expect(navTabs?.length).toBe(9);

    // Verify Story Clusters
    const clusters = app?.querySelectorAll('article.dw-cluster');
    expect(clusters?.length).toBeGreaterThan(0);

    // Verify Lead Story
    const leadCluster = app?.querySelector('article.dw-cluster--lead');
    expect(leadCluster).not.toBeNull();
    expect(leadCluster?.querySelector('.dw-lead-tag')).not.toBeNull();

    // Verify Sidebar Rails (River & Ecosystem)
    const rails = app?.querySelectorAll('aside.dw-rail-card');
    expect(rails?.length).toBe(2);

    // Verify Footer
    const footer = app?.querySelector('footer.dw-footer');
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain(STRINGS.footer.copyright);
  });

  it('should filter clusters when a category tab is clicked', () => {
    initializeApp();

    const navyTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.navy
    ) as HTMLButtonElement;

    expect(navyTab).toBeDefined();
    navyTab.click();

    // Tab active status check after re-render
    const activeNavyTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.navy
    ) as HTMLButtonElement;
    expect(activeNavyTab.classList.contains('active')).toBe(true);
    expect(activeNavyTab.getAttribute('aria-selected')).toBe('true');

    // Clusters should be updated to Navy
    const headlines = Array.from(document.querySelectorAll('.dw-headline')).map(
      (h) => h.textContent
    );
    expect(headlines.some((h) => h?.toLowerCase().includes('submarine') || h?.toLowerCase().includes('navy'))).toBe(true);
  });

  it('should render River of News view when River tab is clicked', () => {
    initializeApp();

    const riverTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.river
    ) as HTMLButtonElement;

    expect(riverTab).toBeDefined();
    riverTab.click();

    const mainFeed = document.querySelector('.dw-main-feed');
    expect(mainFeed?.textContent).toContain(STRINGS.river.heading);
    expect(mainFeed?.textContent).toContain(STRINGS.river.subheading);
  });

  it('should toggle SSB Intelligence Drawer on click with proper accessibility attributes', () => {
    initializeApp();

    const ssbToggleBtn = document.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;
    expect(ssbToggleBtn).not.toBeNull();
    expect(ssbToggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Expand drawer
    ssbToggleBtn.click();

    const ssbDrawer = document.querySelector('.dw-ssb-drawer');
    expect(ssbDrawer).not.toBeNull();
    expect(ssbDrawer?.textContent).toContain(STRINGS.ssb.whyItMattersHeading);
    expect(ssbDrawer?.textContent).toContain(STRINGS.ssb.ctaButton);

    // Verify safe link in drawer
    const ctaLink = ssbDrawer?.querySelector('a.dw-ssb-cta-btn') as HTMLAnchorElement;
    expect(ctaLink).not.toBeNull();
    expect(ctaLink.target).toBe('_blank');
    expect(ctaLink.rel).toBe('noopener noreferrer');
    expect(ctaLink.href).toContain('ssbmax.ai');

    // Collapse drawer
    const ssbCollapseBtn = document.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;
    expect(ssbCollapseBtn.getAttribute('aria-expanded')).toBe('true');
    ssbCollapseBtn.click();

    expect(document.querySelector('.dw-ssb-drawer')).toBeNull();
  });

  it('should toggle Curator Desk modal when header button is clicked', () => {
    initializeApp();

    const curatorBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(STRINGS.editor.openDashboard)
    );
    expect(curatorBtn).toBeDefined();

    // Open Curator Desk
    curatorBtn?.click();

    const overlay = document.querySelector('.dw-editor-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain(STRINGS.editor.dashboardTitle);

    // Close Curator Desk
    const closeBtn = overlay?.querySelector('.dw-editor-close') as HTMLButtonElement | null;
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();

    expect(document.querySelector('.dw-editor-modal-overlay')).toBeNull();
  });
});

