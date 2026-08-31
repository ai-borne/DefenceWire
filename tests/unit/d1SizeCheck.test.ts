/**
 * Unit Tests for the D1 database size check (Phase 5 of the R2 cluster_json migration).
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { checkD1Size, D1_SIZE_WARNING_BYTES } from '../../crawler/d1SizeCheck.js';
import { D1RestConfig } from '../../crawler/archiveSync.js';

const d1Config: D1RestConfig = { accountId: 'acct-1', databaseId: 'db-1', apiToken: 'token-1' };

function fakeInfoResponse(fileSizeBytes: number, ok = true) {
  return vi.fn(async () => {
    const bodyText = JSON.stringify({ result: { file_size: fileSizeBytes } });
    return { ok, status: ok ? 200 : 500, text: async () => bodyText } as unknown as Response;
  });
}

describe('checkD1Size', () => {
  it('reports ok=true when the database is well under the warning threshold', async () => {
    const fetchFn = fakeInfoResponse(D1_SIZE_WARNING_BYTES - 1_000_000);
    const result = await checkD1Size(d1Config, fetchFn);
    expect(result.ok).toBe(true);
    expect(result.overThreshold).toBe(false);
    expect(result.sizeBytes).toBe(D1_SIZE_WARNING_BYTES - 1_000_000);
  });

  it('reports overThreshold=true at or above the warning threshold', async () => {
    const fetchFn = fakeInfoResponse(D1_SIZE_WARNING_BYTES);
    const result = await checkD1Size(d1Config, fetchFn);
    expect(result.ok).toBe(true);
    expect(result.overThreshold).toBe(true);
  });

  it('reports overThreshold=true when comfortably above the warning threshold', async () => {
    const fetchFn = fakeInfoResponse(D1_SIZE_WARNING_BYTES + 500_000_000);
    const result = await checkD1Size(d1Config, fetchFn);
    expect(result.overThreshold).toBe(true);
  });

  it('surfaces a failed request rather than silently reporting ok', async () => {
    const fetchFn = fakeInfoResponse(0, false);
    const result = await checkD1Size(d1Config, fetchFn);
    expect(result.ok).toBe(false);
    expect(result.overThreshold).toBe(false);
  });
});
