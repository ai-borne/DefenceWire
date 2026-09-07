/**
 * Unit Tests for PublicPatternBanner Component (Phase 5 Display UI)
 * Verifies DOM rendering, confidence meter, entity pills, carousel, and graph deep-link callbacks.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderPublicPatternBanner } from '../../src/components/patterns/PublicPatternBanner.js';
import { PublicPatternViewModel } from '../../src/viewmodels/PublicPatternViewModel.js';
import { EmergentPattern } from '../../src/types/patterns.js';
import { PATTERN_STRINGS } from '../../src/resources/patternStrings.js';

describe('PublicPatternBanner Component', () => {
  const mockPattern1: EmergentPattern = {
    id: 'pat_delhi_air_defence',
    title: 'NCR Counter-UAS Convergence',
    synthesis: 'Multi-track deployment of L-70 guns and counter-drone systems across NCR.',
    confidence: 0.88,
    nodeIds: ['delhi', 'l-70-guns'],
    clusterIds: ['c-101', 'c-102'],
    status: 'approved',
    createdAt: '2026-09-02T12:00:00Z'
  };

  const mockPattern2: EmergentPattern = {
    id: 'pat_carrier_battle_group',
    title: 'Eastern Fleet Carrier Deployment',
    synthesis: 'INS Vikrant operations integrated with nuclear attack submarine escort.',
    confidence: 0.94,
    nodeIds: ['ins-vikrant', 'eastern-naval-command'],
    clusterIds: ['c-201'],
    status: 'approved',
    createdAt: '2026-09-03T14:00:00Z'
  };

  it('renders is-hidden when pattern list is empty', () => {
    const vm = new PublicPatternViewModel(async () => []);
    const element = renderPublicPatternBanner(vm);
    expect(element.classList.contains('is-hidden')).toBe(true);
  });

  it('renders active pattern data with radar dot, title, synthesis, and confidence meter', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1]);

    const element = renderPublicPatternBanner(vm);
    expect(element.classList.contains('is-hidden')).toBe(false);

    const titleEl = element.querySelector('.dw-pattern-title');
    expect(titleEl?.textContent).toBe('NCR Counter-UAS Convergence');

    const synthEl = element.querySelector('.dw-pattern-synthesis');
    expect(synthEl?.textContent).toContain('Multi-track deployment');

    const brandEl = element.querySelector('.dw-pattern-brand-label');
    expect(brandEl?.textContent).toBe(PATTERN_STRINGS.radarLiveSignal);

    const confText = element.querySelector('.dw-pattern-confidence-badge');
    expect(confText?.textContent).toContain('88%');

    const fillBar = element.querySelector('.dw-pattern-confidence-bar-fill') as HTMLElement;
    expect(fillBar?.style.width).toBe('88%');
  });

  it('renders clickable entity pills and triggers entity callback', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1]);

    const onEntityClick = vi.fn();
    const element = renderPublicPatternBanner(vm, { onEntityClick });

    const pills = element.querySelectorAll('.dw-pattern-entity-pill');
    expect(pills.length).toBe(2);
    expect(pills[0]?.textContent).toContain('delhi');

    (pills[0] as HTMLButtonElement).click();
    expect(onEntityClick).toHaveBeenCalledWith('delhi');
  });

  it('triggers onInspectInGraph with pattern nodeIds when inspect button is clicked', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1]);

    const onInspectInGraph = vi.fn();
    const element = renderPublicPatternBanner(vm, { onInspectInGraph });

    const inspectBtn = element.querySelector('.dw-pattern-btn-inspect') as HTMLButtonElement;
    expect(inspectBtn).not.toBeNull();
    inspectBtn.click();

    expect(onInspectInGraph).toHaveBeenCalledWith(['delhi', 'l-70-guns']);
  });

  it('renders carousel navigation when multiple patterns exist and changes active pattern', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1, mockPattern2]);

    const element = renderPublicPatternBanner(vm);
    const pageIndicator = element.querySelector('.dw-pattern-page-indicator');
    expect(pageIndicator?.textContent).toBe('1/2');

    const navButtons = element.querySelectorAll('.dw-pattern-nav-btn');
    expect(navButtons.length).toBe(2);

    const nextBtn = navButtons[1] as HTMLButtonElement;
    nextBtn.click();

    // After clicking next, vm notifies and element re-renders pattern 2
    const titleEl = element.querySelector('.dw-pattern-title');
    expect(titleEl?.textContent).toBe('Eastern Fleet Carrier Deployment');
    expect(element.querySelector('.dw-pattern-page-indicator')?.textContent).toBe('2/2');
  });

  it('toggles co-occurring signals drawer', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1]);

    const element = renderPublicPatternBanner(vm);
    expect(element.querySelector('.dw-pattern-drawer')).toBeNull();

    const signalsBtn = element.querySelector('.dw-pattern-btn-signals') as HTMLButtonElement;
    expect(signalsBtn).not.toBeNull();
    signalsBtn.click();

    const drawer = element.querySelector('.dw-pattern-drawer');
    expect(drawer).not.toBeNull();
    const items = drawer?.querySelectorAll('.dw-pattern-signal-item');
    expect(items?.length).toBe(2);
  });

  it('dismisses banner when dismiss button is clicked', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([mockPattern1]);

    const element = renderPublicPatternBanner(vm);
    expect(element.classList.contains('is-hidden')).toBe(false);

    const dismissBtn = element.querySelector('.dw-pattern-dismiss-btn') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    dismissBtn.click();

    expect(element.classList.contains('is-hidden')).toBe(true);
    expect(vm.getIsDismissed()).toBe(true);
  });
});
