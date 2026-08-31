/**
 * Stable ID Hash for DefenceWire.in
 * Deterministic FNV-1a 32-bit hash used to derive article and cluster IDs
 * from content (the article URL) instead of Date.now(). The same story
 * must get the same ID on every crawl run, or permalinks, the archive
 * diff, and the sitemap all break every 20 minutes.
 * Hard limit: <= 300 LOC.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function computeStableHash(input: string): string {
  const normalized = input.trim().toLowerCase();
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
