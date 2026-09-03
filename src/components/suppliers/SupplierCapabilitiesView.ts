/**
 * Supplier Dossier — Capabilities & Certifications Tab (Phase 2.4)
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';

export function renderSupplierCapabilitiesView(supplier: SupplierProfile): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  if (supplier.capabilities.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dw-snippet';
    empty.textContent = STRINGS.suppliers.capabilitiesEmpty;
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'dw-supplier-capabilities-list';

  supplier.capabilities.forEach((cap) => {
    const card = document.createElement('div');
    card.className = 'dw-supplier-capability-card';

    const domain = document.createElement('div');
    domain.className = 'dw-supplier-capability-domain';
    domain.textContent = sanitizePlainText(cap.capabilityDomain);
    card.appendChild(domain);

    const certLabel = document.createElement('div');
    certLabel.className = 'dw-supplier-cert-label';
    certLabel.textContent = STRINGS.suppliers.capabilitiesCertificationsLabel;
    card.appendChild(certLabel);

    if (cap.certifications.length === 0) {
      const noCerts = document.createElement('div');
      noCerts.className = 'dw-supplier-cert-empty';
      noCerts.textContent = STRINGS.suppliers.capabilitiesNoCerts;
      card.appendChild(noCerts);
    } else {
      const certRow = document.createElement('div');
      certRow.className = 'dw-supplier-cert-row';
      cap.certifications.forEach((cert) => {
        const badge = document.createElement('span');
        badge.className = 'dw-supplier-cert-badge';
        badge.textContent = cert;
        certRow.appendChild(badge);
      });
      card.appendChild(certRow);
    }

    list.appendChild(card);
  });

  panel.appendChild(list);
  return panel;
}
