/**
 * Snippet Sanitization & Intelligent Sentence-Boundary Truncation Engine
 * Eliminates RSS syndication boilerplate (IDRW, TWZ, WordPress) and applies
 * boundary-aware formatting without mid-word cutoffs.
 * Hard limit: <= 300 LOC.
 */

import { sanitizePlainText, decodeHtmlEntities } from './security.js';

/** Leading syndication notice patterns (e.g., IDRW, Livefist, WordPress cross-posts) */
const SYNDICATION_PREFIX_REGEXES: RegExp[] = [
  /^This\s+article\s+was\s+(?:originally\s+)?published\s+(?:on|in|at)\s+[^.\n]+(?:\.[a-z]{2,6})?\.?\s*/i,
  /^(?:Originally\s+published\s+(?:on|in|at)|First\s+published\s+(?:on|in|at)|Cross-posted\s+from|Source:\s*)\s*[^.\n]+(?:\.[a-z]{2,6})?\.?\s*/i,
  /^Published\s+first\s+on\s+[^.\n]+(?:\.[a-z]{2,6})?\.?\s*/i,
  /^Also\s+read:\s*/i
];

/** Trailing syndication and aggregator boilerplate patterns */
const SYNDICATION_SUFFIX_REGEXES: RegExp[] = [
  /\s*(?:The\s+post\s+[\s\S]*?\s+appeared\s+first\s+on[\s\S]*|Read\s+(?:the\s+)?full\s+article\s+(?:on|at)\s+.*|Read\s+more(?:\s+at|\s+on|\s*:)?.*|Continue\s+reading(?:\s+on|\s+at)?.*|Click\s+here\s+to\s+read\s+more.*|Full\s+article\s+at\s+.*|Also\s+read\s*:.*|Follow\s+us\s+on\s+.*|Photo\s+credit\s*:.*|Image\s+courtesy\s*:.*)\s*$/i,
  /\s*\[\s*\+\d+\s*chars\s*\]\s*$/i,
  /\s*\[\s*(?:\.\.\.|…|&#8230;)\s*\]\s*$/i
];

/** Dangling words and prepositions/conjunctions to trim before ellipsis */
const DANGLING_WORD_REGEX = /\s+(?:and|or|the|a|an|in|on|at|to|for|of|with|by|from|as|is|was|are|were|be|been|that|this|these|those|which|who|whom|whose|if|then|else|when|where|why|how|not|but|so|yet|into|onto|upon|about|above|below|between|under|over|their|its|his|her|my|our|your)\s*$/i;

/**
 * Strips RSS syndication boilerplate headers, footers, and aggregator noise.
 *
 * @param text - Plain text snippet
 * @returns Clean text stripped of syndication wrappers
 */
export function stripSyndicationBoilerplate(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Strip leading syndication prefixes
  for (const regex of SYNDICATION_PREFIX_REGEXES) {
    cleaned = cleaned.replace(regex, '').trim();
  }

  // Strip trailing syndication suffixes
  for (const regex of SYNDICATION_SUFFIX_REGEXES) {
    cleaned = cleaned.replace(regex, '').trim();
  }

  return cleaned;
}

/**
 * Truncates text intelligently by favoring complete sentence boundaries or
 * falling back to whole word boundaries without leaving dangling prepositions or cutoffs.
 *
 * @param text - Cleaned plain text
 * @param maxLen - Maximum target character length (default: 280)
 * @param minSentenceLen - Minimum character length threshold for accepting a full sentence (default: 120)
 * @returns Intelligently bounded snippet
 */
export function truncateIntelligently(text: string, maxLen = 280, minSentenceLen = 120): string {
  if (!text || typeof text !== 'string') return '';

  const clean = text.replace(/\s+/g, ' ').trim();
  const endsWithPunctuation = /[.!?]["'”’)]*$/.test(clean) || clean.endsWith('...') || clean.endsWith('…');

  if (clean.length <= maxLen && endsWithPunctuation) {
    return clean;
  }

  // 1. Check for a complete sentence boundary (. ! ?) within the optimal window
  // Handles closing quotes and parentheses: e.g. "the Army.”
  const withinLimit = clean.slice(0, maxLen + 1);
  const sentenceMatches = [...withinLimit.matchAll(/([.!?]["'”’)]*)(?:\s+|$)/g)];

  if (sentenceMatches.length > 0) {
    for (let i = sentenceMatches.length - 1; i >= 0; i--) {
      const match = sentenceMatches[i];
      if (match && typeof match.index === 'number') {
        const punctuationLength = match[1]?.length ?? 1;
        const sentenceEndIndex = match.index + punctuationLength;
        if (sentenceEndIndex >= minSentenceLen && sentenceEndIndex <= maxLen) {
          return clean.slice(0, sentenceEndIndex).trim();
        }
      }
    }
  }

  // If text was short but had no punctuation at the end, and no earlier sentence was found
  if (clean.length <= maxLen && !DANGLING_WORD_REGEX.test(clean)) {
    // If it's short and clean without dangling words, return as is (or with clean ending)
    return clean;
  }

  // 2. Fallback: Truncate at word boundary before maxLen
  let sub = clean.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace >= 30) {
    sub = sub.slice(0, lastSpace);
  }

  // Clean trailing dangling prepositions/conjunctions
  while (DANGLING_WORD_REGEX.test(sub)) {
    sub = sub.replace(DANGLING_WORD_REGEX, '');
  }

  // Strip trailing punctuation (commas, hyphens, colons, semicolons)
  sub = sub.replace(/[,;:\s\-—–]+$/, '').trim();

  // Ensure clean ellipsis ending without double ellipses
  if (sub.endsWith('...') || sub.endsWith('…')) {
    return sub;
  }
  if (sub.endsWith('.')) {
    return `${sub.slice(0, -1)}...`;
  }

  return `${sub}...`;
}

/**
 * Cleans publication and news source names to concise display brand names.
 * e.g., "IDRW (Indian Defence Research Wing)" -> "IDRW"
 *       "Defense News (Global Top 100)" -> "Defense News"
 *       "The Hindu (National Security)" -> "The Hindu"
 *       "Press Information Bureau (PIB MoD)" -> "PIB"
 */
export function cleanSourceName(rawName: string | undefined | null): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();

  // Known standard short aliases
  if (/^Press Information Bureau/i.test(trimmed)) return 'PIB';
  if (/^ADG PI/i.test(trimmed)) return 'Indian Army';
  if (/^SpokespersonNavy/i.test(trimmed)) return 'Indian Navy';
  if (/^Asian News International/i.test(trimmed)) return 'ANI';

  // Strip trailing parenthetical or dashed subtitles: e.g. "Name (Subtitle)" or "Name - Subtitle"
  return trimmed
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*[-—–]\s+[A-Za-z0-9 &.,]+$/, '')
    .trim() || trimmed;
}

/**
 * Full Pipeline: Sanitizes HTML/entities, strips syndication boilerplate,
 * and formats snippet with intelligent boundary truncation.
 *
 * @param rawText - Raw snippet/description from feed or cluster
 * @param maxLen - Maximum character length (default: 280)
 * @returns Production-ready clean snippet string
 */
export function cleanStorySnippet(rawText: string | undefined | null, maxLen = 280): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  // 1. Sanitize HTML tags and decode UTF-8 entities
  const decoded = decodeHtmlEntities(rawText);
  const plain = sanitizePlainText(decoded);

  // 2. Strip syndication prefixes and suffixes
  const stripped = stripSyndicationBoilerplate(plain);

  // 3. Apply intelligent sentence/word boundary truncation
  return truncateIntelligently(stripped, maxLen);
}

/**
 * Sanitizes synthesized headlines for clean journalistic scannability:
 * - Decodes entities & strips malicious tags
 * - Normalizes excessive whitespace
 * - Strips trailing periods, multiple dots, colons, or semicolons
 * - Preserves standard abbreviations like "U.S." or single initials
 *
 * @param rawHeadline - Raw headline text
 * @returns Cleaned headline without trailing periods
 */
export function cleanHeadline(rawHeadline: string | undefined | null): string {
  if (!rawHeadline || typeof rawHeadline !== 'string') {
    return '';
  }

  const decoded = decodeHtmlEntities(rawHeadline);
  const sanitized = sanitizePlainText(decoded).replace(/\s+/g, ' ').trim();

  // If ending with known abbreviations like U.S. or similar 2-letter acronyms (e.g. "in the U.S.")
  if (/\b(?:[A-Z]\.){2,}$/i.test(sanitized)) {
    return sanitized;
  }

  // Strip trailing periods, ellipses, colons, and semicolons
  return sanitized.replace(/[\s.;:]+$/, '').trim();
}

