/**
 * Application Entry Point for DefenceWire.in
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from './resources/strings.js';
import { sanitizePlainText } from './utils/security.js';

export function initializeApp(): void {
  const appElement = document.getElementById('app');
  if (!appElement) {
    return;
  }

  // Set page title from SSOT
  document.title = `${STRINGS.app.name} — ${STRINGS.app.shortTagline}`;

  // Safe initial phase 1 placeholder view
  const header = document.createElement('header');
  header.style.padding = '1rem';
  header.style.borderBottom = '1px solid var(--dw-border-primary)';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const titleEl = document.createElement('h1');
  titleEl.style.fontSize = '1.25rem';
  titleEl.style.fontWeight = '700';
  titleEl.style.color = 'var(--dw-text-accent)';
  titleEl.textContent = sanitizePlainText(STRINGS.app.name);

  const badgeEl = document.createElement('span');
  badgeEl.style.fontSize = '0.75rem';
  badgeEl.style.padding = '0.2rem 0.5rem';
  badgeEl.style.backgroundColor = 'var(--dw-badge-bg)';
  badgeEl.style.color = 'var(--dw-badge-text)';
  badgeEl.style.borderRadius = 'var(--dw-radius-sm)';
  badgeEl.textContent = sanitizePlainText(STRINGS.app.institutionalBadge);

  header.appendChild(titleEl);
  header.appendChild(badgeEl);

  const main = document.createElement('main');
  main.style.padding = '1.5rem 1rem';

  const taglineEl = document.createElement('p');
  taglineEl.style.fontSize = '0.95rem';
  taglineEl.style.color = 'var(--dw-text-secondary)';
  taglineEl.textContent = sanitizePlainText(STRINGS.app.tagline);

  main.appendChild(taglineEl);

  appElement.innerHTML = '';
  appElement.appendChild(header);
  appElement.appendChild(main);
}

// Auto-bootstrap on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
