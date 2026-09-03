/**
 * Supplier Dossier — Linked Strategic Programs & Manufactured Subsystems Tab
 * (Phase 2.4). Every seeded supplier has >=1 verified link per the Phase 2.2
 * inclusion gate (see tests/unit/supplierContracts.test.ts) — an empty panel
 * here indicates a data integrity bug, not a valid supplier state.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';
import { getProgramById } from '../../data/strategicPrograms.js';

export function renderSupplierLinkedProgramsView(supplier: SupplierProfile): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  if (supplier.linkedPrograms.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dw-snippet dw-supplier-links-empty';
    empty.textContent = STRINGS.suppliers.linkedProgramsEmpty;
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'dw-supplier-linked-list';

  supplier.linkedPrograms.forEach((link) => {
    const program = getProgramById(link.programId);
    const card = document.createElement('div');
    card.className = 'dw-supplier-linked-card';

    const title = document.createElement('div');
    title.className = 'dw-supplier-linked-program-name';
    title.textContent = sanitizePlainText(program?.name ?? link.programId);
    card.appendChild(title);

    const subsystem = document.createElement('div');
    subsystem.className = 'dw-supplier-linked-subsystem';
    subsystem.textContent = `${STRINGS.suppliers.linkedProgramsSubsystemPrefix} ${sanitizePlainText(link.subsystemName)}`;
    card.appendChild(subsystem);

    list.appendChild(card);
  });

  panel.appendChild(list);
  return panel;
}
