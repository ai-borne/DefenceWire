/**
 * Footer Component for DefenceWire.in
 * Institutional defence network footer, disclaimers, and policy links.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';

interface FooterLink {
  text: string;
  href: string;
}

function createLink(item: FooterLink): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = item.href;
  a.textContent = sanitizePlainText(item.text);
  if (item.href.startsWith('http')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

function renderPolicyLinks(): HTMLElement {
  const linksRow = document.createElement('div');
  linksRow.className = 'dw-footer-links';

  const links: FooterLink[] = [
    { text: STRINGS.footer.editorialPolicy, href: '#editorial' },
    { text: STRINGS.footer.privacyPolicy, href: '#privacy' },
    { text: STRINGS.footer.contact, href: '#contact' }
  ];

  for (const item of links) {
    linksRow.appendChild(createLink(item));
  }

  return linksRow;
}

function renderEcosystemSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'dw-footer-ecosystem';

  const label = document.createElement('p');
  label.className = 'dw-footer-ecosystem-label';
  label.textContent = sanitizePlainText(STRINGS.footer.ecosystemHeading);

  const linksRow = document.createElement('div');
  linksRow.className = 'dw-footer-ecosystem-links';

  const links: FooterLink[] = [
    { text: STRINGS.ecosystem.ssbMaxTitle, href: STRINGS.ecosystem.ssbMaxUrl },
    { text: STRINGS.ecosystem.aiBorneTitle, href: STRINGS.ecosystem.aiBorneUrl }
  ];

  for (const item of links) {
    linksRow.appendChild(createLink(item));
  }

  section.appendChild(label);
  section.appendChild(linksRow);
  return section;
}

export function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'dw-footer';

  const inner = document.createElement('div');
  inner.className = 'dw-footer-inner';

  const copyright = document.createElement('p');
  copyright.className = 'dw-footer-copyright';
  copyright.textContent = sanitizePlainText(STRINGS.footer.copyright);

  const disclaimer = document.createElement('p');
  disclaimer.className = 'dw-footer-disclaimer';
  disclaimer.textContent = sanitizePlainText(STRINGS.footer.disclaimer);

  inner.appendChild(copyright);
  inner.appendChild(disclaimer);
  inner.appendChild(renderPolicyLinks());
  inner.appendChild(renderEcosystemSection());
  footer.appendChild(inner);

  return footer;
}
