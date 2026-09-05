/**
 * Dossier Permalink Resolution for DefenceWire.in
 * Resolves /program/:id and /supplier/:id deep-links to their detail modal.
 * Distinct from permalinkService.ts (which handles /story/:id): dossier
 * permalinks dynamically import the (lazily-loaded) Programs/Suppliers data
 * and modal components, so a cold visit to a dossier permalink doesn't force
 * every visitor to pay for that weight up front.
 * Hard limit: <= 300 LOC.
 */

import type { ProgramsViewModel } from '../viewmodels/ProgramsViewModel.js';
import type { SuppliersViewModel } from '../viewmodels/SuppliersViewModel.js';

export function resolveProgramPermalink(
  decodedId: string,
  ensureProgramsVm: () => Promise<ProgramsViewModel>,
  ensureSuppliersVm: () => Promise<SuppliersViewModel>
): void {
  Promise.all([
    import('../data/strategicPrograms.js'),
    ensureProgramsVm(),
    ensureSuppliersVm(),
    import('../components/ProgramDetailModal.js')
  ])
    .then(([{ getProgramById, findProgramByAlias }, programsVm, suppliersVm, { openProgramDetailModal }]) => {
      const prog = getProgramById(decodedId) ?? findProgramByAlias(decodedId);
      if (prog) {
        openProgramDetailModal(prog, {
          relatedClusters: programsVm.getProgramRelatedClusters(prog.id),
          getSupplierRelatedClusters: (id) => suppliersVm.getSupplierRelatedClusters(id)
        });
      }
    })
    .catch(() => {
      // Graceful fallback: permalink simply doesn't open a dossier modal
    });
}

export function resolveSupplierPermalink(decodedId: string, ensureSuppliersVm: () => Promise<SuppliersViewModel>): void {
  Promise.all([ensureSuppliersVm(), import('../components/suppliers/SupplierDetailModal.js')])
    .then(([suppliersVm, { openSupplierDetailModal }]) => {
      const supplier = suppliersVm.getCachedSupplier(decodedId);
      if (supplier) {
        openSupplierDetailModal(supplier, {
          relatedClusters: suppliersVm.getSupplierRelatedClusters(supplier.id)
        });
      }
    })
    .catch(() => {
      // Graceful fallback: permalink simply doesn't open a dossier modal
    });
}
