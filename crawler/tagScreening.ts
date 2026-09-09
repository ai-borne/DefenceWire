/**
 * Tag Screening Orchestration for DefenceWire.in
 * Runs the primaryTag/hashtags/entities of a cluster through the Tier 0-3
 * cascade: Tier 0 is a durable canonical-entity short-circuit (optional
 * resolveCanonical callback, see crawler/canonicalEntityResolver.ts —
 * docs/knowledge_base_issues.md#2), Tiers 1-3 are the pure adjudication
 * cascade in crawler/tagAdjudicator.ts.
 * Hard limit: <= 120 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { adjudicateCandidateTag, GeminiCounterCheckInput } from './tagAdjudicator.js';
import { disambiguateEntity, CONTEXTUAL_ANCHORS } from './entityDisambiguator.js';
import { CloudflareAIOptions } from './cloudflareAI.js';

/**
 * Screens and filters cluster primary tag, hashtags, and entities through the
 * cascade. `resolveCanonical` is checked first (Tier 0): a hit is used
 * directly as the final primaryTag, skipping Tiers 1-3 entirely (including
 * the Tier 3 Cloudflare AI dispatch) for entities already known to the
 * durable canonical-entity table.
 */
export async function screenClusterTags(
  cluster: StoryCluster,
  intel?: GeminiCounterCheckInput,
  options: CloudflareAIOptions = {},
  resolveCanonical?: (candidateTag: string) => string | null
): Promise<void> {
  try {
    let finalPrimaryTag: string | undefined = undefined;
    const canonicalHit = cluster.primaryTag ? resolveCanonical?.(cluster.primaryTag) : undefined;
    if (canonicalHit) {
      finalPrimaryTag = canonicalHit;
    } else {
      if (cluster.primaryTag) {
        const v = await adjudicateCandidateTag(cluster, cluster.primaryTag, intel, options);
        if (v.approved) finalPrimaryTag = v.tag;
      }
      if (!finalPrimaryTag && intel?.primaryTag && intel.primaryTag !== cluster.primaryTag) {
        const v = await adjudicateCandidateTag(cluster, intel.primaryTag, intel, options);
        if (v.approved) finalPrimaryTag = v.tag;
      }
    }
    cluster.primaryTag = finalPrimaryTag;

    const rawTags = new Set([...(cluster.hashtags || []), ...(intel?.hashtags || [])]);
    const approvedTags: string[] = [];
    for (const tag of rawTags) {
      const clean = tag.replace(/^#+/, '').toUpperCase();
      if (clean in CONTEXTUAL_ANCHORS) {
        const v = await adjudicateCandidateTag(cluster, tag, intel, options);
        if (v.approved) approvedTags.push(v.tag);
      } else {
        approvedTags.push(tag);
      }
    }
    cluster.hashtags = approvedTags;

    const fullText = `${cluster.synthesizedHeadline} ${cluster.primarySource?.snippet || ''}`;
    cluster.entities = (cluster.entities || []).filter((ent) => {
      const clean = ent.replace(/^#+/, '').toUpperCase();
      if (clean in CONTEXTUAL_ANCHORS) {
        return disambiguateEntity(clean, fullText);
      }
      return true;
    });
  } catch (err) {
    console.error(`[SCREEN CLUSTER TAGS ERROR] cluster=${cluster.id}:`, err);
  }
}
