/**
 * Unit Tests for Program Detail Modal Subviews & Tabbed Navigation
 * Verifies tab switching, keyboard navigation, aria-selected states, and subviews.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { openProgramDetailModal } from '../../src/components/ProgramDetailModal.js';
import { renderProgramSpecsView } from '../../src/components/programs/ProgramSpecsView.js';
import { renderProgramOrderBookView } from '../../src/components/programs/ProgramOrderBookView.js';
import { renderProgramIdexView } from '../../src/components/programs/ProgramIdexView.js';
import { getProgramById } from '../../src/data/strategicPrograms.js';
import { STRINGS } from '../../src/resources/strings.js';
import { StrategicProgram } from '../../src/types/programs.js';

describe('Unit: ProgramDetailModal Tabs & Keyboard Navigation', () => {
  let tejas: StrategicProgram;

  beforeEach(() => {
    document.body.innerHTML = '';
    const prog = getProgramById('tejas-mk1a');
    expect(prog).toBeDefined();
    tejas = prog!;
  });

  it('should render 5 tabs with Overview initially selected', () => {
    const modal = openProgramDetailModal(tejas);
    const tabs = modal.querySelectorAll<HTMLButtonElement>('.dw-program-tab-btn');
    expect(tabs.length).toBe(5);

    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.tabIndex).toBe(0);
    expect(tabs[0]?.classList.contains('active')).toBe(true);

    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]?.tabIndex).toBe(-1);
    expect(tabs[1]?.classList.contains('active')).toBe(false);

    const overviewPanel = modal.querySelector('#dw-tabpanel-overview') as HTMLElement;
    const specsPanel = modal.querySelector('#dw-tabpanel-specs') as HTMLElement;
    const orbatPanel = modal.querySelector('#dw-tabpanel-orbat') as HTMLElement;
    expect(overviewPanel.hidden).toBe(false);
    expect(specsPanel.hidden).toBe(true);
    expect(orbatPanel.hidden).toBe(true);
  });

  it('should switch tabs and update panels on button click', () => {
    const modal = openProgramDetailModal(tejas);
    const tabs = modal.querySelectorAll<HTMLButtonElement>('.dw-program-tab-btn');
    const specsTab = tabs[1]!;
    const overviewPanel = modal.querySelector('#dw-tabpanel-overview') as HTMLElement;
    const specsPanel = modal.querySelector('#dw-tabpanel-specs') as HTMLElement;

    specsTab.click();

    expect(specsTab.getAttribute('aria-selected')).toBe('true');
    expect(specsTab.tabIndex).toBe(0);
    expect(specsPanel.hidden).toBe(false);
    expect(specsPanel.classList.contains('active')).toBe(true);

    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false');
    expect(overviewPanel.hidden).toBe(true);
  });

  it('should support keyboard navigation across tabs (ArrowRight, ArrowLeft, Home, End)', () => {
    const modal = openProgramDetailModal(tejas);
    const tabList = modal.querySelector('.dw-program-modal-tabs') as HTMLElement;
    const tabs = modal.querySelectorAll<HTMLButtonElement>('.dw-program-tab-btn');

    // ArrowRight: Overview -> Specs
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');

    // ArrowRight: Specs -> OrderBook
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');

    // ArrowRight: OrderBook -> ORBAT
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(tabs[3]?.getAttribute('aria-selected')).toBe('true');

    // End: jump to last tab (iDEX)
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(tabs[4]?.getAttribute('aria-selected')).toBe('true');

    // ArrowRight: wraps around to Overview
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');

    // ArrowLeft: wraps around to last tab (iDEX)
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(tabs[4]?.getAttribute('aria-selected')).toBe('true');

    // Home: jump to first tab (Overview)
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Unit: ProgramDetailModal Subsystem Supplier Chips', () => {
  it('should render a clickable supplier chip for a subsystem with a verified program_suppliers link, keyed by subsystem name not the free-text manufacturer field', () => {
    // tejas-mk1a's "Uttam AESA Radar" subsystem carries supplier text "LRDE / BEL" (see
    // strategicPrograms data), while the verified link in seedSuppliersDpsu.ts joins on the
    // subsystem NAME to supplier id "bel" (Bharat Electronics Limited) — these two supplier
    // strings never match, so the chip must be resolved via the subsystemName link, not by
    // comparing supplier.name to the free-text manufacturer field.
    const tejas = getProgramById('tejas-mk1a')!;
    const modal = openProgramDetailModal(tejas);

    const chip = modal.querySelector<HTMLButtonElement>('.dw-sub-supplier-chip');
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Bharat Electronics Limited');
  });

  it('should open the Supplier Dossier Modal when a subsystem supplier chip is clicked', () => {
    const tejas = getProgramById('tejas-mk1a')!;
    const modal = openProgramDetailModal(tejas);

    const chip = modal.querySelector<HTMLButtonElement>('.dw-sub-supplier-chip');
    expect(chip).not.toBeNull();
    chip!.click();

    const dialogs = document.querySelectorAll('[role="dialog"]');
    const supplierDossier = Array.from(dialogs).find(
      (d) => d.textContent?.includes('Bharat Electronics Limited') && d.textContent?.includes('Linked Strategic Programs')
    );
    expect(supplierDossier).toBeDefined();
  });
});

describe('Unit: ProgramSpecsView Component', () => {
  it('should render categorized Jane specs for Tejas Mk1A', () => {
    const tejas = getProgramById('tejas-mk1a')!;
    const el = renderProgramSpecsView(tejas);

    expect(el.textContent).toContain(STRINGS.programs.specificationsHeading);
    expect(el.textContent).toContain(STRINGS.programs.specsDimensionsHeading);
    expect(el.textContent).toContain(STRINGS.programs.specsPerformanceHeading);
    expect(el.textContent).toContain(STRINGS.programs.specsPropulsionHeading);
    expect(el.textContent).toContain(STRINGS.programs.specsAvionicsHeading);
    expect(el.textContent).toContain(STRINGS.programs.specsArmamentHeading);

    expect(el.textContent).toContain('Uttam AESA');
    expect(el.textContent).toContain('Mach 1.8');
    expect(el.textContent).toContain('General Electric F404');
    expect(el.textContent).toContain('Astra Mk1/Mk2 BVR');
  });

  it('should render fallback empty state when program has no technical specs', () => {
    const bareProgram: StrategicProgram = {
      id: 'bare-prog',
      name: 'Experimental Platform',
      shortName: 'EXP',
      domain: 'unmanned',
      stage: 'concept',
      leadAgency: 'DRDO',
      serviceBranch: ['Tri-Services'],
      indigenousPercentage: 50,
      summary: 'Test summary',
      keySubsystems: [],
      keyMilestones: [],
      searchAliases: []
    };

    const el = renderProgramSpecsView(bareProgram);
    expect(el.textContent).toContain(STRINGS.programs.specsNoData);
  });
});

describe('Unit: ProgramOrderBookView Component', () => {
  it('should render delivery tracker and batches for Tejas Mk1A', () => {
    const tejas = getProgramById('tejas-mk1a')!;
    const el = renderProgramOrderBookView(tejas);

    expect(el.textContent).toContain(STRINGS.programs.orderBookHeading);
    expect(el.textContent).toContain(STRINGS.programs.orderBookSanctioned);
    expect(el.textContent).toContain('180');
    expect(el.textContent).toContain('178'); // pending

    // Progress bar check
    const progressTrack = el.querySelector('.dw-orderbook-progress-track');
    expect(progressTrack).not.toBeNull();
    expect(progressTrack?.getAttribute('role')).toBe('progressbar');
    expect(progressTrack?.getAttribute('aria-valuenow')).toBe('2');
    expect(progressTrack?.getAttribute('aria-valuemax')).toBe('180');

    // Batch cards
    expect(el.textContent).toContain('83 Mk1A Series Order');
    expect(el.textContent).toContain('HAL Aircraft Division, Bengaluru');
    expect(el.textContent).toContain('Sulur');
  });

  it('should render empty notice for program with no serial order book', () => {
    const bareProgram: StrategicProgram = {
      id: 'no-orders-prog',
      name: 'Future Destroyer',
      shortName: 'FD',
      domain: 'naval',
      stage: 'concept',
      leadAgency: 'Navy Warship Design Bureau',
      serviceBranch: ['Indian Navy'],
      indigenousPercentage: 90,
      summary: 'Future concept ship',
      keySubsystems: [],
      keyMilestones: [],
      searchAliases: []
    };

    const el = renderProgramOrderBookView(bareProgram);
    expect(el.textContent).toContain(STRINGS.programs.orderBookEmpty);
  });
});

describe('Unit: ProgramIdexView Component & Security', () => {
  it('should render folded-in iDEX challenge cards for Tejas Mk1A and Zorawar Light Tank', () => {
    const tejas = getProgramById('tejas-mk1a')!;
    const elTejas = renderProgramIdexView(tejas);

    expect(elTejas.textContent).toContain(STRINGS.programs.idexHeading);
    expect(elTejas.textContent).toContain('DISC 13');
    expect(elTejas.textContent).toContain('DISC-13/IAF/05');
    expect(elTejas.textContent).toContain('₹2.00 Crore');
    expect(elTejas.textContent).toContain('Wideband Digital Radio Frequency Memory');

    // Safe PDF link check
    const pdfLink = elTejas.querySelector<HTMLAnchorElement>('.dw-idex-pdf-btn');
    expect(pdfLink).not.toBeNull();
    expect(pdfLink?.target).toBe('_blank');
    expect(pdfLink?.rel).toContain('noopener');
    expect(pdfLink?.rel).toContain('noreferrer');

    // Zorawar Light Tank maps to DISC 14 microbolometer challenge
    const zorawar = getProgramById('zorawar-light-tank')!;
    const elZorawar = renderProgramIdexView(zorawar);
    expect(elZorawar.textContent).toContain('DISC 14');
    expect(elZorawar.textContent).toContain('DISC-14/ARMY/01');
    expect(elZorawar.textContent).toContain('₹1.50 Crore');
    expect(elZorawar.textContent).toContain('Microbolometer');
  });

  it('should render empty notice when no challenges mapped', () => {
    const bareProgram: StrategicProgram = {
      id: 'no-idex-prog',
      name: 'Basic Platform',
      shortName: 'BP',
      domain: 'land',
      stage: 'sanctioned',
      leadAgency: 'DRDO',
      serviceBranch: ['Indian Army'],
      indigenousPercentage: 80,
      summary: 'Basic platform summary',
      keySubsystems: [],
      keyMilestones: [],
      searchAliases: []
    };

    const el = renderProgramIdexView(bareProgram);
    expect(el.textContent).toContain(STRINGS.programs.idexEmpty);
  });

  it('should sanitize untrusted text and prevent XSS injection', () => {
    const xssProgram: StrategicProgram = {
      id: 'xss-prog',
      name: 'Injection <script>alert("xss")</script> Platform',
      shortName: 'XSS',
      domain: 'aerospace',
      stage: 'development',
      leadAgency: '<b onmouseover="alert(1)">Hacked Agency</b>',
      serviceBranch: ['Indian Air Force'],
      indigenousPercentage: 50,
      summary: '<img src=x onerror=alert("hacked") />',
      keySubsystems: [],
      keyMilestones: [],
      searchAliases: []
    };

    const modal = openProgramDetailModal(xssProgram);
    expect(modal.querySelector('script')).toBeNull();
    expect(modal.querySelector('img')).toBeNull();
    expect(modal.innerHTML).not.toContain('<script>');
  });
});
