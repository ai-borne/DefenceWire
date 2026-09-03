/**
 * Supplier Dossier Handler
 * Pure, edge-agnostic handler for a single supplier's full profile — capabilities
 * and linked strategic programs. Wire-mention cross-linking is deferred to Phase 2.4.
 * Hard limit: <= 300 LOC.
 */

import type {
  SupplierTier,
  CapabilityDomain,
  DefenceCorridor,
  DefenceCertification,
  IndigenisationStatus
} from '../types/suppliers.js';
import type { SupplierDbRow } from './supplierDirectoryHandler.js';

export interface SupplierCapabilityDbRow {
  supplier_id: string;
  capability_domain: string;
  certifications: string;
}

export interface ProgramSupplierLinkDbRow {
  program_id: string;
  subsystem_name: string;
  supplier_id: string;
  tier: string;
  indigenisation_status: string;
}

export interface SupplierDossierResponse {
  supplier:
    | {
        id: string;
        slug: string;
        name: string;
        tier: SupplierTier;
        hqCity: string;
        hqState: string;
        corridor?: DefenceCorridor;
        website?: string;
        description: string;
        srijanId?: string;
        idexWinner: boolean;
        isListed: boolean;
        stockSymbol?: string;
        capabilities: { capabilityDomain: CapabilityDomain; certifications: DefenceCertification[] }[];
        linkedPrograms: {
          programId: string;
          subsystemName: string;
          tier: SupplierTier;
          indigenisationStatus: IndigenisationStatus;
        }[];
      }
    | null;
  error?: string;
}

export interface SupplierDossierDatabaseAdapter {
  querySupplier: (slug: string) => Promise<SupplierDbRow | null>;
  queryCapabilities: (supplierId: string) => Promise<SupplierCapabilityDbRow[]>;
  queryLinkedPrograms: (supplierId: string) => Promise<ProgramSupplierLinkDbRow[]>;
}

export async function handleSupplierDossierRequest(
  slug: string,
  db: SupplierDossierDatabaseAdapter
): Promise<SupplierDossierResponse> {
  const cleanSlug = (slug || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 80)
    .trim()
    .toLowerCase();

  if (!cleanSlug) {
    return { supplier: null, error: 'Supplier slug is required.' };
  }

  try {
    const row = await db.querySupplier(cleanSlug);
    if (!row) {
      return { supplier: null, error: 'Supplier not found.' };
    }

    const [capabilityRows, linkRows] = await Promise.all([
      db.queryCapabilities(row.id),
      db.queryLinkedPrograms(row.id)
    ]);

    const capabilities = capabilityRows.map((cap) => {
      let certifications: DefenceCertification[] = [];
      try {
        const parsed = JSON.parse(cap.certifications);
        if (Array.isArray(parsed)) certifications = parsed;
      } catch {
        certifications = [];
      }
      return {
        capabilityDomain: cap.capability_domain as CapabilityDomain,
        certifications
      };
    });

    const linkedPrograms = linkRows.map((link) => ({
      programId: link.program_id,
      subsystemName: link.subsystem_name,
      tier: link.tier as SupplierTier,
      indigenisationStatus: link.indigenisation_status as IndigenisationStatus
    }));

    return {
      supplier: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        tier: row.tier as SupplierTier,
        hqCity: row.hq_city,
        hqState: row.hq_state,
        corridor: row.corridor ? (row.corridor as DefenceCorridor) : undefined,
        website: row.website ?? undefined,
        description: row.description,
        srijanId: row.srijan_id ?? undefined,
        idexWinner: Boolean(row.idex_winner),
        isListed: Boolean(row.is_listed),
        stockSymbol: row.stock_symbol ?? undefined,
        capabilities,
        linkedPrograms
      }
    };
  } catch (err) {
    return {
      supplier: null,
      error: err instanceof Error ? err.message : 'Internal database error.'
    };
  }
}
