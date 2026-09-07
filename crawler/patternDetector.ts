/**
 * Emergent Pattern Detector (Phase 5)
 * Graph community density & spatiotemporal clustering algorithm.
 * Detects cross-track convergence (e.g. Delhi Drone + Red Fort Sanitization + L-70 AD Deployment)
 * across independent news clusters within a rolling time window.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { PatternCandidate } from '../src/types/patterns.js';
import {
  RECOGNIZED_TARGET_ENTITIES,
  inferNodeCategory,
  normalizeNodeId,
  isGraphStopNode
} from './graphStopNodes.js';

export interface PatternDetectorOptions {
  windowHours?: number;
  minClusters?: number;
  now?: Date | (() => Date);
}

interface ExtractedAnchors {
  cluster: StoryCluster;
  publishedTime: number;
  geoAnchors: string[];
  tacticalAnchors: string[];
  allNodes: string[];
}

const TACTICAL_THREAT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Drone Infiltration & Counter-UAS', pattern: /\b(drone|counter-?uas|anti-?drone|uav|quadcopter)\b/i },
  { name: 'Air Defence Grid Activation', pattern: /\b(air\s+defence|ad\s+guns?|l-?70|s-400|akash|surface-to-air|sam)\b/i },
  { name: 'VIP & Facility Sanitization', pattern: /\b(sanitiz(?:ation|ed)|security\s+grid|red\s+fort|republic\s+day|high\s+alert)\b/i },
  { name: 'Border Standoff & Incursion', pattern: /\b(standoff|transgression|incursion|lac|loc|clash|skirmish)\b/i },
  { name: 'Electronic Warfare & Radar Tracking', pattern: /\b(electronic\s+warfare|jamming|radar\s+tracking|surveillance|sigint)\b/i },
  { name: 'Strategic Deterrence & Test', pattern: /\b(test-?fire|missile\s+test|strategic\s+patrol|nuclear\s+triad|canister)\b/i }
];

function extractClusterAnchors(cluster: StoryCluster): ExtractedAnchors {
  const text = `${cluster.synthesizedHeadline} ${cluster.primarySource.snippet || ''} ${cluster.primarySource.title || ''}`;
  const geoSet = new Set<string>();
  const tacticalSet = new Set<string>();
  const allNodesSet = new Set<string>();

  // 1. Entities in cluster
  for (const ent of cluster.entities || []) {
    if (!ent || isGraphStopNode(ent)) continue;
    const cat = inferNodeCategory(ent);
    if (cat === 'location' || cat === 'facility') {
      geoSet.add(ent);
    } else if (cat === 'threat' || cat === 'platform') {
      tacticalSet.add(ent);
    }
    allNodesSet.add(normalizeNodeId(ent));
  }

  // 2. Recognized target entities from knowledge graph
  for (const target of RECOGNIZED_TARGET_ENTITIES) {
    if (target.pattern.test(text)) {
      if (target.category === 'location' || target.category === 'facility') {
        geoSet.add(target.name);
      } else if (target.category === 'threat' || target.category === 'platform') {
        tacticalSet.add(target.name);
      }
      allNodesSet.add(normalizeNodeId(target.name));
    }
  }

  // 3. Tactical threat & operational motifs
  for (const motif of TACTICAL_THREAT_PATTERNS) {
    if (motif.pattern.test(text)) {
      tacticalSet.add(motif.name);
      allNodesSet.add(normalizeNodeId(motif.name));
    }
  }

  const publishedTime = new Date(cluster.primarySource.publishedAt).getTime();

  return {
    cluster,
    publishedTime: isNaN(publishedTime) ? Date.now() : publishedTime,
    geoAnchors: Array.from(geoSet),
    tacticalAnchors: Array.from(tacticalSet),
    allNodes: Array.from(allNodesSet)
  };
}

function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Detects emergent pattern candidates from a list of story clusters.
 */
export function detectEmergentPatterns(
  clusters: StoryCluster[],
  options: PatternDetectorOptions = {}
): PatternCandidate[] {
  const windowHours = options.windowHours ?? 72;
  const minClusters = options.minClusters ?? 3;
  const windowMs = windowHours * 60 * 60 * 1000;

  if (clusters.length < minClusters) {
    return [];
  }

  const extracted = clusters.map(extractClusterAnchors);
  const candidates: PatternCandidate[] = [];
  const seenCandidateKeys = new Set<string>();

  // Group pairs of (geoAnchor, tacticalAnchor) or dense tactical co-occurrence
  const anchorGroups = new Map<string, ExtractedAnchors[]>();

  for (const item of extracted) {
    if (item.tacticalAnchors.length > 0) {
      for (const geo of item.geoAnchors) {
        for (const tac of item.tacticalAnchors) {
          const key = `${geo}::${tac}`;
          const group = anchorGroups.get(key) || [];
          group.push(item);
          anchorGroups.set(key, group);
        }

        // Multi-axis theater convergence across different tactical tracks in same region
        const geoKey = `${geo}::THEATER_CONVERGENCE`;
        const geoGroup = anchorGroups.get(geoKey) || [];
        geoGroup.push(item);
        anchorGroups.set(geoKey, geoGroup);
      }
    }
  }

  for (const [key, items] of anchorGroups.entries()) {
    if (items.length < minClusters) continue;

    const [geoAnchor, tacticalAnchor] = key.split('::') as [string, string];

    // Sort items chronologically
    const sorted = [...items].sort((a, b) => a.publishedTime - b.publishedTime);

    // Sliding window check: check if at least minClusters fit in windowMs
    for (let i = 0; i <= sorted.length - minClusters; i++) {
      const windowItems = sorted.slice(i);
      const startTime = windowItems[0]?.publishedTime ?? 0;

      const clusterBatch = windowItems.filter(
        (it) => it.publishedTime - startTime <= windowMs
      );

      // Distinct cluster IDs check
      const uniqueClustersMap = new Map<string, ExtractedAnchors>();
      for (const it of clusterBatch) {
        uniqueClustersMap.set(it.cluster.id, it);
      }

      if (uniqueClustersMap.size >= minClusters) {
        const uniqueItems = Array.from(uniqueClustersMap.values());
        const isConvergence = tacticalAnchor === 'THEATER_CONVERGENCE';
        const candidateId = isConvergence
          ? `pat_${normalizeSlug(geoAnchor)}_convergence`
          : `pat_${normalizeSlug(geoAnchor)}_${normalizeSlug(tacticalAnchor)}`;

        if (seenCandidateKeys.has(candidateId)) continue;
        seenCandidateKeys.add(candidateId);

        // Collect shared entities and nodes
        const nodeSet = new Set<string>();
        const sharedEntSet = new Set<string>([geoAnchor]);
        if (!isConvergence) sharedEntSet.add(tacticalAnchor);
        const domainSet = new Set<string>();

        for (const u of uniqueItems) {
          u.allNodes.forEach((n) => nodeSet.add(n));
          u.cluster.entities.forEach((e) => {
            if (!isGraphStopNode(e)) sharedEntSet.add(e);
          });
          if (u.cluster.primarySource.sourceDomain) {
            domainSet.add(u.cluster.primarySource.sourceDomain);
          }
        }

        // Confidence calculation
        // Base: 0.55 + cluster bonus + domain bonus
        const clusterBonus = Math.min(0.25, (uniqueItems.length - 2) * 0.08);
        const domainBonus = domainSet.size >= 2 ? 0.1 : 0.05;
        const confidence = Math.min(0.95, Number((0.55 + clusterBonus + domainBonus).toFixed(2)));

        const title = isConvergence
          ? `${geoAnchor} Tactical & Strategic Convergence`
          : `${geoAnchor} ${tacticalAnchor} Convergence`;

        candidates.push({
          id: candidateId,
          title,
          nodeIds: Array.from(nodeSet),
          clusterIds: uniqueItems.map((u) => u.cluster.id),
          confidence,
          anchorCategory: inferNodeCategory(tacticalAnchor) || 'strategic',
          timeWindowHours: windowHours,
          sharedEntities: Array.from(sharedEntSet).slice(0, 8),
          clusterHeadlines: uniqueItems.map((u) => u.cluster.synthesizedHeadline)
        });
      }
    }
  }

  return candidates;
}
