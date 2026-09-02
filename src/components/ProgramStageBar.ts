/**
 * Program Lifecycle Stage Progress Bar Sub-Component for DefenceWire.in
 * Renders a visual 6-step progression tracker (Concept -> Sanctioned -> Development -> Trials -> Production -> Induction).
 * Hard limit: <= 300 LOC.
 */

import { LifecycleStage } from '../types/programs.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';

export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  'concept',
  'sanctioned',
  'development',
  'trials',
  'production',
  'induction'
];

export interface ProgramStageBarOptions {
  compact?: boolean;
  interactive?: boolean;
  onStageClick?: (stage: LifecycleStage) => void;
}

export function getStageIndex(stage: LifecycleStage): number {
  const idx = LIFECYCLE_STAGES.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

export function getStageLabel(stage: LifecycleStage, compact = false): string {
  switch (stage) {
    case 'concept':
      return compact ? STRINGS.programs.stageShortConcept : STRINGS.programs.stageConcept;
    case 'sanctioned':
      return compact ? STRINGS.programs.stageShortSanctioned : STRINGS.programs.stageSanctioned;
    case 'development':
      return compact ? STRINGS.programs.stageShortDevelopment : STRINGS.programs.stageDevelopment;
    case 'trials':
      return compact ? STRINGS.programs.stageShortTrials : STRINGS.programs.stageTrials;
    case 'production':
      return compact ? STRINGS.programs.stageShortProduction : STRINGS.programs.stageProduction;
    case 'induction':
      return compact ? STRINGS.programs.stageShortInduction : STRINGS.programs.stageInduction;
    default:
      return stage;
  }
}

export function getStageClassModifier(stage: LifecycleStage): string {
  switch (stage) {
    case 'concept':
      return 'dw-stage--concept';
    case 'sanctioned':
      return 'dw-stage--sanctioned';
    case 'development':
      return 'dw-stage--development';
    case 'trials':
      return 'dw-stage--trials';
    case 'production':
      return 'dw-stage--production';
    case 'induction':
      return 'dw-stage--induction';
    default:
      return '';
  }
}

export function renderProgramStageBar(
  currentStage: LifecycleStage,
  options: ProgramStageBarOptions = {}
): HTMLElement {
  const currentIdx = getStageIndex(currentStage);
  const container = document.createElement('div');
  container.className = `dw-program-stage-bar ${options.compact ? 'dw-program-stage-bar--compact' : ''}`;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', STRINGS.programs.stageBarAriaLabel);

  const track = document.createElement('ol');
  track.className = 'dw-stage-bar-track';
  track.setAttribute('role', 'list');

  LIFECYCLE_STAGES.forEach((stage, idx) => {
    const stepEl = document.createElement('li');
    const isCompleted = idx < currentIdx;
    const isActive = idx === currentIdx;

    let statusModifier = 'dw-stage-step--upcoming';
    let statusText: string = STRINGS.programs.stageUpcoming;
    if (isCompleted) {
      statusModifier = 'dw-stage-step--completed';
      statusText = STRINGS.programs.stageCompleted;
    } else if (isActive) {
      statusModifier = 'dw-stage-step--active';
      statusText = STRINGS.programs.stageActive;
      stepEl.setAttribute('aria-current', 'step');
    }

    stepEl.className = `dw-stage-step ${statusModifier} ${getStageClassModifier(stage)}`;
    const stageLabel = getStageLabel(stage, options.compact);
    stepEl.setAttribute('aria-label', `${stageLabel} (${statusText})`);

    const marker = document.createElement('span');
    marker.className = 'dw-stage-step-marker';
    if (isCompleted) {
      marker.textContent = '✓';
    } else {
      marker.textContent = String(idx + 1);
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'dw-stage-step-label';
    labelEl.textContent = sanitizePlainText(stageLabel);

    stepEl.appendChild(marker);
    stepEl.appendChild(labelEl);

    if (options.interactive && options.onStageClick) {
      stepEl.style.cursor = 'pointer';
      stepEl.tabIndex = 0;
      stepEl.addEventListener('click', () => options.onStageClick!(stage));
      stepEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          options.onStageClick!(stage);
        }
      });
    }

    track.appendChild(stepEl);
  });

  container.appendChild(track);
  return container;
}
