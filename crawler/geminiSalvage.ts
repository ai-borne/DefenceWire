/**
 * Partial-Salvage Validator for Gemini SSB Intelligence Output
 * Only whyItMatters is a hard requirement; every other field is optional and dropped
 * (not fatal) when invalid, so one bad optional field no longer discards an otherwise
 * good brief. Split out of summarizer.ts to keep it under the 300 LOC hard limit.
 * Hard limit: <= 300 LOC.
 */

import { DefenceTechTakeaway, SSBIntelligence } from '../src/types/news.js';
import { hasStructuredBrief, sanitizeGeminiOutput } from './summarizerPrompt.js';

export interface GeminiSalvageResult {
  intel: SSBIntelligence | null;
  hardErrors: string[];
  droppedFields: string[];
}

function sanitizeDefenceTechTakeaway(value: unknown, dropped: string[]): DefenceTechTakeaway | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    dropped.push('defenceTechTakeaway[not an object]');
    return null;
  }
  const dt = value as Record<string, unknown>;

  if (typeof dt.platformOrSystem !== 'string' || !dt.platformOrSystem.trim() || dt.platformOrSystem.length > 200) {
    dropped.push('defenceTechTakeaway[invalid platformOrSystem]');
    return null;
  }
  if (!Array.isArray(dt.specifications)) {
    dropped.push('defenceTechTakeaway[invalid specifications]');
    return null;
  }
  if (typeof dt.keySignificance !== 'string' || !dt.keySignificance.trim() || dt.keySignificance.length > 500) {
    dropped.push('defenceTechTakeaway[invalid keySignificance]');
    return null;
  }

  const specifications = dt.specifications
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0 && s.length <= 300)
    .map((s) => s.trim());
  if (specifications.length !== dt.specifications.length) {
    dropped.push('defenceTechTakeaway.specifications[invalid entries]');
  }

  const result: DefenceTechTakeaway = {
    platformOrSystem: dt.platformOrSystem.trim(),
    specifications,
    keySignificance: sanitizeGeminiOutput(dt.keySignificance) || dt.keySignificance.trim()
  };

  // Optional fields: an explicit null is Gemini's normal way of saying "unknown" for a
  // nullable schema field, not a malformed value — only drop it when it's actually wrong.
  if (dt.programTag !== undefined && dt.programTag !== null) {
    if (typeof dt.programTag === 'string' && dt.programTag.trim() && dt.programTag.length <= 100) {
      result.programTag = dt.programTag.trim();
    } else {
      dropped.push('defenceTechTakeaway.programTag');
    }
  }
  if (dt.budgetCrores !== undefined && dt.budgetCrores !== null) {
    if (typeof dt.budgetCrores === 'number' && dt.budgetCrores > 0) {
      result.budgetCrores = dt.budgetCrores;
    } else {
      dropped.push('defenceTechTakeaway.budgetCrores');
    }
  }
  if (dt.deliveryTimeline !== undefined && dt.deliveryTimeline !== null) {
    if (typeof dt.deliveryTimeline === 'string' && dt.deliveryTimeline.trim() && dt.deliveryTimeline.length <= 200) {
      result.deliveryTimeline = dt.deliveryTimeline.trim();
    } else {
      dropped.push('defenceTechTakeaway.deliveryTimeline');
    }
  }
  if (dt.indigenousContentPercentage !== undefined && dt.indigenousContentPercentage !== null) {
    if (typeof dt.indigenousContentPercentage === 'number' && dt.indigenousContentPercentage >= 0 && dt.indigenousContentPercentage <= 100) {
      result.indigenousContentPercentage = dt.indigenousContentPercentage;
    } else {
      dropped.push('defenceTechTakeaway.indigenousContentPercentage');
    }
  }

  return result;
}

function sanitizeStringArray(value: unknown, maxLen: number, dropped: string[], fieldName: string): string[] | undefined {
  if (!Array.isArray(value)) {
    dropped.push(fieldName);
    return undefined;
  }
  const valid = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen).map((v) => v.trim());
  if (valid.length !== value.length) {
    dropped.push(`${fieldName}[invalid entries]`);
  }
  return valid.length ? valid : undefined;
}

// Partial-salvage validator for Gemini output: only whyItMatters (present, non-empty,
// under the length cap, and following the mandated Scope -> Impact -> Strategic
// Significance structure) is a hard requirement. Every other field is optional —
// an invalid or absent optional field is dropped and logged, not treated as grounds
// to discard an otherwise-good brief. This replaces the old all-or-nothing check for
// the Gemini path only; getSSBIntelligenceValidationErrors/isValidSSBIntelligence in
// summarizer.ts stay as the strict all-or-nothing gate used by the Cloudflare Workers
// AI fallback path.
export function sanitizeGeminiSSBIntelligence(data: unknown): GeminiSalvageResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { intel: null, hardErrors: ['root: not a JSON object'], droppedFields: [] };
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.whyItMatters !== 'string' || obj.whyItMatters.trim().length === 0 || obj.whyItMatters.length > 1000) {
    return { intel: null, hardErrors: ['whyItMatters: missing, empty, or exceeds 1000 chars'], droppedFields: [] };
  }
  if (!hasStructuredBrief(obj.whyItMatters)) {
    return {
      intel: null,
      hardErrors: ['whyItMatters: does not follow mandated Scope -> Impact -> Strategic Significance structure'],
      droppedFields: []
    };
  }

  const dropped: string[] = [];
  const intel: SSBIntelligence = {
    provenance: 'gemini',
    whyItMatters: sanitizeGeminiOutput(obj.whyItMatters) || obj.whyItMatters.trim()
  };

  if (obj.strategicAngle !== undefined && obj.strategicAngle !== null) {
    if (typeof obj.strategicAngle === 'string' && obj.strategicAngle.trim() && obj.strategicAngle.length <= 1000) {
      intel.strategicAngle = sanitizeGeminiOutput(obj.strategicAngle) || obj.strategicAngle.trim();
    } else {
      dropped.push('strategicAngle');
    }
  }

  if (obj.defenceTechTakeaway !== undefined && obj.defenceTechTakeaway !== null) {
    const dtt = sanitizeDefenceTechTakeaway(obj.defenceTechTakeaway, dropped);
    if (dtt) intel.defenceTechTakeaway = dtt;
  }

  if (obj.gdLecturettePoints !== undefined && obj.gdLecturettePoints !== null) {
    const points = sanitizeStringArray(obj.gdLecturettePoints, 500, dropped, 'gdLecturettePoints');
    if (points) intel.gdLecturettePoints = points;
  }

  if (obj.potentialInterviewQuestions !== undefined && obj.potentialInterviewQuestions !== null) {
    const questions = sanitizeStringArray(obj.potentialInterviewQuestions, 500, dropped, 'potentialInterviewQuestions');
    if (questions) intel.potentialInterviewQuestions = questions;
  }

  return { intel, hardErrors: [], droppedFields: dropped };
}
