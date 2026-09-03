/**
 * Regression test for shared modal shell positioning (dossier.css).
 * Guards against the modal's top edge shifting per-tab based on content height,
 * which happened when the backdrop vertically centered the modal via
 * `align-items: center` instead of anchoring it to a fixed top offset.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../../src/styles/dossier.css');

beforeAll(() => {
  const css = readFileSync(CSS_PATH, 'utf-8');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
});

function buildModalShell(): { backdrop: HTMLElement; content: HTMLElement; body: HTMLElement } {
  const backdrop = document.createElement('div');
  backdrop.className = 'dw-modal-backdrop';

  const content = document.createElement('div');
  content.className = 'dw-modal-content';

  const body = document.createElement('div');
  body.className = 'dw-modal-body';

  content.appendChild(body);
  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  return { backdrop, content, body };
}

describe('Shared modal shell positioning (.dw-modal-backdrop/.dw-modal-content/.dw-modal-body)', () => {
  it('anchors the modal to the top of the viewport instead of vertically centering it', () => {
    const { backdrop } = buildModalShell();
    const styles = getComputedStyle(backdrop);

    // align-items: center would re-position the modal's top edge based on its
    // own height, which shifts as tab content grows/shrinks. Must stay top-anchored.
    expect(styles.alignItems).not.toBe('center');
    expect(styles.alignItems).toBe('flex-start');
  });

  it('lets the backdrop scroll as a fallback when a modal exceeds the viewport', () => {
    const { backdrop } = buildModalShell();
    const styles = getComputedStyle(backdrop);
    expect(styles.overflowY).toBe('auto');
  });

  it('caps modal height and gives it a fixed top offset so tab switches cannot move it', () => {
    const { content } = buildModalShell();
    const styles = getComputedStyle(content);

    expect(styles.maxHeight).not.toBe('');
    expect(styles.maxHeight).not.toBe('none');
    expect(styles.marginTop).not.toBe('0px');
    expect(styles.flexShrink).toBe('0');
  });

  it('scrolls tall tab content inside the body instead of growing the modal', () => {
    const { body } = buildModalShell();
    const styles = getComputedStyle(body);
    expect(styles.overflowY).toBe('auto');
  });
});
