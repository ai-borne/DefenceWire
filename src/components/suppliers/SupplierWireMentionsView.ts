/**
 * Supplier Dossier — Live Wire News Mentions Tab (Phase 2.4, wired Phase 2.7)
 * Renders live feed clusters matched by engine/supplierMatcher.ts (name or a
 * known alias mentioned in the headline/snippet/entities), mirroring
 * ProgramDetailModal.ts's "Corroborated Wire Updates" list. Falls back to the
 * Phase 2.4 empty-state when nothing currently in the live feed mentions
 * this supplier.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../../utils/security.js';
import { formatTimeAgo } from '../../utils/dateUtils.js';
import { SupplierProfile } from '../../types/suppliers.js';
import { StoryCluster } from '../../types/news.js';

export function renderSupplierWireMentionsView(
  _supplier: SupplierProfile,
  relatedClusters: StoryCluster[] = []
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  if (relatedClusters.length > 0) {
    const wireList = document.createElement('ul');
    wireList.className = 'dw-dossier-story-list';
    relatedClusters.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'dw-dossier-story-item';
      const safe = getSafeLinkAttributes(s.primarySource.url);
      li.innerHTML = `<a href="${safe.href}" target="${safe.target}" rel="${safe.rel}">${sanitizePlainText(s.synthesizedHeadline)}</a><div class="dw-river-meta">${sanitizePlainText(s.primarySource.sourceName)} • ${formatTimeAgo(s.primarySource.publishedAt)}</div>`;
      wireList.appendChild(li);
    });
    panel.appendChild(wireList);
  } else {
    const empty = document.createElement('div');
    empty.className = 'dw-dossier-no-stories';
    empty.innerHTML = `📡 <strong>${STRINGS.suppliers.tabWireMentions}:</strong> ${STRINGS.suppliers.wireMentionsEmpty}`;
    panel.appendChild(empty);
  }

  return panel;
}
