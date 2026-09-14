/**
 * Crawler R2 Archive Blob Store for DefenceWire.in
 * Writes each archived story's full cluster_json payload to Cloudflare R2 via
 * R2's S3-compatible REST API (AWS SigV4), mirroring the D1 REST auth pattern
 * in crawler/archiveSync.ts — GitHub Actions has no Workers binding, so this
 * is the write path available outside the edge runtime. One object per
 * story, keyed by cluster id.
 * Hard limit: <= 300 LOC.
 */

import { createHmac, createHash } from 'node:crypto';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface R2PutResult {
  ok: boolean;
  status?: number;
}

export function buildR2ConfigFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): R2Config | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null;
  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function amzDateNow(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/** AWS Signature V4 for a single request against R2's S3-compatible API (region "auto", service "s3"). */
function signRequest(method: string, config: R2Config, host: string, objectPath: string, body: string, amzDate: string, queryString = ''): {
  authorization: string;
  contentSha256: string;
} {
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const contentSha256 = sha256Hex(body);

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${contentSha256}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, objectPath, queryString, canonicalHeaders, signedHeaders, contentSha256].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign).toString('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { authorization, contentSha256 };
}

export async function putClusterJson(
  id: string,
  json: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2PutResult> {
  return putJsonObject(`${id}.json`, json, config, fetchFn);
}

/** Writes an explicitly keyed JSON object for resumable ingestion payloads. */
export async function putJsonObject(
  key: string,
  json: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2PutResult> {
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  const objectPath = `/${config.bucketName}/${safeKey}`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const amzDate = amzDateNow();
  const { authorization, contentSha256 } = signRequest('PUT', config, host, objectPath, json, amzDate);

  try {
    const response = await fetchFn(`https://${host}${objectPath}`, {
      method: 'PUT',
      headers: {
        Host: host,
        'x-amz-content-sha256': contentSha256,
        'x-amz-date': amzDate,
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: json
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false };
  }
}

/** Deletes one object by key. Used when an archived cluster returns to the live feed, so its R2 blob does not outlive the D1 row that referenced it. */
export async function deleteObject(
  key: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2PutResult> {
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  const objectPath = `/${config.bucketName}/${safeKey}`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const amzDate = amzDateNow();
  const { authorization, contentSha256 } = signRequest('DELETE', config, host, objectPath, '', amzDate);

  try {
    const response = await fetchFn(`https://${host}${objectPath}`, {
      method: 'DELETE',
      headers: {
        Host: host,
        'x-amz-content-sha256': contentSha256,
        'x-amz-date': amzDate,
        Authorization: authorization
      }
    });
    return { ok: response.ok || response.status === 404, status: response.status };
  } catch {
    return { ok: false };
  }
}

/**
 * Lists every object key in the bucket via R2's S3-compatible ListObjectsV2,
 * paging on IsTruncated/NextContinuationToken. Read-only; used only by the
 * D1/R2 reconciliation report. Minimal regex XML extraction is deliberate:
 * R2's ListObjectsV2 response is a small, trusted, well-formed document, not
 * unbounded user input, so a full XML parser dependency is not warranted.
 */
export async function listObjectKeys(
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<string[]> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const params = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000' });
    if (continuationToken) params.set('continuation-token', continuationToken);
    const queryString = Array.from(params.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const objectPath = `/${config.bucketName}`;
    const amzDate = amzDateNow();
    const { authorization, contentSha256 } = signRequest('GET', config, host, objectPath, '', amzDate, queryString);

    const response = await fetchFn(`https://${host}${objectPath}?${queryString}`, {
      method: 'GET',
      headers: {
        Host: host,
        'x-amz-content-sha256': contentSha256,
        'x-amz-date': amzDate,
        Authorization: authorization
      }
    });
    if (!response.ok) {
      throw new Error(`R2 ListObjectsV2 failed: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) keys.push(match[1] ?? '');
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
    continuationToken = truncated ? tokenMatch?.[1] : undefined;
  } while (continuationToken);

  return keys;
}

export interface R2GetResult {
  ok: boolean;
  status?: number;
  body: string | null;
}

/** Fetches a previously archived cluster's full JSON payload back out of R2 by cluster id. */
export async function getClusterJson(
  id: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2GetResult> {
  const objectPath = `/${config.bucketName}/${id}.json`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const amzDate = amzDateNow();
  const { authorization, contentSha256 } = signRequest('GET', config, host, objectPath, '', amzDate);

  try {
    const response = await fetchFn(`https://${host}${objectPath}`, {
      method: 'GET',
      headers: {
        Host: host,
        'x-amz-content-sha256': contentSha256,
        'x-amz-date': amzDate,
        Authorization: authorization
      }
    });
    if (!response.ok) return { ok: false, status: response.status, body: null };
    return { ok: true, status: response.status, body: await response.text() };
  } catch {
    return { ok: false, body: null };
  }
}
