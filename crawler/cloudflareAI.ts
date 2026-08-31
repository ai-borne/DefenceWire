/**
 * Cloudflare Workers AI Client Adapter
 * Zero-cost edge screening, classification, and summarization fallback.
 * Dynamic model selection via process.env.CF_AI_MODEL (default: @cf/meta/llama-3.2-3b-instruct).
 * Hard limit: <= 300 LOC.
 */

import * as crypto from 'node:crypto';
import { DomainCategory, SSBIntelligence, StoryCluster, StorySourceItem } from '../src/types/news.js';

export const DEFAULT_CF_AI_MODEL = '@cf/meta/llama-3.2-3b-instruct';
export const CF_AI_MEMORY_CACHE = new Map<string, string>();

export interface WorkersAIScreeningResult {
  isMilitaryDefence: boolean;
  confidence: number; // 0.0 - 1.0
  category: DomainCategory;
  strategicSignificance: 'critical' | 'high' | 'medium' | 'routine';
  strategicBonus: number; // 0 to 20
  discoveredEntities: string[];
  actionSignature?: string;
  rationale: string;
}

export function getCloudflareAIModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.CF_AI_MODEL?.trim() || DEFAULT_CF_AI_MODEL;
}

export function computeCFAICacheHash(prefix: string, text: string): string {
  const normalized = `${prefix}|${(text || '').trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function clearCFAIMemoryCache(): void {
  CF_AI_MEMORY_CACHE.clear();
}

export function extractJsonFromText(rawText: string): unknown {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  const jsonMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(cleaned);
  if (jsonMatch?.[1]) {
    cleaned = jsonMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface CloudflareAIOptions {
  accountId?: string;
  apiToken?: string;
  fetchFn?: typeof fetch;
  model?: string;
}

export async function runCloudflareAIInference(
  prompt: string,
  systemPrompt: string,
  options: CloudflareAIOptions = {}
): Promise<string | null> {
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = options.apiToken || process.env.CLOUDFLARE_API_TOKEN || '';
  const fetchFn = options.fetchFn || globalThis.fetch;
  const model = options.model || getCloudflareAIModel();

  if (!accountId || !apiToken) {
    return null;
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[CF AI ERROR]', `status=${response.status} body=${errText.slice(0, 150)}`);
      return null;
    }

    const data = (await response.json()) as {
      result?: { response?: string };
      success?: boolean;
    };

    return data.result?.response || null;
  } catch (err) {
    console.error('[CF AI NETWORK ERROR]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function screenItemWithCloudflareAI(
  item: StorySourceItem,
  options: CloudflareAIOptions = {}
): Promise<WorkersAIScreeningResult | null> {
  const text = `${item.title} ${item.snippet || ''}`.trim();
  const cacheKey = computeCFAICacheHash('screen', text);

  if (CF_AI_MEMORY_CACHE.has(cacheKey)) {
    const cached = CF_AI_MEMORY_CACHE.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as WorkersAIScreeningResult;
    }
  }

  const systemPrompt = `You are a military intelligence analyst screening Indian defence news wire articles.
Evaluate whether the article is strictly relevant to military/defence affairs.
Extract any named defence platforms, missiles, warships, or codenames.
Return a STRICT JSON object only. No markdown fences.
JSON schema:
{
  "isMilitaryDefence": true,
  "confidence": 0.95,
  "category": "airforce"|"navy"|"army"|"tech"|"procurement"|"strategic",
  "strategicSignificance": "critical"|"high"|"medium"|"routine",
  "strategicBonus": 15,
  "discoveredEntities": ["NameOfPlatform"],
  "actionSignature": "trial"|"procurement"|"induction"|"general",
  "rationale": "one sentence rationale"
}`;

  const userPrompt = `Title: ${item.title}\nSnippet: ${item.snippet || ''}\nSource: ${item.sourceName}`;
  const rawResponse = await runCloudflareAIInference(userPrompt, systemPrompt, options);
  if (!rawResponse) return null;

  const parsed = extractJsonFromText(rawResponse) as Partial<WorkersAIScreeningResult> | null;
  if (!parsed || typeof parsed.isMilitaryDefence !== 'boolean') {
    return null;
  }

  const sanitized: WorkersAIScreeningResult = {
    isMilitaryDefence: parsed.isMilitaryDefence,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
    category: (parsed.category as DomainCategory) || 'strategic',
    strategicSignificance: parsed.strategicSignificance || 'medium',
    strategicBonus: Math.min(20, Math.max(0, typeof parsed.strategicBonus === 'number' ? parsed.strategicBonus : 5)),
    discoveredEntities: Array.isArray(parsed.discoveredEntities) ? parsed.discoveredEntities.filter(Boolean) : [],
    actionSignature: parsed.actionSignature || 'general',
    rationale: parsed.rationale || ''
  };

  CF_AI_MEMORY_CACHE.set(cacheKey, JSON.stringify(sanitized));
  return sanitized;
}

export async function summarizeWithCloudflareAI(
  cluster: StoryCluster,
  options: CloudflareAIOptions = {}
): Promise<SSBIntelligence | null> {
  const cacheKey = computeCFAICacheHash('summary', `${cluster.synthesizedHeadline}|${cluster.primarySource.url}`);

  if (CF_AI_MEMORY_CACHE.has(cacheKey)) {
    const cached = CF_AI_MEMORY_CACHE.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SSBIntelligence;
    }
  }

  const systemPrompt = `You are a senior defence analyst. Provide a crisp military intelligence summary.
Return a STRICT JSON object only.
JSON schema:
{
  "whyItMatters": "1-2 sentences on operational and national security significance",
  "strategicAngle": "Strategic deterrence / doctrine angle",
  "defenceTechTakeaway": {
    "platformOrSystem": "Name of system",
    "specifications": ["Spec 1", "Spec 2"],
    "keySignificance": "Core military significance"
  }
}`;

  const userPrompt = `Headline: ${cluster.synthesizedHeadline}\nPrimary Source: ${cluster.primarySource.sourceName}\nEntities: ${cluster.entities.join(', ')}`;
  const rawResponse = await runCloudflareAIInference(userPrompt, systemPrompt, options);
  if (!rawResponse) return null;

  const parsed = extractJsonFromText(rawResponse) as Partial<SSBIntelligence> | null;
  if (!parsed || !parsed.whyItMatters) return null;

  const sanitized: SSBIntelligence = {
    whyItMatters: parsed.whyItMatters,
    strategicAngle: parsed.strategicAngle || '',
    defenceTechTakeaway: parsed.defenceTechTakeaway || {
      platformOrSystem: cluster.entities[0] || 'Strategic Defence Platform',
      specifications: ['Indigenous capability milestone'],
      keySignificance: 'Enhances multi-domain operational deterrence.'
    }
  };

  CF_AI_MEMORY_CACHE.set(cacheKey, JSON.stringify(sanitized));
  return sanitized;
}
