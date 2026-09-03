/**
 * Featured Supplier<->Program Link Callout (Phase 2.4)
 * Editorial "Did you know?" cross-link into one verified supplier dossier,
 * rendered first in the Ecosystem Explorer above the coverage strip.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SuppliersViewModel } from '../../viewmodels/SuppliersViewModel.js';
import { SupplierProfile } from '../../types/suppliers.js';

export interface FeaturedLinkOptions {
  onSelect: (supplier: SupplierProfile) => void;
}

export function renderFeaturedSupplierLinkView(
  suppliersVm: SuppliersViewModel,
  options: FeaturedLinkOptions
): HTMLElement | null {
  const featured = STRINGS.suppliers.featuredLinks[0];
  if (!featured) return null;

  const supplier = suppliersVm.getCachedSupplier(featured.supplierSlug);
  if (!supplier) return null;

  const callout = document.createElement('button');
  callout.type = 'button';
  callout.className = 'dw-supplier-featured-link';

  const prefix = document.createElement('span');
  prefix.className = 'dw-supplier-featured-prefix';
  prefix.textContent = STRINGS.suppliers.featuredLinkPrefix;
  callout.appendChild(prefix);

  const text = document.createElement('span');
  text.className = 'dw-supplier-featured-text';
  text.textContent = sanitizePlainText(featured.calloutText);
  callout.appendChild(text);

  callout.setAttribute('aria-label', `${STRINGS.suppliers.cardAriaLabel} ${supplier.name}`);
  callout.addEventListener('click', () => options.onSelect(supplier));

  return callout;
}
