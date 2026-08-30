/**
 * Gemini Flash & Heuristic SSB Intelligence Summarizer
 * Generates structured SSB briefs, Techmeme-style takeaways, with SHA-256 content-hash memory.
 * Hard limit: <= 300 LOC.
 */

import * as crypto from 'node:crypto';
import { DomainCategory, SSBIntelligence, StoryCluster } from '../src/types/news.js';

export const SUMMARY_MEMORY_CACHE = new Map<string, SSBIntelligence>();
// Gemini free tier allows 15 requests/minute. A fixed interval must exceed 4000ms
// (60_000 / 15) to guarantee no rolling 60s window ever sees 15+ requests; 4500ms
// gives real margin (~13.3 RPM) so a long enrichment run never gets rate-limited.
export const MIN_REQUEST_INTERVAL_MS = 4500;
let lastRequestTimestamp = 0;

export function resetThrottleState(): void {
  lastRequestTimestamp = 0;
}

export function computeContentHash(headline: string, url: string): string {
  const normalized = `${(headline || '').trim().toLowerCase()}|${(url || '').trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function clearSummaryMemoryCache(): void {
  SUMMARY_MEMORY_CACHE.clear();
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
  const primary = cluster.primarySource;
  const entities = cluster.entities;
  const categories = cluster.categories;
  const primaryEntity = entities[0] || 'Strategic Defence Modernization';

  const categoryNotes: Record<DomainCategory, string> = {
    army: 'Focus on mechanized combat power, northern border logistics, and indigenous firepower.',
    navy: 'Key maritime domain awareness, Indo-Pacific deterrence, and carrier/submarine doctrine.',
    airforce: 'Critical squadron strength modernization, combat avionics, and standoff air deterrence.',
    tech: 'Self-reliance (Atmanirbharta), indigenous R&D lifecycle, and tech transfer milestones.',
    strategic: 'Multi-alignment diplomacy, joint theater command integration, and border posture.',
    procurement: 'Defence Acquisition Procedure (DAP 2020), IDDM category, and capital budget allocation.',
    ssb: 'Analytical assessment of tri-service jointness and operational readiness.'
  };

  const primaryCat = categories[0] || 'strategic';
  const strategicAngle = categoryNotes[primaryCat] || categoryNotes.strategic;

  const intel: SSBIntelligence = {
    whyItMatters: `Directly impacts India's operational readiness and strategic deterrence in the ${primaryCat.toUpperCase()} domain, reflecting contemporary national security doctrine.`,
    strategicAngle,
    defenceTechTakeaway: {
      platformOrSystem: primaryEntity,
      specifications: [
        'Indigenous design & manufacturing validation',
        'Multi-domain network-centric warfare integration',
        'High-altitude / extreme-environment operational envelope'
      ],
      keySignificance: `${primary.sourceName} report highlights critical milestone in operational deployment.`
    }
  };

  // GD/interview-question framing is only useful — and only generated — for clusters
  // editorially tagged as SSB-relevant; every other article gets the lean summary above.
  if (isSSBRelevant(cluster)) {
    intel.gdLecturettePoints = [
      `Self-Reliance vs Rapid Induction: Balancing indigenous timeline with operational urgency for ${primaryEntity}.`,
      `Impact on Joint Theatre Commands and inter-service operational synergy.`,
      `Geopolitical ramifications in the Indian Ocean Region (IOR) and Northern/Western borders.`
    ];
    intel.potentialInterviewQuestions = [
      `What are the operational capabilities and significance of ${primaryEntity} for India's national security?`,
      `How does this development align with the Make in India and Atmanirbhar Bharat defence initiative?`,
      `If you were tasked with tri-service integration for this capability, what primary logistical hurdles would you address?`
    ];
  }

  return intel;
}

export async function summarizeWithGemini(
  cluster: StoryCluster,
  apiKey: string,
  fetchFn: typeof fetch = globalThis.fetch,
  cache: Map<string, SSBIntelligence> = SUMMARY_MEMORY_CACHE
): Promise<SSBIntelligence | null> {
  const hash = computeContentHash(cluster.synthesizedHeadline, cluster.primarySource.url);

  // 1. Content-Hash Memory Cache Hit -> Instant $0 return
  const cached = cache.get(hash);
  if (cached) {
    return cached;
  }

  if (!apiKey) return null;

  const ssbFields = isSSBRelevant(cluster)
    ? `,
  "gdLecturettePoints": ["Point 1 for Group Discussion / Lecturette", "Point 2", "Point 3"],
  "potentialInterviewQuestions": ["Question 1 an Interviewing Officer (IO) might ask", "Question 2", "Question 3"]`
    : '';

  const prompt = `You are a senior defence intelligence analyst covering the Indian Armed Forces.
Analyze this defence news story:
Headline: ${cluster.synthesizedHeadline}
Primary Source: ${cluster.primarySource.sourceName} - ${cluster.primarySource.title}
Snippet: ${cluster.primarySource.snippet || ''}
Entities: ${cluster.entities.join(', ')}

Return a strict JSON object with these exact keys:
{
  "whyItMatters": "1-2 concise sentences on national security significance",
  "strategicAngle": "Strategic perspective on deterrence/doctrine",
  "defenceTechTakeaway": {
    "platformOrSystem": "Platform or system name",
    "specifications": ["Spec 1", "Spec 2", "Spec 3"],
    "keySignificance": "Core military significance"
  }${ssbFields}
}`;

  try {
    // 2. Sequential Throttling
    await throttleNextRequest();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      })
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error('[GEMINI ERROR]', `status=${response.status} body=${bodyText.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as SSBIntelligence;
    if (parsed.whyItMatters) {
      const sanitizedIntel: SSBIntelligence = {
        whyItMatters: parsed.whyItMatters,
        strategicAngle: parsed.strategicAngle,
        defenceTechTakeaway: parsed.defenceTechTakeaway,
        ...(Array.isArray(parsed.gdLecturettePoints) ? { gdLecturettePoints: parsed.gdLecturettePoints } : {}),
        ...(Array.isArray(parsed.potentialInterviewQuestions)
          ? { potentialInterviewQuestions: parsed.potentialInterviewQuestions }
          : {})
      };
      cache.set(hash, sanitizedIntel);
      return sanitizedIntel;
    }
  } catch (err) {
    console.error('[GEMINI ERROR]', err instanceof Error ? err.message : String(err));
  }

  return null;
}
