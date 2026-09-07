/**
 * Emergent Pattern & Hypothesis Synthesizer (Phase 5)
 * Dual-engine generation (Gemini Flash -> Cloudflare AI -> Local Heuristic)
 * drafts crisp, 2-sentence situational assessments and hypotheses.
 * Hard limit: <= 300 LOC.
 */

import { EmergentPattern, PatternCandidate } from '../src/types/patterns.js';
import { getGeminiModelName } from './summarizer.js';
import { getCloudflareAIModel } from './cloudflareAI.js';

export interface PatternSynthesizerOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
  now?: Date | (() => Date);
  env?: NodeJS.ProcessEnv;
}

export function buildPatternPrompt(candidate: PatternCandidate): string {
  const headlinesList = candidate.clusterHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n');
  const entities = candidate.sharedEntities.join(', ');

  return `You are a strategic military intelligence analyst for DefenceWire.
Analyze these ${candidate.clusterIds.length} co-occurring defence signals observed within a ${candidate.timeWindowHours}-hour window:

Observed Signals:
${headlinesList}

Key Entities & Strategic Anchors:
${entities}

Task:
Produce a concise, institutional situational intelligence brief formatted strictly as JSON:
{
  "title": "A crisp, authoritative title under 60 characters",
  "synthesis": "Exactly two sentences. Sentence 1: Detail the observed operational convergence or multi-axis movements across signals. Sentence 2: Provide the forward-looking strategic hypothesis or tactical assessment (e.g. indicates activation of a coordinated air defence grid)."
}`;
}

export function parsePatternSynthesisResponse(
  rawText: string
): { title: string; synthesis: string } | null {
  if (!rawText) return null;
  let text = rawText.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(text) as { title?: unknown; synthesis?: unknown };
    if (typeof parsed.synthesis === 'string' && parsed.synthesis.trim().length > 10) {
      const title = typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : '';
      return {
        title,
        synthesis: parsed.synthesis.trim()
      };
    }
  } catch {
    // Fallback: match synthesis regex
    const synthMatch = /"synthesis"\s*:\s*"([^"]+)"/.exec(text);
    const titleMatch = /"title"\s*:\s*"([^"]+)"/.exec(text);
    if (synthMatch && synthMatch[1]) {
      return {
        title: titleMatch?.[1] || '',
        synthesis: synthMatch[1].trim()
      };
    }
  }

  return null;
}

/**
 * Deterministic local heuristic synthesis fallback.
 * Generates an authoritative 2-sentence situational assessment without network/AI dependencies.
 */
export function generateHeuristicPatternSynthesis(
  candidate: PatternCandidate
): { title: string; synthesis: string } {
  const primaryAnchor = candidate.sharedEntities[0] || 'forward theaters';
  const secondaryAssets = candidate.sharedEntities.slice(1, 3).join(' and ') || 'specialized air and border units';

  const sentence1 = `Multi-axis activity observed across ${primaryAnchor} involving ${secondaryAssets} within an active ${candidate.timeWindowHours}-hour operational window.`;
  const sentence2 = `Signals suggest coordinated deployment and tactical alignment corresponding to heightened ${candidate.title.toLowerCase()} readiness.`;

  return {
    title: candidate.title,
    synthesis: `${sentence1} ${sentence2}`
  };
}

async function synthesizeWithGemini(
  candidate: PatternCandidate,
  apiKey: string,
  fetchFn: typeof fetch,
  env: NodeJS.ProcessEnv
): Promise<{ title: string; synthesis: string } | null> {
  const model = getGeminiModelName(env);
  const prompt = buildPatternPrompt(candidate);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw ? parsePatternSynthesisResponse(raw) : null;
  } catch {
    return null;
  }
}

async function synthesizeWithCloudflareAI(
  candidate: PatternCandidate,
  fetchFn: typeof fetch,
  env: NodeJS.ProcessEnv
): Promise<{ title: string; synthesis: string } | null> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const model = getCloudflareAIModel(env);
  const prompt = buildPatternPrompt(candidate);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a military intelligence analyst. Output strict JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200
      })
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { response?: string } };
    const raw = data.result?.response;
    return raw ? parsePatternSynthesisResponse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Synthesizes situational hypothesis using dual-engine cascade with heuristic fallback.
 */
export async function synthesizeEmergentPattern(
  candidate: PatternCandidate,
  options: PatternSynthesizerOptions = {}
): Promise<EmergentPattern> {
  const env = options.env ?? process.env;
  const apiKey = options.apiKey ?? env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? '';
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const now = options.now ? (typeof options.now === 'function' ? options.now() : options.now) : new Date();

  let generated: { title: string; synthesis: string } | null = null;

  // 1. Primary: Gemini Flash
  if (apiKey) {
    generated = await synthesizeWithGemini(candidate, apiKey, fetchFn, env);
  }

  // 2. Secondary: Cloudflare Workers AI
  if (!generated) {
    generated = await synthesizeWithCloudflareAI(candidate, fetchFn, env);
  }

  // 3. Fallback: Local Deterministic NLP Heuristic
  if (!generated) {
    generated = generateHeuristicPatternSynthesis(candidate);
  }

  const finalTitle = generated.title || candidate.title;

  return {
    id: candidate.id,
    title: finalTitle,
    synthesis: generated.synthesis,
    confidence: candidate.confidence,
    nodeIds: candidate.nodeIds,
    clusterIds: candidate.clusterIds,
    status: 'draft',
    createdAt: now.toISOString(),
    reviewedAt: null,
    reviewedBy: null
  };
}
