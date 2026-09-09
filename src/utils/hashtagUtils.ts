/**
 * Living Hashtag Normalization, Slug Generation & Stop-Tag Filtering (Phase 2)
 * SSOT for hashtags, platform slugs, and noise tag suppression.
 * Hard limit: <= 300 LOC (Target: <= 80 LOC).
 */

import { extractMilitaryEntities } from '../data/militaryEntities.js';

const NOISE_TAGS = new Set([
  'news', 'india', 'indian', 'defence', 'defense', 'security', 'update', 'updates',
  'topnews', 'breakingnews', 'national', 'international', 'general', 'latest',
  'article', 'articles', 'pressrelease', 'pressreleases', 'world', 'asia',
  'southasia', 'mod', 'ministryofdefence', 'editorial', 'opinion', 'report', 'reports',
  'alert', 'alerts', 'brief', 'briefing', 'analysis', 'exclusive', 'indianews',
  'idrwteam', 'idrw', 'andhrapradesh', 'space', 'trending',
  // Strategic title boilerplate words
  'operational', 'strategic', 'acquisition', 'modernization', 'systems', 'arc', 'delivery'
]);

export const KNOWN_ACRONYMS = new Set([
  'tasl', 'lac', 'loc', 'drdo', 'hal', 'iaf', 'mod', 'dac', 'ccs', 'amca', 'qrsam',
  'bmd', 'uav', 'ucav', 'eos', 'ins', 'bvr', 'mbrl', 'atgm', 'lracm', 'erads'
]);

const STRATEGIC_TAG_REGEX = /^(atmanirbhar|idex|makeinindia|iddm|procurement|strategic|indigenous|dap2020|drdo|hal|bel|tasl|mod|dac|ccs|lac|loc|army|navy|airforce|iaf|c-?uas|cuas|uav|ucav|bmd|ew|sigint|radar|sonar|artillery|missile|warship|submarine|corvette|frigate|destroyer|aircraft|fighter|stealth|hypersonic|aeroindia|defexpo|defense|defence|aviation|aerospace|apache)/i;

const ACRONYM_PATTERN = /^(tasl|lac|loc|drdo|hal|iaf|mod|dac|ccs|amca|qrsam|bmd|uav|ucav|eos|ins|bvr|mbrl|atgm|lracm|erads|mig|su|csl|mdl|grse|gsl|bel|bdl|midhani)\d*([a-z])?$/i;

export function isNoiseTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return true;
  const normalized = tag.replace(/^#/, '').toLowerCase().replace(/[\s\-_]+/g, '');
  return normalized.length <= 1 || NOISE_TAGS.has(normalized);
}

export function isDefenseTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false;
  if (isNoiseTag(tag)) return false;
  const cleaned = tag.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  if (!cleaned || cleaned.length <= 1) return false;
  const lower = cleaned.toLowerCase().replace(/[\s\-_]+/g, '');
  if (KNOWN_ACRONYMS.has(lower) || ACRONYM_PATTERN.test(lower)) return true;
  if (STRATEGIC_TAG_REGEX.test(lower)) return true;
  const military = extractMilitaryEntities(cleaned);
  return military.entities.length > 0;
}

export function cleanHashtag(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^#+/, '');
  cleaned = cleaned.replace(/^th[_-]/i, '');
  cleaned = cleaned.trim();
  if (!cleaned) return '';

  if (/[A-Z]/.test(cleaned)) {
    return cleaned;
  }

  return cleaned
    .split(/([-_ ])/)
    .map((part) => {
      if (/^[-_ ]+$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (KNOWN_ACRONYMS.has(lower)) return lower.toUpperCase();
      if (/^mk\d+[a-z]?$/i.test(part)) {
        return 'Mk' + part.slice(2).toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

export function hashtagToSlug(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^#+/, '');
  cleaned = cleaned.replace(/^th[_-]/i, '');
  cleaned = cleaned.trim();
  if (!cleaned) return '';

  // CamelCase splitting: e.g. INSSudarshini -> INS-Sudarshini
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1-$2');
  cleaned = cleaned.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2');

  // Letter-digit splitting: e.g. Su57 -> Su-57, EOS05 -> EOS-05, PR9560 -> PR-9560 (skip mk1a)
  cleaned = cleaned.replace(/\b([a-zA-Z]{2,})(\d{2,})\b/g, (match, p1, p2) => {
    return p1.toLowerCase() === 'mk' ? match : `${p1}-${p2}`;
  });

  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return slug ? `th_${slug}` : '';
}

export function canonicalizeTag(tag: string): string {
  if (!tag || isNoiseTag(tag)) return '';
  let cleaned = tag.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  cleaned = cleaned.replace(/\b([a-zA-Z]{2,})(\d{2,})\b/g, (match, p1, p2) => {
    return p1.toLowerCase() === 'mk' ? match : `${p1}-${p2}`;
  });
  return cleanHashtag(cleaned);
}
