/**
 * Gemini Flash & Extractive SSB Intelligence Summarizer
 * Generates context-grounded briefs with SHA-256 memory and extractive miner fallbacks.
 * Hard limit: <= 300 LOC.
 */

import * as crypto from 'node:crypto';
import { SSBIntelligence, StoryCluster } from '../src/types/news.js';
import { generateExtractiveSSBIntel } from './extractiveMiner.js';
import { sanitizeGeminiSSBIntelligence } from './geminiSalvage.js';
import {
  appendCorrectionFeedback,
  buildGeminiPrompt,
  buildGeminiResponseSchema,
  parseGeminiJsonFromText,
  sanitizePromptField
} from './summarizerPrompt.js';

export { generateExtractiveSSBIntel } from './extractiveMiner.js';
export { hasStructuredBrief } from './summarizerPrompt.js';
export { sanitizeGeminiSSBIntelligence } from './geminiSalvage.js';

export const SUMMARY_MEMORY_CACHE = new Map<string, SSBIntelligence>();
export const MIN_REQUEST_INTERVAL_MS = 4500;
let lastRequestTimestamp = 0;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export function getGeminiModelName(env: NodeJS.ProcessEnv = process.env): string {
  return env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function resetThrottleState(): void {
  lastRequestTimestamp = 0;
}

export function computeContentHash(headline: string, url: string): string {
  const normalized = `${(headline || '').trim().toLowerCase()}|${(url || '').trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function clearSummaryMemoryCache(): void {
  SUMMARY_MEMORY_CACHE.clear();
  resetThrottleState();
}

export function getSummaryMemorySize(): number {
  return SUMMARY_MEMORY_CACHE.size;
}

async function throttleNextRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTimestamp;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTimestamp = Date.now();
}

export function isSSBRelevant(cluster: StoryCluster): boolean {
  return cluster.categories.includes('ssb');
}

export function generateHeuristicSSBIntel(cluster: StoryCluster): SSBIntelligence {
  return generateExtractiveSSBIntel(cluster);
}

export function sanitizePromptInput(text: string, maxLen: number): string {
  return sanitizePromptField(text, maxLen);
}

export function getSSBIntelligenceValidationErrors(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['root: not a JSON object'];
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.whyItMatters !== 'string' || obj.whyItMatters.trim().length === 0 || obj.whyItMatters.length > 1000) {
    errors.push('whyItMatters: missing, empty, or exceeds 1000 chars');
  }
  if (obj.strategicAngle !== undefined && (typeof obj.strategicAngle !== 'string' || obj.strategicAngle.length > 1000)) {
    errors.push('strategicAngle: invalid type or exceeds 1000 chars');
  }

  if (obj.defenceTechTakeaway !== undefined) {
    if (!obj.defenceTechTakeaway || typeof obj.defenceTechTakeaway !== 'object' || Array.isArray(obj.defenceTechTakeaway)) {
      errors.push('defenceTechTakeaway: not an object');
    } else {
      const dt = obj.defenceTechTakeaway as Record<string, unknown>;
      if (typeof dt.platformOrSystem !== 'string' || dt.platformOrSystem.length > 200) {
        errors.push('defenceTechTakeaway.platformOrSystem: invalid type or exceeds 200 chars');
      }
      if (!Array.isArray(dt.specifications) || !dt.specifications.every((s) => typeof s === 'string' && s.length <= 300)) {
        errors.push('defenceTechTakeaway.specifications: invalid array or entry exceeds 300 chars');
      }
      if (typeof dt.keySignificance !== 'string' || dt.keySignificance.length > 500) {
        errors.push('defenceTechTakeaway.keySignificance: invalid type or exceeds 500 chars');
      }
      if (dt.indigenousContentPercentage !== undefined && (typeof dt.indigenousContentPercentage !== 'number' || dt.indigenousContentPercentage < 0 || dt.indigenousContentPercentage > 100)) {
        errors.push('defenceTechTakeaway.indigenousContentPercentage: out of range 0-100');
      }
      if (dt.budgetCrores !== undefined && (typeof dt.budgetCrores !== 'number' || dt.budgetCrores < 0)) {
        errors.push('defenceTechTakeaway.budgetCrores: negative or invalid type');
      }
      if (dt.deliveryTimeline !== undefined && (typeof dt.deliveryTimeline !== 'string' || dt.deliveryTimeline.length > 200)) {
        errors.push('defenceTechTakeaway.deliveryTimeline: invalid type or exceeds 200 chars');
      }
      if (dt.programTag !== undefined && (typeof dt.programTag !== 'string' || dt.programTag.length > 100)) {
        errors.push('defenceTechTakeaway.programTag: invalid type or exceeds 100 chars');
      }
    }
  }

  if (obj.gdLecturettePoints !== undefined) {
    if (!Array.isArray(obj.gdLecturettePoints) || !obj.gdLecturettePoints.every((p) => typeof p === 'string' && p.length <= 500)) {
      errors.push('gdLecturettePoints: invalid array or entry exceeds 500 chars');
    }
  }

  if (obj.potentialInterviewQuestions !== undefined) {
    if (!Array.isArray(obj.potentialInterviewQuestions) || !obj.potentialInterviewQuestions.every((q) => typeof q === 'string' && q.length <= 500)) {
      errors.push('potentialInterviewQuestions: invalid array or entry exceeds 500 chars');
    }
  }

  return errors;
}

export function isValidSSBIntelligence(data: unknown): data is SSBIntelligence {
  return getSSBIntelligenceValidationErrors(data).length === 0;
}

// Bounded retry: one correction attempt after a hard validation failure. Kept to a
// single retry (not a loop) per Rule 5 — this is deterministic control flow, the model
// judgment call already happened in the first Gemini request.
const MAX_GEMINI_ATTEMPTS = 2;

export async function summarizeWithGemini(
  cluster: StoryCluster,
  apiKey: string,
  fetchFn: typeof fetch = globalThis.fetch,
  cache: Map<string, SSBIntelligence> = SUMMARY_MEMORY_CACHE,
  fallbackToMiner = false
): Promise<SSBIntelligence | null> {
  const hash = computeContentHash(cluster.synthesizedHeadline, cluster.primarySource.url);

  // 1. Content-Hash Memory Cache Hit -> Instant $0 return
  const cached = cache.get(hash);
  if (cached) {
    return cached;
  }

  if (!apiKey) {
    return fallbackToMiner ? generateExtractiveSSBIntel(cluster) : null;
  }

  const basePrompt = buildGeminiPrompt(cluster);
  const responseSchema = buildGeminiResponseSchema(cluster.categories.includes('ssb'));
  const modelName = getGeminiModelName();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let lastHardErrors: string[] = [];

  try {
    for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
      // Only throttle the first request per call — a same-call correction retry is a
      // rare, bounded exception to the 15 RPM pacing, not a sustained request pattern.
      if (attempt === 0) {
        await throttleNextRequest();
      }

      const prompt = attempt === 0 ? basePrompt : appendCorrectionFeedback(basePrompt, lastHardErrors);
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.2 }
        })
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('[GEMINI ERROR]', `status=${response.status} body=${bodyText.slice(0, 200)}`);
        return fallbackToMiner ? generateExtractiveSSBIntel(cluster) : null;
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return fallbackToMiner ? generateExtractiveSSBIntel(cluster) : null;

      const parsed = parseGeminiJsonFromText(rawText);
      if (!parsed) {
        lastHardErrors = ['root: unparseable JSON'];
        console.error('[GEMINI VALIDATION REJECTED]', lastHardErrors.join('; '));
        continue;
      }

      const { intel, hardErrors, droppedFields } = sanitizeGeminiSSBIntelligence(parsed);
      if (intel) {
        if (droppedFields.length > 0) {
          console.warn('[GEMINI PARTIAL SALVAGE]', droppedFields.join('; '));
        }
        cache.set(hash, intel);
        return intel;
      }

      lastHardErrors = hardErrors;
      console.error('[GEMINI VALIDATION REJECTED]', hardErrors.join('; '));
    }
  } catch (err) {
    console.error('[GEMINI ERROR]', err instanceof Error ? err.message : String(err));
  }

  return fallbackToMiner ? generateExtractiveSSBIntel(cluster) : null;
}
