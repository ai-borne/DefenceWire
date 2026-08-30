/**
 * Footer Component for DefenceWire.in
 * Institutional defence network footer, disclaimers, and policy links.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';

export function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'dw-footer';

  const inner = document.createElement('div');
  inner.className = 'dw-footer-inner';

  const copyright = document.createElement('p');
  copyright.style.fontWeight = '600';
  copyright.textContent = sanitizePlainText(STRINGS.footer.copyright);

  const disclaimer = document.createElement('p');
  disclaimer.style.fontSize = '0.74rem';
  disclaimer.style.color = 'var(--dw-text-muted)';
  disclaimer.textContent = sanitizePlainText(STRINGS.footer.disclaimer);

  const linksRow = document.createElement('div');
  linksRow.className = 'dw-footer-links';

  const links = [
    { text: STRINGS.footer.editorialPolicy, href: '#editorial' },
    { text: STRINGS.footer.privacyPolicy, href: '#privacy' },
    { text: STRINGS.footer.contact, href: '#contact' },
    { text: STRINGS.ecosystem.ssbMaxTitle, href: 'https://ssbmax.ai' },
    { text: STRINGS.ecosystem.aiBorneTitle, href: 'https://ai-borne.in' }
  ];

  for (const item of links) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = sanitizePlainText(item.text);
    if (item.href.startsWith('http')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    linksRow.appendChild(a);
  }

  inner.appendChild(copyright);
  inner.appendChild(disclaimer);
  inner.appendChild(linksRow);
  footer.appendChild(inner);

  return footer;
}
