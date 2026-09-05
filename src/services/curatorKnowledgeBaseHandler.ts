/**
 * Curator Knowledge Base Read Handler for DefenceWire.in (Phase 5)
 * Read-only, paginated/sortable/filterable view over the D1 tables built up
 * by Phases 1-4: discovered_entities, source_reputation, supplier_candidates,
 * curator_overrides (recent actions), published_snapshots (publish history).
 * Table and column names are NEVER taken from client input directly — every
 * queryable identifier is resolved through TABLE_CONFIGS below, because
 * parameter binding protects values, not identifiers (functions/CLAUDE.md:
 * treat every input as untrusted at this boundary).
 * Hard limit: <= 300 LOC.
 */

import { verifySessionCookie } from './curatorAuthHandler.js';

export type KnowledgeBaseTableKey =
  | 'discovered_entities'
  | 'source_reputation'
  | 'supplier_candidates'
  | 'curator_overrides'
  | 'published_snapshots';

interface TableConfig {
  table: string;
  columns: string[];
  sortableColumns: string[];
  defaultSort: { column: string; dir: 'ASC' | 'DESC' };
  filterColumns: string[];
}

const TABLE_CONFIGS: Record<KnowledgeBaseTableKey, TableConfig> = {
  discovered_entities: {
    table: 'discovered_entities',
    columns: ['id', 'name', 'category', 'source_count', 'mention_count', 'is_promoted', 'first_seen_at', 'last_seen_at'],
    sortableColumns: ['name', 'category', 'source_count', 'mention_count', 'first_seen_at', 'last_seen_at'],
    defaultSort: { column: 'mention_count', dir: 'DESC' },
    filterColumns: ['name', 'category']
  },
  source_reputation: {
    table: 'source_reputation',
    columns: [
      'domain', 'source_name', 'total_items_ingested', 'accepted_items_count',
      'scoop_count', 'corroboration_count', 'reputation_multiplier', 'last_evaluated_at'
    ],
    sortableColumns: ['domain', 'source_name', 'total_items_ingested', 'scoop_count', 'reputation_multiplier', 'last_evaluated_at'],
    defaultSort: { column: 'reputation_multiplier', dir: 'DESC' },
    filterColumns: ['domain', 'source_name']
  },
  supplier_candidates: {
    table: 'supplier_candidates',
    columns: [
      'id', 'candidate_type', 'supplier_name', 'program_id', 'subsystem_name',
      'mention_count', 'source_count', 'confidence', 'status', 'first_seen_at', 'last_seen_at'
    ],
    sortableColumns: ['supplier_name', 'program_id', 'confidence', 'status', 'first_seen_at', 'last_seen_at'],
    defaultSort: { column: 'first_seen_at', dir: 'DESC' },
    filterColumns: ['supplier_name', 'program_id', 'status']
  },
  // payload_json omitted from the row view — this is an audit-trail list of
  // recent actions, not a payload inspector; id/type/who/when is the intent.
  curator_overrides: {
    table: 'curator_overrides',
    columns: ['id', 'override_type', 'updated_at', 'curator_email'],
    sortableColumns: ['id', 'override_type', 'updated_at', 'curator_email'],
    defaultSort: { column: 'updated_at', dir: 'DESC' },
    filterColumns: ['id', 'override_type', 'curator_email']
  },
  // snapshot_json omitted — it's the full {clusters, river} publish payload,
  // too large and unreadable for a table cell; this is a publish-history list.
  published_snapshots: {
    table: 'published_snapshots',
    columns: ['id', 'published_at', 'curator_email'],
    sortableColumns: ['id', 'published_at', 'curator_email'],
    defaultSort: { column: 'published_at', dir: 'DESC' },
    filterColumns: ['curator_email']
  }
};

export const KNOWLEDGE_BASE_TABLE_KEYS = Object.keys(TABLE_CONFIGS) as KnowledgeBaseTableKey[];

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export interface KnowledgeBaseQuery {
  table: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
  filter?: string;
}

export interface KnowledgeBaseData {
  table: KnowledgeBaseTableKey;
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeBaseResult {
  success: boolean;
  data?: KnowledgeBaseData;
  error?: string;
}

export interface CuratorKnowledgeBaseDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
  verifyAuth?: (cookieHeader: string | null) => Promise<boolean>;
}

async function resolveAuth(
  deps: CuratorKnowledgeBaseDependencies,
  cookieHeader: string | null,
  secret: string | undefined,
  isAuthorized: boolean | undefined
): Promise<boolean> {
  if (isAuthorized !== undefined) return isAuthorized;
  if (deps.verifyAuth) return deps.verifyAuth(cookieHeader);
  if (!cookieHeader) return false;
  return verifySessionCookie(cookieHeader, secret);
}

/** Lists paginated/sortable/filterable rows from one allow-listed knowledge-base table — curator-only, read-only. */
export async function handleGetKnowledgeBase(
  query: KnowledgeBaseQuery,
  deps: CuratorKnowledgeBaseDependencies,
  cookieHeader: string | null = null,
  secret?: string,
  isAuthorized?: boolean
): Promise<KnowledgeBaseResult> {
  const auth = await resolveAuth(deps, cookieHeader, secret, isAuthorized);
  if (!auth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  const config = TABLE_CONFIGS[query.table as KnowledgeBaseTableKey];
  if (!config) {
    return { success: false, error: `Unknown knowledge base table: "${query.table}".` };
  }

  const pageSize = Math.min(Math.max(1, Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(0, Math.trunc(query.page ?? 0) || 0);
  const sortColumn = query.sortBy && config.sortableColumns.includes(query.sortBy) ? query.sortBy : config.defaultSort.column;
  const requestedDir = (query.sortDir || '').toUpperCase();
  const sortDir: 'ASC' | 'DESC' = requestedDir === 'ASC' || requestedDir === 'DESC' ? requestedDir : config.defaultSort.dir;
  const filter = (query.filter || '').trim().slice(0, 200);

  let whereClause = '';
  const whereParams: unknown[] = [];
  if (filter && config.filterColumns.length > 0) {
    whereClause = ` WHERE ${config.filterColumns.map((c) => `${c} LIKE ?`).join(' OR ')}`;
    for (const _col of config.filterColumns) whereParams.push(`%${filter}%`);
  }

  try {
    const countRows = await deps.runQuery(`SELECT COUNT(*) as total FROM ${config.table}${whereClause};`, whereParams);
    const totalCount = Number((countRows[0] as { total?: number } | undefined)?.total ?? 0);

    const rows = await deps.runQuery(
      `SELECT ${config.columns.join(', ')} FROM ${config.table}${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?;`,
      [...whereParams, pageSize, page * pageSize]
    );

    return {
      success: true,
      data: { table: query.table as KnowledgeBaseTableKey, rows, totalCount, page, pageSize }
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}
