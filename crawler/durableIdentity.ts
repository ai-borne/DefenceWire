/** Durable source and cluster identity primitives; no persistence side effects. */
const TRACKING_KEYS = new Set([
  'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'source',
  'utm_campaign', 'utm_content', 'utm_medium', 'utm_source', 'utm_term'
]);

export function canonicalizeArticleUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Article URL must use HTTP or HTTPS.');
  }
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  if (url.port === '80' || url.port === '443') url.port = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.pathname = normalizePath(url.pathname);
  return url.toString();
}

export async function createSourceArticleId(input: {
  url?: string; sourceOwnerKey: string; publishedAt: string; title: string; contentHash: string;
}): Promise<string> {
  if (input.url?.trim()) return `article_${await stableDigest(canonicalizeArticleUrl(input.url))}`;
  const fallback = [input.sourceOwnerKey, input.publishedAt, normalizeText(input.title), input.contentHash].join('|');
  return `article_${await stableDigest(fallback)}`;
}

export function mintClusterId(uuid: string = crypto.randomUUID()): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new Error('Cluster identity must be minted from a random UUID.');
  }
  return `cluster_${uuid.toLowerCase()}`;
}

function normalizePath(pathname: string): string {
  const decoded = pathname.split('/').map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  }).join('/');
  const encoded = decoded.split('/').map((part) => encodeURIComponent(part)).join('/');
  return encoded.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

async function stableDigest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
