/**
 * Deterministic Entity Salience Scoring Engine (Phase 1)
 * Evaluates entity prominence (headline, lead sentence, frequency, subject role).
 * Zero-token Tier 1 gate to filter incidental mentions from primary hashtags.
 * Hard limit: <= 120 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import {
  hasWordBoundary,
  countTokenOccurrences,
  validateEntityAnchors
} from './entityDisambiguator.js';

export const PRIMARY_TAG_SALIENCE_THRESHOLD = 0.60;

export interface EntitySalienceScore {
  entity: string;
  score: number;
  headlineScore: number;
  leadScore: number;
  frequencyAndSubjectScore: number;
  isEligibleForPrimaryTag: boolean;
  disambiguationValid: boolean;
}

export interface SalienceInput {
  headline: string;
  body?: string;
}

function isGrammaticalSubject(text: string, entity: string): boolean {
  if (!text || !entity) return false;
  const clean = entity.replace(/^#+/, '').replace(/^th[_-]/i, '').trim();
  const trimmed = text.trim();
  const leadWindow = trimmed.slice(0, Math.min(trimmed.length, 60));
  if (new RegExp(`^[\\s"'‘“\\[\\(\\-]*${clean}\\b`, 'i').test(leadWindow)) return true;
  const words = trimmed.split(/\s+/).slice(0, 3).join(' ');
  return hasWordBoundary(words, clean);
}

/**
 * Calculates deterministic entity salience score.
 * Formula: Headline (0.50) + First Sentence / Lead (0.30) + Frequency & Subject (0.20).
 */
export function calculateEntitySalience(
  entity: string,
  input: SalienceInput | string,
  bodyText?: string
): EntitySalienceScore {
  const headline = typeof input === 'string' ? input : input.headline;
  const body = typeof input === 'string' ? (bodyText || '') : (input.body || '');
  const fullText = `${headline} ${body}`.trim();

  // Tier 1 Disambiguation & Anchor Check
  const disambiguation = validateEntityAnchors(entity, fullText);
  if (!disambiguation.isValid) {
    return {
      entity, score: 0.0, headlineScore: 0.0, leadScore: 0.0, frequencyAndSubjectScore: 0.0,
      isEligibleForPrimaryTag: false, disambiguationValid: false
    };
  }

  // 1. Headline Mention Weight: 0.50
  const headlineScore = hasWordBoundary(headline, entity) ? 0.50 : 0.0;

  // 2. First Sentence / Lead Position Weight: 0.30
  const sentences = body.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const leadSentence = sentences[0] || '';
  const leadScore = hasWordBoundary(leadSentence, entity) ? 0.30 : 0.0;

  // 3. Frequency & Grammatical Subject Role: 0.20
  const totalOccurrences = countTokenOccurrences(fullText, entity);
  let freqScore = 0.0;
  if (totalOccurrences >= 3) freqScore = 0.10;
  else if (totalOccurrences === 2) freqScore = 0.07;
  else if (totalOccurrences >= 1) freqScore = 0.04;

  const subjectBonus = (isGrammaticalSubject(headline, entity) || isGrammaticalSubject(leadSentence, entity)) ? 0.10 : 0.0;
  const frequencyAndSubjectScore = Math.min(0.20, Number((freqScore + subjectBonus).toFixed(2)));

  const rawScore = headlineScore + leadScore + frequencyAndSubjectScore;
  const score = Number(Math.min(1.0, rawScore).toFixed(2));

  return {
    entity, score, headlineScore, leadScore, frequencyAndSubjectScore,
    isEligibleForPrimaryTag: score >= PRIMARY_TAG_SALIENCE_THRESHOLD,
    disambiguationValid: true
  };
}

/**
 * Helper to compute salience directly from a StoryCluster.
 */
export function calculateClusterEntitySalience(cluster: StoryCluster, entity: string): EntitySalienceScore {
  const headline = cluster.synthesizedHeadline || cluster.primarySource?.title || '';
  const bodyParts = [
    cluster.primarySource?.snippet || '',
    ...(cluster.relatedCoverage || []).map((r) => `${r.title} ${r.snippet || ''}`)
  ];
  return calculateEntitySalience(entity, { headline, body: bodyParts.join('\n') });
}
