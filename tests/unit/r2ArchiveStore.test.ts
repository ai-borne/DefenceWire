/**
 * Unit Tests for the Crawler R2 Archive Blob Store (S3-compatible REST write path)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildR2ConfigFromEnv, putClusterJson } from '../../crawler/r2ArchiveStore.js';

const config = {
  accountId: 'acct-1',
  accessKeyId: 'key-1',
  secretAccessKey: 'secret-1',
  bucketName: 'defencewire-archive-blobs'
};

describe('buildR2ConfigFromEnv', () => {
  it('builds a config when all four env vars are present', () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: 'acct-1',
      R2_ACCESS_KEY_ID: 'key-1',
      R2_SECRET_ACCESS_KEY: 'secret-1',
      R2_BUCKET_NAME: 'defencewire-archive-blobs'
    };
    expect(buildR2ConfigFromEnv(env)).toEqual(config);
  });

  it('returns null when any env var is missing', () => {
    expect(buildR2ConfigFromEnv({ CLOUDFLARE_ACCOUNT_ID: 'acct-1' })).toBeNull();
    expect(buildR2ConfigFromEnv({})).toBeNull();
  });
});

describe('putClusterJson', () => {
  it('PUTs to the account/bucket-keyed R2 endpoint with a signed request', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await putClusterJson('story-1', '{"id":"story-1"}', config, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://acct-1.r2.cloudflarestorage.com/defencewire-archive-blobs/story-1.json');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('{"id":"story-1"}');

    const headers = init.headers as Record<string, string>;
    expect(headers.Host).toBe('acct-1.r2.cloudflarestorage.com');
    expect(headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
    expect(headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/);
    expect(headers.Authorization).toContain('AWS4-HMAC-SHA256 Credential=key-1/');
    expect(headers.Authorization).toContain('/auto/s3/aws4_request');
    expect(headers.Authorization).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date');
    expect(headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);

    expect(result).toEqual({ ok: true, status: 200 });
  });

  it('reports a non-2xx response as a failure without throwing', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const result = await putClusterJson('story-1', '{}', config, fetchFn);

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('reports a network error as a failure without throwing', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await putClusterJson('story-1', '{}', config, fetchFn);

    expect(result).toEqual({ ok: false });
  });
});
