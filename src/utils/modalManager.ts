/**
 * Modal Shell Controller & Reference-Counted Stack Manager for DefenceWire.in
 * Manages modal lifecycle, iOS touch-safe body scroll locking, focus trapping,
 * and keyboard dismissal across nested modals. Hard limit: <= 150 LOC.
 */

export interface ModalOptions {
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  initialFocus?: HTMLElement | string | null;
}

interface ModalRecord {
  element: HTMLElement;
  options: ModalOptions;
  previousActiveElement: HTMLElement | null;
}

let activeModalStack: ModalRecord[] = [];
let savedScrollY = 0, isBodyLocked = false, keydownListenerAttached = false;

function lockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.width = '100%';
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  isBodyLocked = true;
}

function unlockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  try {
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (!isJsdom && typeof window.scrollTo === 'function') window.scrollTo(0, savedScrollY);
  } catch { /* environments without full scrollTo support */ }
  isBodyLocked = false;
}

function cleanDisconnectedModals(): void {
  if (typeof document === 'undefined') return;
  for (let i = activeModalStack.length - 1; i >= 0; i--) {
    const item = activeModalStack[i];
    if (item && !document.body.contains(item.element)) activeModalStack.splice(i, 1);
  }
  if (activeModalStack.length === 0 && isBodyLocked) unlockBodyScroll();
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  cleanDisconnectedModals();
  if (activeModalStack.length === 0) return;
  const top = activeModalStack[activeModalStack.length - 1];
  if (!top) return;

  if (e.key === 'Escape' && top.options.closeOnEscape !== false) {
    e.preventDefault();
    e.stopPropagation();
    closeModal(top.element);
    return;
  }
  if (e.key === 'Tab' && top.options.trapFocus !== false) {
    const focusables = Array.from(
      top.element.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first && last) {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

export function openModal(modalBackdrop: HTMLElement, options: ModalOptions = {}): () => void {
  cleanDisconnectedModals();
  if (activeModalStack.some((m) => m.element === modalBackdrop)) return () => closeModal(modalBackdrop);
  const prevActive = (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) ? document.activeElement : null;
  if (activeModalStack.length === 0 && !isBodyLocked) lockBodyScroll();
  if (typeof document !== 'undefined' && !document.body.contains(modalBackdrop) && !modalBackdrop.parentElement) {
    document.body.appendChild(modalBackdrop);
  }
  activeModalStack.push({ element: modalBackdrop, options, previousActiveElement: prevActive });
  if (!keydownListenerAttached) {
    if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeydown);
    if (typeof document !== 'undefined') document.addEventListener('keydown', handleKeydown);
    keydownListenerAttached = true;
  }
  if (options.closeOnBackdrop !== false) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal(modalBackdrop);
    });
  }
  const focusTarget = options.initialFocus instanceof HTMLElement
    ? options.initialFocus
    : typeof options.initialFocus === 'string'
      ? modalBackdrop.querySelector<HTMLElement>(options.initialFocus)
      : modalBackdrop.querySelector<HTMLElement>('.dw-modal-close-btn, button, input, [tabindex]:not([tabindex="-1"])');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus(); } catch { /* ignore */ }
  }
  return () => closeModal(modalBackdrop);
}

export function closeModal(modalBackdrop?: HTMLElement): void {
  cleanDisconnectedModals();
  if (activeModalStack.length === 0) return;
  const targetIdx = modalBackdrop ? activeModalStack.findIndex((m) => m.element === modalBackdrop) : activeModalStack.length - 1;
  if (targetIdx === -1) return;

  const record = activeModalStack.splice(targetIdx, 1)[0];
  if (!record) return;
  const el = record.element;
  el.classList.add('dw-modal-closing');
  setTimeout(() => {
    el.remove();
    record.options.onClose?.();
    if (record.previousActiveElement && typeof record.previousActiveElement.focus === 'function') {
      try { record.previousActiveElement.focus(); } catch { /* ignore */ }
    }
  }, 150);

  if (activeModalStack.length === 0) {
    unlockBodyScroll();
    if (keydownListenerAttached) {
      if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown);
      if (typeof document !== 'undefined') document.removeEventListener('keydown', handleKeydown);
      keydownListenerAttached = false;
    }
  }
}

export function getActiveModalStack(): HTMLElement[] { cleanDisconnectedModals(); return activeModalStack.map((m) => m.element); }
export function getOpenModalCount(): number { cleanDisconnectedModals(); return activeModalStack.length; }
export function isModalOpen(element?: HTMLElement): boolean { cleanDisconnectedModals(); return element ? activeModalStack.some((m) => m.element === element) : activeModalStack.length > 0; }
export function resetModalStack(): void {
  activeModalStack = [];
  unlockBodyScroll();
  if (keydownListenerAttached) {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown);
    if (typeof document !== 'undefined') document.removeEventListener('keydown', handleKeydown);
    keydownListenerAttached = false;
  }
}
