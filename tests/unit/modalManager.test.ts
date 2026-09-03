/**
 * Unit Tests for Modal Manager & Reference-Counted Stack
 * Verifies iOS scroll locking, nested modal lifecycle, focus trapping, and keyboard controls.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openModal,
  closeModal,
  getOpenModalCount,
  getActiveModalStack,
  isModalOpen,
  resetModalStack
} from '../../src/utils/modalManager.js';

describe('Unit: ModalManager Reference-Counted Stack', () => {
  beforeEach(() => {
    resetModalStack();
    document.body.innerHTML = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    resetModalStack();
  });

  it('locks body scroll on first modal and unlocks on final close', () => {
    const modal1 = document.createElement('div');
    modal1.id = 'modal-1';

    expect(getOpenModalCount()).toBe(0);
    expect(document.body.style.position).toBe('');

    openModal(modal1);
    expect(getOpenModalCount()).toBe(1);
    expect(isModalOpen(modal1)).toBe(true);
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');

    closeModal(modal1);
    expect(getOpenModalCount()).toBe(0);
    expect(document.body.style.position).toBe('');
  });

  it('preserves body lock across nested modals (Program -> Supplier)', () => {
    const programModal = document.createElement('div');
    programModal.id = 'program-modal';

    const supplierModal = document.createElement('div');
    supplierModal.id = 'supplier-modal';

    // 1. Open root modal
    openModal(programModal);
    expect(getOpenModalCount()).toBe(1);
    expect(document.body.style.position).toBe('fixed');

    // 2. Open nested modal
    openModal(supplierModal);
    expect(getOpenModalCount()).toBe(2);
    expect(document.body.style.position).toBe('fixed');
    expect(getActiveModalStack()).toEqual([programModal, supplierModal]);

    // 3. Close nested modal -> body must remain locked
    closeModal(supplierModal);
    expect(getOpenModalCount()).toBe(1);
    expect(document.body.style.position).toBe('fixed');
    expect(isModalOpen(programModal)).toBe(true);
    expect(isModalOpen(supplierModal)).toBe(false);

    // 4. Close root modal -> body unlocks
    closeModal(programModal);
    expect(getOpenModalCount()).toBe(0);
    expect(document.body.style.position).toBe('');
  });

  it('dismisses only top modal on Escape key', () => {
    const modalA = document.createElement('div');
    const modalB = document.createElement('div');

    openModal(modalA);
    openModal(modalB);
    expect(getOpenModalCount()).toBe(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(getOpenModalCount()).toBe(1);
    expect(isModalOpen(modalA)).toBe(true);
    expect(isModalOpen(modalB)).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(getOpenModalCount()).toBe(0);
    expect(isModalOpen(modalA)).toBe(false);
  });

  it('dismisses modal on backdrop click if enabled', () => {
    const backdrop = document.createElement('div');
    const content = document.createElement('div');
    backdrop.appendChild(content);

    openModal(backdrop, { closeOnBackdrop: true });
    expect(getOpenModalCount()).toBe(1);

    // Clicking content does not close
    content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getOpenModalCount()).toBe(1);

    // Clicking backdrop closes
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getOpenModalCount()).toBe(0);
    expect(backdrop.classList.contains('dw-modal-closing')).toBe(true);
  });

  it('traps Tab and Shift-Tab focus within the active modal', () => {
    const modal = document.createElement('div');
    const btn1 = document.createElement('button');
    btn1.id = 'btn-1';
    const btn2 = document.createElement('button');
    btn2.id = 'btn-2';
    modal.appendChild(btn1);
    modal.appendChild(btn2);

    openModal(modal, { trapFocus: true });
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Tab on last element cycles to first element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(btn1);

    // Shift-Tab on first element cycles to last element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(btn2);
  });

  it('cleans up disconnected modals if removed directly from DOM', () => {
    const modal = document.createElement('div');
    openModal(modal);
    expect(getOpenModalCount()).toBe(1);
    expect(document.body.style.position).toBe('fixed');

    modal.remove(); // Removed directly without closeModal
    expect(getOpenModalCount()).toBe(0);
    expect(document.body.style.position).toBe('');
  });

  it('calls onClose callback and cleans up DOM after closing animation', () => {
    vi.useFakeTimers();
    const modal = document.createElement('div');
    const onCloseSpy = vi.fn();

    openModal(modal, { onClose: onCloseSpy });
    expect(document.body.contains(modal)).toBe(true);

    closeModal(modal);
    expect(modal.classList.contains('dw-modal-closing')).toBe(true);
    expect(onCloseSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(160);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(document.body.contains(modal)).toBe(false);
    vi.useRealTimers();
  });
});
