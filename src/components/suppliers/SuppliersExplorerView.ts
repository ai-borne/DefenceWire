/**
 * Verified Indian Defence Ecosystem Explorer (Phase 2.4)
 * Composes, in DOM order: featured supplier<->program callout, coverage
 * strip, filter/search/sort controls, and the responsive supplier card
 * grid. Mirrors ProgramsExplorerView's decomposition pattern.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { SuppliersViewModel } from '../../viewmodels/SuppliersViewModel.js';
import { renderFeaturedSupplierLinkView } from './FeaturedSupplierLinkView.js';
import { renderSupplierCoverageStripView } from './SupplierCoverageStripView.js';
import { renderSupplierFilterPillsView } from './SupplierFilterPillsView.js';
import { renderSupplierCardGridView } from './SupplierCardGridView.js';
import { openSupplierDetailModal } from './SupplierDetailModal.js';

export function renderSuppliersExplorerView(suppliersVm: SuppliersViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-suppliers-explorer';

  // 1. Header
  const headerBlock = document.createElement('div');
  headerBlock.className = 'dw-suppliers-header-block';
  const heading = document.createElement('h2');
  heading.className = 'dw-headline--lead';
  heading.textContent = `🏭 ${STRINGS.suppliers.heading}`;
  headerBlock.appendChild(heading);
  const sub = document.createElement('p');
  sub.className = 'dw-snippet';
  sub.textContent = STRINGS.suppliers.subheading;
  headerBlock.appendChild(sub);
  container.appendChild(headerBlock);

  const onSelect = (supplier: Parameters<typeof openSupplierDetailModal>[0]) => {
    suppliersVm.setSelectedSupplier(supplier);
    if (typeof window !== 'undefined') {
      window.location.hash = `#supplier/${encodeURIComponent(supplier.slug)}`;
    }
    openSupplierDetailModal(supplier, {
      relatedClusters: suppliersVm.getSupplierRelatedClusters(supplier.id)
    });
  };

  // 2. Featured Link (FIRST — above coverage strip)
  const featured = renderFeaturedSupplierLinkView(suppliersVm, { onSelect });
  if (featured) container.appendChild(featured);

  // 3. Coverage Strip (SECOND — before any card list)
  container.appendChild(renderSupplierCoverageStripView());

  // 4. Filter pills, search & sort (secondary controls)
  container.appendChild(renderSupplierFilterPillsView(suppliersVm));

  // 5. Card Grid (THIRD/last)
  container.appendChild(renderSupplierCardGridView(suppliersVm, { onSelect }));

  return container;
}
