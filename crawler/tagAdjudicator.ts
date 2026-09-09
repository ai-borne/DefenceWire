/**
 * Zero-Cost Tag Adjudication Engine (Tier 3 Cascade)
 * Reconciles deterministic pre-screen (Tier 1) and Gemini counter-check (Tier 2).
 * Dispatches contested/ambiguous acronyms to Cloudflare Workers AI free edge neurons.
 * Hard limit: <= 120 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { calculateClusterEntitySalience } from './entitySalience.js';
import { validateEntityAnchors, hasWordBoundary } from './entityDisambiguator.js';
import { adjudicateContestedTag, CloudflareAIOptions } from './cloudflareAI.js';

export type AdjudicationSource = 'tier1_pre_screen' | 'tier1_tier2_consensus' | 'tier3_cloudflare_ai' | 'deterministic_fallback';

export interface AdjudicationVerdict {
  approved: boolean;
  tag: string;
  source: AdjudicationSource;
  confidence: number;
  salienceScore: number;
  matchedAnchors: string[];
  rationale: string;
}

export interface GeminiCounterCheckInput {
  primaryTag?: string;
  focalEntity?: string;
  operationalTheater?: string;
  hashtags?: string[];
}

export async function adjudicateCandidateTag(
  cluster: StoryCluster,
  candidateTag: string,
  geminiOutput?: GeminiCounterCheckInput,
  options: CloudflareAIOptions = {}
): Promise<AdjudicationVerdict> {
  const tag = candidateTag.startsWith('#') ? candidateTag : `#${candidateTag}`;
  const clean = tag.replace(/^#+/, '').trim();
  const headline = cluster.synthesizedHeadline || cluster.primarySource?.title || '';
  const bodyText = [cluster.primarySource?.snippet || '', ...(cluster.relatedCoverage || []).map((r) => `${r.title} ${r.snippet || ''}`)].join('\n');
  const fullText = `${headline} ${bodyText}`.trim();

  // Tier 1: Deterministic word-boundary check & salience
  const wordBoundaryValid = hasWordBoundary(fullText, clean);
  const anchorResult = validateEntityAnchors(clean, fullText);
  const salience = calculateClusterEntitySalience(cluster, clean);

  // Tier 2 agreement check
  const gPrimary = geminiOutput?.primaryTag ? geminiOutput.primaryTag.replace(/^#+/, '').toUpperCase() : '';
  const cleanUpper = clean.toUpperCase();
  const geminiAgrees =
    gPrimary === cleanUpper ||
    Boolean(geminiOutput?.hashtags?.some((h) => h.replace(/^#+/, '').toUpperCase() === cleanUpper)) ||
    (Boolean(geminiOutput?.focalEntity) && hasWordBoundary(geminiOutput!.focalEntity!, clean)) ||
    (cleanUpper === 'LAC' && Boolean(geminiOutput?.operationalTheater) && /actual control|lac|border|ladakh|arunachal/i.test(geminiOutput!.operationalTheater!));

  // Definite negative: no word boundary at all AND Gemini did not propose it
  if ((!wordBoundaryValid || !anchorResult.hasWordBoundaryMatch) && !geminiAgrees) {
    return {
      approved: false, tag, source: 'tier1_pre_screen', confidence: 1.0, salienceScore: 0.0,
      matchedAnchors: [], rationale: `Entity "${clean}" not present as discrete word boundary in text.`
    };
  }

  // Case 1: Pre-screen and Gemini agree with valid anchors and high salience -> Consensus
  if (geminiAgrees && anchorResult.isValid && salience.isEligibleForPrimaryTag) {
    return {
      approved: true, tag, source: 'tier1_tier2_consensus', confidence: Math.max(0.9, salience.score),
      salienceScore: salience.score, matchedAnchors: anchorResult.matchedAnchors,
      rationale: `Verified via Tier 1/2 consensus (salience=${salience.score}).`
    };
  }

  // Case 2: Contested / Ambiguous -> Dispatch to Tier 3 (Cloudflare Workers AI free edge)
  const isContested =
    geminiAgrees !== (anchorResult.isValid && salience.isEligibleForPrimaryTag) ||
    (!geminiOutput && salience.score >= 0.5) ||
    (cleanUpper === 'LAC' && anchorResult.matchedAnchors.length === 0);

  if (isContested) {
    const cfVerdict = await adjudicateContestedTag(cluster, tag, options);
    if (cfVerdict) {
      const finalApproved = cleanUpper === 'LAC' && anchorResult.matchedAnchors.length === 0 ? false : cfVerdict.approved;
      return {
        approved: finalApproved, tag: cfVerdict.canonicalTag || tag, source: 'tier3_cloudflare_ai',
        confidence: cfVerdict.confidence, salienceScore: salience.score, matchedAnchors: anchorResult.matchedAnchors,
        rationale: cfVerdict.rationale || 'Adjudicated by Cloudflare Workers AI edge model.'
      };
    }
  }

  // Fallback: Deterministic Tier 1 gate
  const fallbackApproved = anchorResult.isValid && salience.isEligibleForPrimaryTag;
  return {
    approved: fallbackApproved, tag, source: isContested ? 'deterministic_fallback' : 'tier1_pre_screen',
    confidence: fallbackApproved ? salience.score : 0.8, salienceScore: salience.score,
    matchedAnchors: anchorResult.matchedAnchors,
    rationale: fallbackApproved
      ? `Approved by deterministic pre-screen (salience=${salience.score}).`
      : (anchorResult.reason || `Insufficient salience score (${salience.score} < 0.60).`)
  };
}
