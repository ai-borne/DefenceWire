/**
 * Zero Trust Institutional Access Modal Component for Editorial Curator Desk
 * Integrates with Cloudflare Zero Trust (Access) SSO & 2FA Email OTP.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import { STRINGS } from '../resources/strings.js';

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
  title.textContent = `🛡️ ${STRINGS.editor.authTitle}`;

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
  body.style.padding = '24px';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '18px';

  const subtitle = document.createElement('p');
  subtitle.className = 'dw-snippet';
  subtitle.style.margin = '0';
  subtitle.style.lineHeight = '1.5';
  subtitle.textContent = STRINGS.editor.authSubtitle;
  body.appendChild(subtitle);

  // Zero Trust Direct Native Anchor Link
  const zeroTrustBtn = document.createElement('a');
  zeroTrustBtn.href = '/api/curator/auth?redirect=1';
  zeroTrustBtn.className = 'dw-editor-btn dw-editor-btn--promote';
  zeroTrustBtn.style.padding = '12px 20px';
  zeroTrustBtn.style.textAlign = 'center';
  zeroTrustBtn.style.fontWeight = '700';
  zeroTrustBtn.style.fontSize = '0.95rem';
  zeroTrustBtn.style.cursor = 'pointer';
  zeroTrustBtn.style.width = '100%';
  zeroTrustBtn.style.display = 'block';
  zeroTrustBtn.style.textDecoration = 'none';
  zeroTrustBtn.style.boxSizing = 'border-box';
  zeroTrustBtn.textContent = `🛡️ ${STRINGS.editor.zeroTrustLoginBtn}`;

  body.appendChild(zeroTrustBtn);
  panel.appendChild(body);
  overlay.appendChild(panel);

  return overlay;
}
