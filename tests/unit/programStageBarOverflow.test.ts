/**
 * Regression test for the program stage bar overflow bug (programs.css).
 * Guards against long stage labels ("Serial Production", "Fleet Induction")
 * forcing flex steps past their intrinsic content width, which overflows the
 * modal's fixed width and gets hard-clipped by .dw-modal-content's
 * `overflow: hidden` — cutting off the tail of the bar (e.g. step 6 entirely).
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../../src/styles/programs.css');

beforeAll(() => {
  const css = readFileSync(CSS_PATH, 'utf-8');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
});

function buildStageBar(): { step: HTMLElement; label: HTMLElement } {
  const track = document.createElement('ol');
  track.className = 'dw-stage-bar-track';

  const step = document.createElement('li');
  step.className = 'dw-stage-step dw-stage-step--upcoming';

  const label = document.createElement('span');
  label.className = 'dw-stage-step-label';
  label.textContent = 'Serial Production';

  step.appendChild(label);
  track.appendChild(step);
  document.body.appendChild(track);

  return { step, label };
}

describe('Program stage bar overflow (.dw-stage-bar-track/.dw-stage-step/.dw-stage-step-label)', () => {
  it('lets flex steps shrink below their label content width instead of overflowing the modal', () => {
    const { step } = buildStageBar();
    const styles = getComputedStyle(step);

    // Flex items default to min-width: auto, which refuses to shrink below the
    // step's content (the nowrap label). Must be explicitly overridden so
    // steps can shrink and long labels wrap instead of blowing out the bar.
    expect(['0px', '0']).toContain(styles.minWidth);
  });

  it('wraps long stage labels instead of forcing single-line nowrap width', () => {
    const { label } = buildStageBar();
    const styles = getComputedStyle(label);

    expect(styles.whiteSpace).not.toBe('nowrap');
  });

  it('breaks a single long word (e.g. "Prototyping") that alone exceeds a narrow-phone column, instead of overflowing it', () => {
    const { label } = buildStageBar();
    const styles = getComputedStyle(label);

    expect(['anywhere', 'break-word']).toContain(styles.overflowWrap);
  });
});
