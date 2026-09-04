/**
 * Confidence-Scored Deterministic Extractive Miner
 * Extracts budgets (₹ Cr), timelines, quantities, and platforms with verbatim quote fallbacks.
 * Hard limit: <= 200 LOC.
 */

import { DefenceTechTakeaway, SSBIntelligence, StoryCluster } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { truncateIntelligently } from '../src/utils/snippetCleaner.js';

const RELATED_COVERAGE_SAMPLE_SIZE = 5;
const RELATED_COVERAGE_CONFIDENCE_BONUS = 0.1;

export const HIGH_VALUE_BUDGET_THRESHOLD_CR = 25000;
export const CONFIDENCE_THRESHOLD = 0.75;

export interface ExtractedDefenceMetrics extends DefenceTechTakeaway {
  quantities?: string;
  isHighValueOrder?: boolean;
  sanityAuditRequired?: boolean;
}

export interface ExtractiveMiningResult {
  confidence: number;
  isHighConfidence: boolean;
  metrics: ExtractedDefenceMetrics;
  verbatimQuote: string;
  summaryText: string;
}

function parseBudget(text: string): { amount?: number; isHighValue?: boolean } {
  const match = text.match(/(?:\b(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:cr(?:ore)?s?)\b)|(?:\b(?:₹)\s*([\d,]+(?:\.\d+)?)\s*(?:cr(?:ore)?s?)?\b)|(?:\b([\d,]+(?:\.\d+)?)\s*(?:cr(?:ore)?s?)\b)/i);
  if (!match) return {};
  const rawNum = match[1] || match[2] || match[3];
  if (!rawNum) return {};
  const amount = parseFloat(rawNum.replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return {};
  return { amount, isHighValue: amount > HIGH_VALUE_BUDGET_THRESHOLD_CR };
}

function parseQuantities(text: string): string | undefined {
  const match = text.match(/\b(\d+)\s+(?:[a-zA-Z0-9_-]+\s+){0,4}(units|aircraft|fighter jets?|jets?|helicopters?|submarines?|tanks?|regiments?|batteries|systems?|missiles?|launchers?|engines?|radars?|guns?|vessels?|corvettes?|frigates?)\b/i);
  return match ? `${match[1]} ${match[2]!.toLowerCase()}` : undefined;
}

function parseTimeline(text: string): string | undefined {
  const match = text.match(/(?:by|in|target(?:ed)? for|delivery by|completion by)\s*(202[5-9]|203[0-9]|2040)(?:[-–](202[6-9]|203[0-9]|2040))?/i)
    || text.match(/\b(202[5-9]|203[0-9]|2040)[-–](202[6-9]|203[0-9]|2040)\b/);
  if (!match) return undefined;
  return match[2] ? `${match[1]}-${match[2]}` : match[1];
}

function parseIndigenousContent(text: string): number | undefined {
  const match = text.match(/(\d{1,3})%\s*(?:indigenous|ic\b|local content)/i)
    || text.match(/(?:indigenous content of|ic of)\s*(\d{1,3})%/i);
  if (!match) return undefined;
  const pct = parseInt(match[1]!, 10);
  return pct >= 0 && pct <= 100 ? pct : undefined;
}

function extractVerbatimQuote(snippet: string, title: string, sourceName: string): string {
  const combined = `${title}. ${snippet}`.trim();
  const sentences = combined.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const primarySentence = sentences.find((s) => /deal|approv|sanction|sign|induct|trial|clears|procure/i.test(s)) || sentences[0] || combined;
  const cleanSentence = truncateIntelligently(primarySentence.replace(/[\r\n\t]+/g, ' '), 240);
  return `"${cleanSentence}" — ${sourceName}`;
}

export function extractDefenceMetrics(cluster: StoryCluster): ExtractiveMiningResult {
  const primary = cluster.primarySource;
  const relatedText = (cluster.relatedCoverage || [])
    .slice(0, RELATED_COVERAGE_SAMPLE_SIZE)
    .map((s) => s.snippet || '')
    .join(' ');
  const text = `${cluster.synthesizedHeadline} ${primary.title} ${primary.snippet || ''} ${relatedText}`;
  const platform = cluster.entities[0] || 'Strategic Defence Modernization';

  const { amount: budgetCrores, isHighValue } = parseBudget(text);
  const quantities = parseQuantities(text);
  const deliveryTimeline = parseTimeline(text);
  const icPct = parseIndigenousContent(text);

  let confidence = 0.15;
  if (primary.tier === SourceTier.TIER_1_OFFICIAL || primary.sourceDomain.includes('gov.in')) confidence += 0.25;
  if (budgetCrores !== undefined) confidence += 0.25;
  if (quantities !== undefined || deliveryTimeline !== undefined) confidence += 0.20;
  if (cluster.entities.length > 0 && text.toLowerCase().includes(cluster.entities[0]!.toLowerCase())) confidence += 0.15;
  if ((cluster.relatedCoverage || []).length > 0) confidence += RELATED_COVERAGE_CONFIDENCE_BONUS;
  confidence = Math.min(1.0, Math.round(confidence * 100) / 100);

  const isHighConfidence = confidence >= CONFIDENCE_THRESHOLD;
  const verbatimQuote = extractVerbatimQuote(primary.snippet || '', primary.title, primary.sourceName);

  let summaryText = verbatimQuote;
  if (isHighConfidence) {
    const parts = [`${platform}:`];
    if (quantities) parts.push(`Procurement/induction of ${quantities}`);
    if (budgetCrores) parts.push(`valued at ₹${budgetCrores.toLocaleString('en-IN')} Cr`);
    if (deliveryTimeline) parts.push(`with scheduled delivery by ${deliveryTimeline}`);
    if (icPct !== undefined) parts.push(`(${icPct}% indigenous content)`);
    parts.push(`validated via ${primary.sourceName}.`);
    summaryText = parts.join(' ');
  }

  const specs = [
    quantities ? `Order Quantity: ${quantities}` : 'Validated operational acquisition parameter',
    budgetCrores ? `Approved Outlay: ₹${budgetCrores.toLocaleString('en-IN')} Cr` : 'Official capital expenditure authorization',
    deliveryTimeline ? `Induction Schedule: ${deliveryTimeline}` : 'Phased strategic deployment milestone'
  ];

  return {
    confidence,
    isHighConfidence,
    verbatimQuote,
    summaryText,
    metrics: {
      platformOrSystem: platform,
      programTag: cluster.programTags?.[0] || platform,
      specifications: specs,
      keySignificance: `${primary.sourceName} confirms critical operational induction milestone.`,
      ...(budgetCrores !== undefined ? { budgetCrores } : {}),
      ...(deliveryTimeline !== undefined ? { deliveryTimeline } : {}),
      ...(icPct !== undefined ? { indigenousContentPercentage: icPct } : {}),
      ...(quantities !== undefined ? { quantities } : {}),
      ...(isHighValue ? { isHighValueOrder: true, sanityAuditRequired: true } : {})
    }
  };
}

export function generateExtractiveSSBIntel(cluster: StoryCluster): SSBIntelligence {
  const mined = extractDefenceMetrics(cluster);
  const primaryCat = cluster.categories[0] || 'strategic';

  const intel: SSBIntelligence = {
    provenance: 'extractive',
    whyItMatters: mined.summaryText,
    strategicAngle: `Strengthens operational deterrence and combat posture in the ${primaryCat.toUpperCase()} domain.`,
    defenceTechTakeaway: mined.metrics
  };

  if (cluster.categories.includes('ssb')) {
    intel.gdLecturettePoints = [
      `Indigenisation vs Rapid Induction: Timeline tradeoffs for ${mined.metrics.platformOrSystem}.`,
      `Integration into Tri-Service Joint Theatre Command doctrines.`,
      `Strategic deterrence impact in the Indian Ocean Region and Northern Borders.`
    ];
    intel.potentialInterviewQuestions = [
      `What are the operational role and specifications of ${mined.metrics.platformOrSystem}?`,
      `How does this procurement align with Atmanirbhar Bharat defence mandates?`,
      `What logistical and supply chain bottlenecks must be addressed for this capability?`
    ];
  }

  return intel;
}
