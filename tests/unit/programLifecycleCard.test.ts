/**
 * Unit Tests for ProgramStageBar & ProgramLifecycleCard UI Components
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  LIFECYCLE_STAGES,
  getStageIndex,
  getStageLabel,
  getStageClassModifier,
  renderProgramStageBar
} from '../../src/components/ProgramStageBar.js';
import {
  formatProgramBudget,
  renderProgramLifecycleCard
} from '../../src/components/ProgramLifecycleCard.js';
import { StrategicProgram } from '../../src/types/programs.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('ProgramStageBar Sub-Component', () => {
  it('contains all 6 lifecycle stages in sequential order', () => {
    expect(LIFECYCLE_STAGES).toEqual([
      'concept',
      'sanctioned',
      'development',
      'trials',
      'production',
      'induction'
    ]);
  });

  it('computes correct stage indices', () => {
    expect(getStageIndex('concept')).toBe(0);
    expect(getStageIndex('development')).toBe(2);
    expect(getStageIndex('induction')).toBe(5);
  });

  it('retrieves full and compact stage labels from STRINGS', () => {
    expect(getStageLabel('concept')).toBe(STRINGS.programs.stageConcept);
    expect(getStageLabel('concept', true)).toBe(STRINGS.programs.stageShortConcept);
    expect(getStageLabel('production')).toBe(STRINGS.programs.stageProduction);
    expect(getStageLabel('production', true)).toBe(STRINGS.programs.stageShortProduction);
  });

  it('returns valid CSS class modifiers for each stage', () => {
    expect(getStageClassModifier('concept')).toBe('dw-stage--concept');
    expect(getStageClassModifier('development')).toBe('dw-stage--development');
    expect(getStageClassModifier('induction')).toBe('dw-stage--induction');
  });

  it('renders a 6-step progress bar with completed, active, and upcoming states', () => {
    const bar = renderProgramStageBar('trials');
    expect(bar.classList.contains('dw-program-stage-bar')).toBe(true);
    expect(bar.getAttribute('role')).toBe('region');
    expect(bar.getAttribute('aria-label')).toBe(STRINGS.programs.stageBarAriaLabel);

    const steps = bar.querySelectorAll('.dw-stage-step');
    expect(steps.length).toBe(6);

    // Concept (0), Sanctioned (1), Development (2) -> Completed
    expect(steps[0]!.classList.contains('dw-stage-step--completed')).toBe(true);
    expect(steps[0]!.querySelector('.dw-stage-step-marker')?.textContent).toBe('✓');
    expect(steps[1]!.classList.contains('dw-stage-step--completed')).toBe(true);
    expect(steps[2]!.classList.contains('dw-stage-step--completed')).toBe(true);

    // Trials (3) -> Active
    expect(steps[3]!.classList.contains('dw-stage-step--active')).toBe(true);
    expect(steps[3]!.getAttribute('aria-current')).toBe('step');
    expect(steps[3]!.querySelector('.dw-stage-step-marker')?.textContent).toBe('4');

    // Production (4), Induction (5) -> Upcoming
    expect(steps[4]!.classList.contains('dw-stage-step--upcoming')).toBe(true);
    expect(steps[4]!.querySelector('.dw-stage-step-marker')?.textContent).toBe('5');
    expect(steps[5]!.classList.contains('dw-stage-step--upcoming')).toBe(true);
  });

  it('supports compact rendering mode', () => {
    const compactBar = renderProgramStageBar('development', { compact: true });
    expect(compactBar.classList.contains('dw-program-stage-bar--compact')).toBe(true);
    const steps = compactBar.querySelectorAll('.dw-stage-step-label');
    expect(steps[0]!.textContent).toBe(STRINGS.programs.stageShortConcept);
  });

  it('supports interactive mode with onStageClick and keyboard listeners', () => {
    const onClick = vi.fn();
    const bar = renderProgramStageBar('sanctioned', {
      interactive: true,
      onStageClick: onClick
    });

    const steps = bar.querySelectorAll<HTMLElement>('.dw-stage-step');
    steps[2]!.click();
    expect(onClick).toHaveBeenCalledWith('development');

    steps[4]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onClick).toHaveBeenCalledWith('production');
  });
});

describe('ProgramLifecycleCard Component', () => {
  const mockProgram: StrategicProgram = {
    id: 'lca-tejas-mk1a',
    name: 'LCA Tejas Mk-1A',
    shortName: 'Tejas Mk-1A',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'ADA / HAL',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 48000,
    estimatedTotalCrores: 48000,
    indigenousPercentage: 65,
    targetInductionYear: '2024-2029',
    plannedUnits: '83 + 97 Aircraft',
    summary: '4.5-generation supersonic lightweight multirole fighter with AESA radar and EW suite.',
    keySubsystems: [
      { name: 'Uttam AESA Radar', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / HAL', status: 'Integrated' },
      { name: 'Angad EW Suite', type: 'Avionics / EW', indigenous: true, supplier: 'DARE / BEL', status: 'Integrated' },
      { name: 'F404-IN20 Engine', type: 'Propulsion / Engine', indigenous: false, supplier: 'GE Aerospace', status: 'Supply Active' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-03', title: 'First Flight of Serial Production Aircraft', status: 'completed' }
    ],
    searchAliases: ['Tejas', 'Tejas Mk1A', 'LCA Mk1A'],
    officialDesignation: 'Light Combat Aircraft Mk-1A',
    foreignOem: 'GE Aerospace (Engine)'
  };

  describe('formatProgramBudget', () => {
    it('formats Indian rupee crore values correctly', () => {
      expect(formatProgramBudget(48000)).toBe('₹48,000 Cr');
      expect(formatProgramBudget(1500)).toBe('₹1,500 Cr');
    });

    it('returns fallback string for undefined, zero, or negative budgets', () => {
      expect(formatProgramBudget(undefined)).toBe(STRINGS.programs.notAvailable);
      expect(formatProgramBudget(0)).toBe(STRINGS.programs.notAvailable);
      expect(formatProgramBudget(-500)).toBe(STRINGS.programs.notAvailable);
    });
  });

  describe('renderProgramLifecycleCard', () => {
    it('renders card article with complete program metadata and attributes', () => {
      const card = renderProgramLifecycleCard(mockProgram);
      expect(card.tagName).toBe('ARTICLE');
      expect(card.classList.contains('dw-program-card')).toBe(true);
      expect(card.getAttribute('data-program-id')).toBe('lca-tejas-mk1a');
      expect(card.getAttribute('data-domain')).toBe('aerospace');
      expect(card.getAttribute('data-stage')).toBe('production');

      // Domain & Branch Badges
      const domainBadge = card.querySelector('.dw-program-domain-badge');
      expect(domainBadge?.textContent).toBe('AEROSPACE');

      const branchPill = card.querySelector('.dw-program-branch-pill');
      expect(branchPill?.textContent).toBe('Indian Air Force');

      // IDDM Pill
      const iddmPill = card.querySelector('.dw-iddm-pill');
      expect(iddmPill?.textContent).toContain('65% IDDM');
    });

    it('renders program title, designation, agency, and OEM info', () => {
      const card = renderProgramLifecycleCard(mockProgram);
      const titleLink = card.querySelector('.dw-program-title a') as HTMLAnchorElement;
      expect(titleLink.textContent).toBe('LCA Tejas Mk-1A');
      expect(titleLink.getAttribute('href')).toBe('#program/lca-tejas-mk1a');

      const designation = card.querySelector('.dw-program-designation');
      expect(designation?.textContent).toBe('Light Combat Aircraft Mk-1A');

      const agency = card.querySelector('.dw-program-agency');
      expect(agency?.textContent).toContain('ADA / HAL');
      expect(agency?.textContent).toContain('OEM: GE Aerospace (Engine)');
    });

    it('embeds stage progress bar with active stage matching program stage', () => {
      const card = renderProgramLifecycleCard(mockProgram);
      const stageBar = card.querySelector('.dw-program-stage-bar');
      expect(stageBar).not.toBeNull();
      const activeStep = stageBar?.querySelector('.dw-stage-step--active');
      expect(activeStep?.textContent).toContain(STRINGS.programs.stageShortProduction);
    });

    it('renders metrics grid with budget, target timeline, and planned units', () => {
      const card = renderProgramLifecycleCard(mockProgram);
      const values = Array.from(card.querySelectorAll('.dw-program-metric-value')).map((el) => el.textContent);
      expect(values).toContain('₹48,000 Cr');
      expect(values).toContain('2024-2029');
      expect(values).toContain('83 + 97 Aircraft');
    });

    it('renders summary snippet and subsystems preview tags', () => {
      const card = renderProgramLifecycleCard(mockProgram);
      const summary = card.querySelector('.dw-program-summary');
      expect(summary?.textContent).toContain('4.5-generation supersonic');

      const tags = Array.from(card.querySelectorAll('.dw-subsystem-tag')).map((el) => el.textContent);
      expect(tags.length).toBe(3);
      expect(tags[0]).toContain('Uttam AESA Radar (LRDE / HAL)');
      expect(tags[2]).toContain('F404-IN20 Engine (GE Aerospace)');
    });

    it('renders live wire update counter when newsCount > 0', () => {
      const card = renderProgramLifecycleCard(mockProgram, { newsCount: 5 });
      const pulse = card.querySelector('.dw-program-wire-pulse');
      expect(pulse?.textContent).toContain('5 Wire Updates');
    });

    it('renders active watch fallback badge when newsCount is zero or omitted', () => {
      const card = renderProgramLifecycleCard(mockProgram, { newsCount: 0 });
      const pulse = card.querySelector('.dw-program-wire-pulse');
      expect(pulse?.classList.contains('dw-program-wire-pulse--watch')).toBe(true);
      expect(pulse?.textContent).toContain(STRINGS.programs.activeWatch);
    });

    it('invokes onSelect callback when clicking title link or dossier button', () => {
      const onSelect = vi.fn();
      const card = renderProgramLifecycleCard(mockProgram, { onSelect });

      const titleLink = card.querySelector('.dw-program-title a') as HTMLAnchorElement;
      titleLink.click();
      expect(onSelect).toHaveBeenCalledWith(mockProgram);

      const dossierBtn = card.querySelector('.dw-program-dossier-btn') as HTMLAnchorElement;
      dossierBtn.click();
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('sanitizes XSS payloads in program fields', () => {
      const xssProgram: StrategicProgram = {
        ...mockProgram,
        id: 'xss-prog',
        name: '<script>alert("xss")</script>XSS Jet',
        officialDesignation: '<b onmouseover="alert(1)">Bold XSS</b>',
        leadAgency: '<img src=x onerror=alert(1)>DRDO',
        summary: '<script>evil()</script>Secret fighter design.',
        keySubsystems: [
          { name: '<script>sub()</script>Sensor', type: 'Radar / Sensor', indigenous: true, supplier: '<img src=x>BEL', status: 'Active' }
        ]
      };

      const card = renderProgramLifecycleCard(xssProgram);
      expect(card.innerHTML).not.toContain('<script>');
      expect(card.innerHTML).not.toContain('<img');
      expect(card.textContent).toContain('XSS Jet');
      expect(card.textContent).toContain('Bold XSS');
      expect(card.textContent).toContain('DRDO');
      expect(card.textContent).toContain('Secret fighter design.');
    });
  });
});
