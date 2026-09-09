/**
 * Deterministic Entity Disambiguator & Contextual Anchor Validator (Phase 1)
 * Enforces strict token-boundary matching and contextual anchors for short acronyms.
 * Hard limit: <= 140 LOC.
 */

export interface DisambiguationResult {
  entity: string;
  isValid: boolean;
  hasWordBoundaryMatch: boolean;
  matchedAnchors: string[];
  score: number; // 0.0 or 1.0
  reason?: string;
}

export const CONTEXTUAL_ANCHORS: Record<string, readonly string[]> = {
  LAC: ['China', 'PLA', 'border', 'patrol', 'Ladakh', 'Arunachal', 'standoff', 'Line of Actual Control', 'buffer zone'],
  INS: ['Navy', 'warship', 'frigate', 'destroyer', 'submarine', 'port', 'maritime', 'naval'],
  DAC: ['procurement', 'Rajnath', 'MoD', 'clearance', 'order', 'capital acquisition', 'tender'],
  HAL: ['aviation', 'aircraft', 'helicopter', 'aeronautics', 'Tejas', 'Prachand', 'Rudra', 'fighter', 'aerospace'],
  LOC: ['Pakistan', 'ceasefire', 'border', 'Line of Control', 'Kashmir', 'Jammu', 'infiltration', 'cross-border']
};

export const ENTITY_EXPANSIONS: Record<string, readonly string[]> = {
  LAC: ['Line of Actual Control'],
  LOC: ['Line of Control'],
  DAC: ['Defence Acquisition Council', 'Defense Acquisition Council'],
  HAL: ['Hindustan Aeronautics'],
  INS: ['Indian Naval Ship']
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getEntityVariants(clean: string): string[] {
  const spaced = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  const variants = [clean, ...(ENTITY_EXPANSIONS[clean.toUpperCase()] || [])];
  if (spaced !== clean) variants.push(spaced);
  const prefix = ['HAL', 'INS', 'DAC', 'LAC', 'LOC'].find(
    (p) => clean.toUpperCase().startsWith(p) && clean.length > p.length
  );
  if (prefix) variants.push(`${clean.slice(0, prefix.length)} ${clean.slice(prefix.length)}`);
  return variants;
}

/**
 * Checks if entity exists as an exact discrete word token in text (never loose substring).
 */
export function hasWordBoundary(text: string, entity: string): boolean {
  if (!text || !entity) return false;
  const clean = entity.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  if (!clean) return false;
  return getEntityVariants(clean).some((v) => {
    const escaped = escapeRegExp(v);
    return new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}(?=[^a-zA-Z0-9_-]|$)`, 'i').test(text);
  });
}

/**
 * Counts discrete occurrences of an entity within text using strict token boundaries.
 */
export function countTokenOccurrences(text: string, entity: string): number {
  if (!text || !entity) return 0;
  const clean = entity.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  if (!clean) return 0;
  let total = 0;
  for (const v of getEntityVariants(clean)) {
    const escaped = escapeRegExp(v);
    const matches = text.match(new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}(?=[^a-zA-Z0-9_-]|$)`, 'gi'));
    if (matches) total += matches.length;
  }
  return total;
}

/**
 * Validates contextual anchors for acronyms and evaluates disambiguation confidence score.
 */
export function validateEntityAnchors(entity: string, text: string): DisambiguationResult {
  const clean = entity.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  if (!clean || !text) {
    return { entity, isValid: false, hasWordBoundaryMatch: false, matchedAnchors: [], score: 0, reason: 'Empty entity or text' };
  }

  if (!hasWordBoundary(text, clean)) {
    return {
      entity,
      isValid: false,
      hasWordBoundaryMatch: false,
      matchedAnchors: [],
      score: 0,
      reason: `Entity "${clean}" not found as discrete word boundary in text`
    };
  }

  const key = clean.toUpperCase();
  const anchors = CONTEXTUAL_ANCHORS[key];
  if (!anchors || anchors.length === 0) {
    return { entity, isValid: true, hasWordBoundaryMatch: true, matchedAnchors: [], score: 1.0 };
  }

  const matchedAnchors: string[] = [];
  for (const anchor of anchors) {
    const escaped = escapeRegExp(anchor);
    if (new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}(?=[^a-zA-Z0-9_-]|$)`, 'i').test(text)) {
      matchedAnchors.push(anchor);
    }
  }

  if (matchedAnchors.length === 0) {
    return {
      entity,
      isValid: false,
      hasWordBoundaryMatch: true,
      matchedAnchors: [],
      score: 0,
      reason: `Ambiguous acronym "${key}" lacks required contextual anchors`
    };
  }

  return { entity, isValid: true, hasWordBoundaryMatch: true, matchedAnchors, score: 1.0 };
}

export function disambiguateEntity(entity: string, text: string): boolean {
  return validateEntityAnchors(entity, text).isValid;
}
