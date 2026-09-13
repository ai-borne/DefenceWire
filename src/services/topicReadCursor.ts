/** Versioned, signed cursors for public topic collections. */

export type TopicCursorKind = 'articles' | 'topics';

export interface TopicCursorPayload {
  v: 1;
  kind: TopicCursorKind;
  registryVersion: number;
  assignmentVersion: string;
  publishedAt?: string;
  clusterId?: string;
  priority?: number;
  topicId?: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 600) return null;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch { return null; }
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

function equal(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) different |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return different === 0;
}

export async function encodeTopicCursor(payload: TopicCursorPayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await signature(body, secret)}`;
}

export async function decodeTopicCursor(raw: string | undefined, secret: string, kind: TopicCursorKind, registryVersion: number, assignmentVersion: string): Promise<TopicCursorPayload | null> {
  if (!raw || raw.length > 700) return null;
  const [body, suppliedSignature, extra] = raw.split('.');
  if (!body || !suppliedSignature || extra) return null;
  const expectedSignature = await signature(body, secret);
  const bytes = fromBase64Url(body);
  if (!bytes || !equal(suppliedSignature, expectedSignature)) return null;
  try {
    const value = JSON.parse(decoder.decode(bytes)) as TopicCursorPayload;
    if (value.v !== 1 || value.kind !== kind || value.registryVersion !== registryVersion || value.assignmentVersion !== assignmentVersion) return null;
    if (kind === 'articles' && (!value.publishedAt || !value.clusterId)) return null;
    if (kind === 'topics' && (typeof value.priority !== 'number' || !value.topicId)) return null;
    return value;
  } catch { return null; }
}
