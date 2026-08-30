/**
 * Tactical Passcode Unlock Modal Component for Editorial Curator Desk
 * Protects curator desk with SHA-256 cryptographic passcode verification.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';

export function renderEditorAuthModal(editorVm: EditorViewModel): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'dw-editor-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', STRINGS.editor.authTitle);

  const panel = document.createElement('div');
  panel.className = 'dw-editor-panel dw-editor-auth-panel';
  panel.style.maxWidth = '440px';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dw-editor-header';

  const title = document.createElement('h2');
  title.className = 'dw-editor-title';
  title.textContent = `🔒 ${STRINGS.editor.authTitle}`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dw-editor-close';
  closeBtn.setAttribute('aria-label', STRINGS.editor.closeDashboard);
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => editorVm.setOpen(false);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // 2. Auth Form Body
  const body = document.createElement('div');
  body.className = 'dw-editor-auth-body';
  body.style.padding = '20px 24px';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '14px';

  const subtitle = document.createElement('p');
  subtitle.className = 'dw-snippet';
  subtitle.style.margin = '0';
  subtitle.textContent = STRINGS.editor.authSubtitle;
  body.appendChild(subtitle);

  const errorBox = document.createElement('div');
  errorBox.className = 'dw-editor-auth-error';
  errorBox.style.display = 'none';
  errorBox.style.color = 'var(--dw-text-accent)';
  errorBox.style.fontSize = '0.82rem';
  errorBox.style.fontWeight = '600';
  body.appendChild(errorBox);

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'dw-editor-input';
  input.placeholder = STRINGS.editor.passcodePlaceholder;
  input.setAttribute('aria-label', STRINGS.editor.passcodePlaceholder);
  input.autocomplete = 'current-password';
  body.appendChild(input);

  const rememberRow = document.createElement('label');
  rememberRow.style.display = 'flex';
  rememberRow.style.alignItems = 'center';
  rememberRow.style.gap = '8px';
  rememberRow.style.fontSize = '0.78rem';
  rememberRow.style.color = 'var(--dw-text-secondary)';
  rememberRow.style.cursor = 'pointer';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = STRINGS.editor.rememberSession;

  rememberRow.appendChild(checkbox);
  rememberRow.appendChild(labelSpan);
  body.appendChild(rememberRow);

  const unlockBtn = document.createElement('button');
  unlockBtn.type = 'button';
  unlockBtn.className = 'dw-editor-btn dw-editor-btn--promote';
  unlockBtn.style.padding = '8px 16px';
  unlockBtn.style.fontWeight = '700';
  unlockBtn.textContent = `⚡ ${STRINGS.editor.unlockButton}`;

  const handleUnlock = async () => {
    const passcode = input.value.trim();
    if (!passcode) return;

    errorBox.style.display = 'none';
    unlockBtn.disabled = true;

    const success = await editorVm.login(passcode, checkbox.checked);
    unlockBtn.disabled = false;

    if (!success) {
      errorBox.textContent = sanitizePlainText(STRINGS.editor.invalidPasscode);
      errorBox.style.display = 'block';
      input.value = '';
      input.focus();
    }
  };

  unlockBtn.onclick = handleUnlock;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUnlock();
    }
  };

  body.appendChild(unlockBtn);
  panel.appendChild(body);
  overlay.appendChild(panel);

  // Auto-focus input
  setTimeout(() => input.focus(), 50);

  return overlay;
}
