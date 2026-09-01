/**
 * Integration Tests for Feed Rendering, Stealth Curator Access & UI Interactions
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeApp } from '../../src/main.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Integration: Feed Rendering & UI Components', () => {
  beforeEach(() => {
    window.location.hash = '';
    if (typeof window.localStorage !== 'undefined') {
      window.localStorage.clear();
    }
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

    // Verify stealth: No public curator button in controls
    const curatorBtn = Array.from(header?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes(STRINGS.editor.openDashboard)
    );
    expect(curatorBtn).toBeUndefined();

    // Verify Live Clock, Feed Sync Button & Search Input
    const clock = app?.querySelector('#dw-header-ist-clock');
    expect(clock).not.toBeNull();
    const syncBtn = app?.querySelector('.dw-sync-btn');
    expect(syncBtn).not.toBeNull();
    expect(syncBtn?.getAttribute('aria-label')).toBe(STRINGS.sync.ariaSyncNow);
    const searchInput = app?.querySelector('input[type="search"]');
    expect(searchInput).not.toBeNull();

    // Verify Navigation Tabs
    const navTabs = app?.querySelectorAll('.dw-nav-tab');
    expect(navTabs?.length).toBe(10);

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

    const activeNavyTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.navy
    ) as HTMLButtonElement;
    expect(activeNavyTab.classList.contains('active')).toBe(true);
    expect(activeNavyTab.getAttribute('aria-selected')).toBe('true');

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

  it('should toggle the article Summary drawer on click without SSB/CTA noise on Top Stories', () => {
    initializeApp();

    const summaryToggleBtn = document.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;
    expect(summaryToggleBtn).not.toBeNull();
    expect(summaryToggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Expand drawer
    summaryToggleBtn.click();

    const summaryDrawer = document.querySelector('.dw-ssb-drawer');
    expect(summaryDrawer).not.toBeNull();
    expect(summaryDrawer?.textContent).toContain(STRINGS.summary.whyItMattersHeading);
    // No SSB insight box or SSBMax.ai CTA outside the dedicated SSB Intel tab.
    expect(summaryDrawer?.querySelector('.dw-ssb-insight-box')).toBeNull();
    expect(summaryDrawer?.textContent).not.toContain(STRINGS.ssb.ctaButton);

    // Collapse drawer
    const collapseBtn = document.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');
    collapseBtn.click();

    expect(document.querySelector('.dw-ssb-drawer')).toBeNull();
  });

  it('should surface the SSB Insight box and SSBMax.ai CTA only within the SSB Intel tab', () => {
    initializeApp();

    const ssbTab = Array.from(document.querySelectorAll('.dw-nav-tab')).find(
      (el) => el.textContent === STRINGS.nav.ssb
    ) as HTMLButtonElement;
    expect(ssbTab).toBeDefined();
    ssbTab.click();

    const toggleBtn = document.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    toggleBtn.click();

    const drawer = document.querySelector('.dw-ssb-drawer');
    expect(drawer).not.toBeNull();

    const insightBox = drawer?.querySelector('.dw-ssb-insight-box');
    expect(insightBox).not.toBeNull();
    expect(insightBox?.textContent).toContain(STRINGS.ssb.gdTopicsHeading);
    expect(insightBox?.textContent).toContain(STRINGS.ssb.ctaButton);

    const ctaLink = drawer?.querySelector('a.dw-ssb-cta-btn') as HTMLAnchorElement;
    expect(ctaLink).not.toBeNull();
    expect(ctaLink.target).toBe('_blank');
    expect(ctaLink.rel).toBe('noopener noreferrer');
    expect(ctaLink.href).toContain('ssbmax.ai');
  });

  it('should open Curator Desk upon 5 rapid stealth clicks on institutional badge', () => {
    initializeApp();

    const badge = document.querySelector('.dw-inst-badge') as HTMLElement | null;
    expect(badge).not.toBeNull();

    // 5 rapid clicks on badge
    for (let i = 0; i < 5; i++) {
      badge?.click();
    }

    const overlay = document.querySelector('.dw-editor-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain(STRINGS.editor.authTitle);
  });

  it('should toggle Curator Desk via keyboard shortcut Ctrl+Shift+C', () => {
    initializeApp();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      })
    );

    const overlay = document.querySelector('.dw-editor-modal-overlay');
    expect(overlay).not.toBeNull();

    // Close via Escape key
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
    );

    expect(document.querySelector('.dw-editor-modal-overlay')).toBeNull();
  });
});
