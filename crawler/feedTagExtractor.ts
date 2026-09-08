/**
 * Feed Category & Hashtag Extractor with Noise Tag Blocklist
 * Hard limit: <= 80 LOC.
 */

import { decodeHtmlEntities } from '../src/utils/security.js';
import { isNoiseTag } from '../src/utils/hashtagUtils.js';

export const isNoiseCategoryTag = isNoiseTag;
export { isNoiseTag };

function normalizeTagToHashtag(raw: string): string | null {
  const decoded = decodeHtmlEntities(raw).trim();
  if (!decoded) return null;
  const cleaned = decoded.replace(/^#+/, '').trim();
  if (isNoiseCategoryTag(cleaned)) return null;
  const tagToken = cleaned.replace(/\s+/g, '');
  if (!tagToken || isNoiseCategoryTag(tagToken)) return null;
  return `#${tagToken}`;
}

export function extractFeedTags(xmlBlock: string, title?: string, snippet?: string): string[] {
  const candidates: string[] = [];
  const tagRegex = /<(?:category|dc:subject)\b[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:category|dc:subject)>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xmlBlock)) !== null) {
    const rawVal = match[1] ?? match[2] ?? '';
    const norm = normalizeTagToHashtag(rawVal);
    if (norm) candidates.push(norm);
  }

  const textToScan = `${title || ''} ${snippet || ''}`;
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9][a-zA-Z0-9_\-]{1,49})/g;
  let hashMatch: RegExpExecArray | null;
  while ((hashMatch = hashtagRegex.exec(textToScan)) !== null) {
    const rawTag = hashMatch[1];
    if (rawTag) {
      const norm = normalizeTagToHashtag(rawTag);
      if (norm) candidates.push(norm);
    }
  }

  const seen = new Set<string>();
  const uniqueTags: string[] = [];
  for (const tag of candidates) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueTags.push(tag);
    }
  }

  return uniqueTags;
}
