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

/** AWS Signature V4 for a single PUT request against R2's S3-compatible API (region "auto", service "s3"). */
function signPut(config: R2Config, host: string, objectPath: string, body: string, amzDate: string): {
  authorization: string;
  contentSha256: string;
} {
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const contentSha256 = sha256Hex(body);

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${contentSha256}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', objectPath, '', canonicalHeaders, signedHeaders, contentSha256].join('\n');

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

/**
 * Generalized R2 object PUT, shared by every blob write in the crawler (the
 * archived-story cluster_json below, and MOAT3's tender PDF archiving) —
 * one SigV4 signing path, not a second upload mechanism per blob type.
 */
export async function putObject(
  key: string,
  body: string,
  contentType: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2PutResult> {
  const objectPath = `/${config.bucketName}/${key}`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const amzDate = amzDateNow();
  const { authorization, contentSha256 } = signPut(config, host, objectPath, body, amzDate);

  try {
    const response = await fetchFn(`https://${host}${objectPath}`, {
      method: 'PUT',
      headers: {
        Host: host,
        'x-amz-content-sha256': contentSha256,
        'x-amz-date': amzDate,
        Authorization: authorization,
        'Content-Type': contentType
      },
      body
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false };
  }
}

export async function putClusterJson(
  id: string,
  json: string,
  config: R2Config,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<R2PutResult> {
  return putObject(`${id}.json`, json, 'application/json', config, fetchFn);
}
