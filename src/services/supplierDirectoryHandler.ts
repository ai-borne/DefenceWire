/**
 * Supplier Directory Handler
 * Pure, edge-agnostic handler for the filterable, paginated supplier directory list.
 * Hard limit: <= 300 LOC.
 */

import { escapeSqlLikePattern } from './entityDossierHandler.js';
import type { SupplierProfile, SupplierTier, CapabilityDomain, DefenceCorridor } from '../types/suppliers.js';

export interface SupplierDbRow {
  id: string;
  slug: string;
  name: string;
  tier: string;
  hq_city: string;
  hq_state: string;
  corridor: string | null;
  website: string | null;
  description: string;
  srijan_id: string | null;
  idex_winner: number;
  is_listed: number;
  stock_symbol: string | null;
}

export interface SupplierListItem {
  id: string;
  slug: string;
  name: string;
  tier: SupplierTier;
  hqCity: string;
  hqState: string;
  corridor?: DefenceCorridor;
  website?: string;
  description: string;
  idexWinner: boolean;
  isListed: boolean;
  stockSymbol?: string;
}

export interface SupplierDirectoryQuery {
  tier?: string;
  capabilityDomain?: string;
  corridor?: string;
  query?: string;
  cursor?: string;
  limit?: number;
}

export interface SupplierDirectoryResponse {
  suppliers: SupplierListItem[];
  nextCursor: string | null;
  error?: string;
}

export interface SupplierDirectoryDatabaseAdapter {
  querySuppliers: (params: {
    tier?: SupplierTier;
    capabilityDomain?: CapabilityDomain;
    corridor?: DefenceCorridor;
    likePattern?: string;
    cursor?: string;
    limit: number;
  }) => Promise<SupplierDbRow[]>;
}

const VALID_TIERS: SupplierTier[] = ['dpsu', 'private_prime', 'tier2_msme', 'deep_tech_startup'];
const VALID_CORRIDORS: DefenceCorridor[] = ['Tamil Nadu', 'Uttar Pradesh', 'Bengaluru', 'Hyderabad', 'Pune'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toRowDto(row: SupplierDbRow): SupplierListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tier: row.tier as SupplierTier,
    hqCity: row.hq_city,
    hqState: row.hq_state,
    corridor: row.corridor ? (row.corridor as DefenceCorridor) : undefined,
    website: row.website ?? undefined,
    description: row.description,
    idexWinner: Boolean(row.idex_winner),
    isListed: Boolean(row.is_listed),
    stockSymbol: row.stock_symbol ?? undefined
  };
}

export async function handleSupplierDirectoryRequest(
  params: SupplierDirectoryQuery,
  db: SupplierDirectoryDatabaseAdapter
): Promise<SupplierDirectoryResponse> {
  const tier =
    params.tier && VALID_TIERS.includes(params.tier as SupplierTier) ? (params.tier as SupplierTier) : undefined;
  const corridor =
    params.corridor && VALID_CORRIDORS.includes(params.corridor as DefenceCorridor)
      ? (params.corridor as DefenceCorridor)
      : undefined;
  const capabilityDomain = params.capabilityDomain ? (params.capabilityDomain as CapabilityDomain) : undefined;

  const rawLimit = Number(params.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;

  const likePattern = params.query ? `%${escapeSqlLikePattern(params.query)}%` : undefined;

  try {
    const rows = await db.querySuppliers({
      tier,
      capabilityDomain,
      corridor,
      likePattern,
      cursor: params.cursor,
      limit: limit + 1
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.slug ?? null) : null;

    return {
      suppliers: pageRows.map(toRowDto),
      nextCursor
    };
  } catch (err) {
    return {
      suppliers: [],
      nextCursor: null,
      error: err instanceof Error ? err.message : 'Internal database error.'
    };
  }
}

export type { SupplierProfile };
