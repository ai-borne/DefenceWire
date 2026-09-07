/**
 * Interactive Timeline Playback Scrubber (Phase 3)
 * Allows dragging through historical time horizons and watching nodes connect.
 * Hard limit: <= 300 LOC.
 */

import graphStrings from '../../resources/graphStrings.js';
import { KnowledgeGraphViewModel } from '../../viewmodels/KnowledgeGraphViewModel.js';

export function renderTimeScrubber(vm: KnowledgeGraphViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-graph-scrubber';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', graphStrings.timeScrubberTitle);

  // 1. Play / Pause Control
  const playBtn = document.createElement('button');
  playBtn.className = 'dw-graph-scrubber-btn dw-graph-scrubber-play';
  playBtn.setAttribute('type', 'button');
  playBtn.setAttribute('aria-label', graphStrings.timeScrubberPlay);
  playBtn.textContent = '▶';

  // 2. Step Backward
  const stepBackBtn = document.createElement('button');
  stepBackBtn.className = 'dw-graph-scrubber-btn';
  stepBackBtn.setAttribute('type', 'button');
  stepBackBtn.setAttribute('aria-label', 'Step backward 7 days');
  stepBackBtn.textContent = '⏮';

  // 3. Step Forward
  const stepFwdBtn = document.createElement('button');
  stepFwdBtn.className = 'dw-graph-scrubber-btn';
  stepFwdBtn.setAttribute('type', 'button');
  stepFwdBtn.setAttribute('aria-label', 'Step forward 7 days');
  stepFwdBtn.textContent = '⏭';

  // 4. Current Date Display
  const dateDisplay = document.createElement('div');
  dateDisplay.className = 'dw-graph-scrubber-date';

  // 5. Slider Input
  const slider = document.createElement('input');
  slider.className = 'dw-graph-scrubber-slider';
  slider.type = 'range';
  slider.setAttribute('aria-label', graphStrings.timeScrubberCurrentDate);

  // 6. Bound labels
  const minLabel = document.createElement('span');
  minLabel.className = 'dw-graph-scrubber-bound';

  const maxLabel = document.createElement('span');
  maxLabel.className = 'dw-graph-scrubber-bound';

  // 7. Counter pill
  const counterPill = document.createElement('span');
  counterPill.className = 'dw-graph-scrubber-counter';

  const updateUI = () => {
    const minTs = new Date(vm.getMinDate()).getTime();
    const maxTs = new Date(vm.getMaxDate()).getTime();
    const currTs = new Date(vm.getCurrentDate()).getTime();

    slider.min = String(minTs);
    slider.max = String(Math.max(maxTs, minTs + 1));
    slider.value = String(Math.min(Math.max(currTs, minTs), maxTs));

    const isPlaying = vm.getIsPlaying();
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    playBtn.setAttribute(
      'aria-label',
      isPlaying ? graphStrings.timeScrubberPause : graphStrings.timeScrubberPlay
    );

    const currDateStr = vm.getCurrentDate().slice(0, 10);
    dateDisplay.textContent = `📅 ${currDateStr}`;

    minLabel.textContent = vm.getMinDate().slice(0, 10);
    maxLabel.textContent = vm.getMaxDate().slice(0, 10);

    const filtered = vm.getFilteredData();
    counterPill.textContent = `${filtered.edges.length} ${graphStrings.edgesCountLabel}`;
  };

  playBtn.addEventListener('click', () => {
    vm.togglePlay();
  });

  stepBackBtn.addEventListener('click', () => {
    vm.stepForward(-7);
  });

  stepFwdBtn.addEventListener('click', () => {
    vm.stepForward(7);
  });

  slider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const ts = Number(target.value);
    if (!isNaN(ts)) {
      vm.setCurrentDate(new Date(ts).toISOString());
    }
  });

  // Assemble Layout
  const controlsGroup = document.createElement('div');
  controlsGroup.className = 'dw-graph-scrubber-controls';
  controlsGroup.appendChild(stepBackBtn);
  controlsGroup.appendChild(playBtn);
  controlsGroup.appendChild(stepFwdBtn);
  controlsGroup.appendChild(dateDisplay);

  const sliderGroup = document.createElement('div');
  sliderGroup.className = 'dw-graph-scrubber-track';
  sliderGroup.appendChild(minLabel);
  sliderGroup.appendChild(slider);
  sliderGroup.appendChild(maxLabel);
  sliderGroup.appendChild(counterPill);

  container.appendChild(controlsGroup);
  container.appendChild(sliderGroup);

  const unsubscribe = vm.subscribe(updateUI);
  updateUI();

  // Attach cleanup hook to element
  (container as HTMLElement & { __cleanup?: () => void }).__cleanup = unsubscribe;

  return container;
}
