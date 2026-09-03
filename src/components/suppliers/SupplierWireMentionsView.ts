/**
 * Supplier Dossier — Live Wire News Mentions Tab (Phase 2.4)
 * No supplier<->news auto-linking engine exists yet (unlike
 * engine/programMatcher.ts for strategic programs) — that cross-linking is
 * out of scope for this phase, so this tab renders the empty-state pattern
 * already used for programs with no corroborated wire updates
 * (see ProgramDetailModal.ts's dw-dossier-no-stories block) rather than
 * fabricating a data source.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { SupplierProfile } from '../../types/suppliers.js';

export function renderSupplierWireMentionsView(_supplier: SupplierProfile): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  const empty = document.createElement('div');
  empty.className = 'dw-dossier-no-stories';
  empty.innerHTML = `📡 <strong>${STRINGS.suppliers.tabWireMentions}:</strong> ${STRINGS.suppliers.wireMentionsEmpty}`;
  panel.appendChild(empty);

  return panel;
}
