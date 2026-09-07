/**
 * Semantic Triplet & Knowledge Graph Extractor (Phase 2)
 * Deterministically extracts [Subject] -> [Predicate] -> [Object] relational edges
 * with temporal timestamps and epistemic truth states from defence clusters.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import {
  EpistemicState,
  GraphEdge,
  GraphNode,
  PredicateType,
  TripletExtractionResult
} from '../src/types/graph.js';
import {
  inferNodeCategory,
  isGraphStopNode,
  normalizeNodeId,
  RECOGNIZED_TARGET_ENTITIES
} from './graphStopNodes.js';

interface CandidateEntity {
  name: string;
  isStopNode: boolean;
}

/**
 * Detects epistemic truth state from contextual clues in headlines and text.
 */
export function detectEpistemicState(text: string): EpistemicState {
  if (/\b(retract(?:s|ed|ing|ion)|walks?\s+back|erroneous\s+report|withdrawn)\b/i.test(text)) {
    return 'RETRACTED';
  }
  if (/\b(deni(?:es|ed)|refut(?:es|ed)|disput(?:es|ed|ing)|false\s+claim|clarif(?:ies|ied)\s+fake)\b/i.test(text)) {
    return 'DISPUTED';
  }
  if (/\b(supersed(?:es|ed|ing)|replac(?:es|ed|ing)|revis(?:es|ed)|updat(?:es|ed)\s+earlier\s+order)\b/i.test(text)) {
    return 'SUPERSEDED';
  }
  if (/\b(unconfirmed|conflicting\s+reports|differing\s+claims|unverified|claimed|speculat(?:ion|ed))\b/i.test(text)) {
    return 'CONTESTED';
  }
  return 'CONFIRMED';
}

/**
 * Scans cluster text to identify recognized sovereign entities and stop-nodes.
 */
function findCandidateEntities(cluster: StoryCluster): CandidateEntity[] {
  const text = `${cluster.synthesizedHeadline} ${cluster.primarySource.snippet || ''} ${cluster.primarySource.title || ''}`;
  const candidates = new Map<string, CandidateEntity>();

  // 1. Entities from the cluster's military extraction
  for (const ent of cluster.entities) {
    if (!ent) continue;
    candidates.set(ent.toLowerCase(), {
      name: ent,
      isStopNode: isGraphStopNode(ent)
    });
  }

  // 2. Recognized target entities (locations, platforms, threats, facilities)
  for (const target of RECOGNIZED_TARGET_ENTITIES) {
    if (target.pattern.test(text)) {
      candidates.set(target.name.toLowerCase(), {
        name: target.name,
        isStopNode: isGraphStopNode(target.name)
      });
    }
  }

  return Array.from(candidates.values());
}

/**
 * Deterministically infers edge predicate and direction between two entities.
 */
function inferPredicateAndDirection(
  entityA: CandidateEntity,
  entityB: CandidateEntity,
  text: string
): { source: string; target: string; predicate: PredicateType } | null {
  const catA = inferNodeCategory(entityA.name);
  const catB = inferNodeCategory(entityB.name);

  // Deployment pattern: platform -> location/facility
  const hasDeployAction = /\b(deploy(?:s|ed|ing|ment)?|station(?:s|ed|ing)?|position(?:s|ed|ing)?|moved\s+to)\b/i.test(text);
  if (hasDeployAction) {
    if (catA === 'platform' && (catB === 'location' || catB === 'facility')) {
      return { source: entityA.name, target: entityB.name, predicate: 'DEPLOYED_TO' };
    }
    if (catB === 'platform' && (catA === 'location' || catA === 'facility')) {
      return { source: entityB.name, target: entityA.name, predicate: 'DEPLOYED_TO' };
    }
  }

  // Testing pattern: platform -> facility/location
  const hasTestAction = /\b(flight\s+tests?|test-?fires?|test-?firing|trials?|tested|sea\s+trials?|validat(?:es|ed))\b/i.test(text);
  if (hasTestAction) {
    if (catA === 'platform' && (catB === 'facility' || catB === 'location')) {
      return { source: entityA.name, target: entityB.name, predicate: 'TESTED_AT' };
    }
    if (catB === 'platform' && (catA === 'facility' || catA === 'location')) {
      return { source: entityB.name, target: entityA.name, predicate: 'TESTED_AT' };
    }
  }

  // Threat neutralization pattern: platform -> threat
  const hasTargetAction = /\b(intercept(?:s|ed|ing)?|shoot(?:s)?\s+down|counter(?:s|ing)?|neutrali[sz](?:es|ed|ing)?|track(?:s|ed|ing)?)\b/i.test(text);
  if (hasTargetAction) {
    if (catA === 'platform' && catB === 'threat') {
      return { source: entityA.name, target: entityB.name, predicate: 'TARGETS' };
    }
    if (catB === 'platform' && catA === 'threat') {
      return { source: entityB.name, target: entityA.name, predicate: 'TARGETS' };
    }
  }

  // Procurement pattern: organization -> platform OR platform -> organization
  const hasProcureAction = /\b(procure(?:s|d|ment)?|order(?:s|ed)?|deal|contract|aon|dac|acquire(?:s|d)?)\b/i.test(text);
  if (hasProcureAction) {
    if (catA === 'organization' && catB === 'platform') {
      return { source: entityA.name, target: entityB.name, predicate: 'PROCURES' };
    }
    if (catB === 'organization' && catA === 'platform') {
      return { source: entityB.name, target: entityA.name, predicate: 'PROCURES' };
    }
    if (catA === 'platform' && catB === 'organization') {
      return { source: entityB.name, target: entityA.name, predicate: 'SUPPLIES' };
    }
  }

  // Co-occurrence link between distinct platforms, programs, or locations
  if (catA === 'platform' && catB === 'program') {
    return { source: entityA.name, target: entityB.name, predicate: 'CONNECTED_TO' };
  }
  if (catB === 'platform' && catA === 'program') {
    return { source: entityB.name, target: entityA.name, predicate: 'CONNECTED_TO' };
  }

  // General connected link between complementary non-stop entities
  if (catA !== catB || (catA === 'platform' && catB === 'platform')) {
    return { source: entityA.name, target: entityB.name, predicate: 'CONNECTED_TO' };
  }

  return null;
}

/**
 * Extracts epistemic triplets from a list of story clusters.
 */
export function extractTripletsFromClusters(clusters: StoryCluster[]): TripletExtractionResult {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  let suppressedCount = 0;

  for (const cluster of clusters) {
    const text = `${cluster.synthesizedHeadline} ${cluster.primarySource.snippet || ''} ${cluster.primarySource.title || ''}`;
    const epistemicState = detectEpistemicState(text);
    const candidates = findCandidateEntities(cluster);
    const validCandidates = candidates.filter((c) => {
      if (c.isStopNode) {
        suppressedCount++;
        return false;
      }
      return true;
    });

    const timestamp = cluster.primarySource.publishedAt || cluster.createdAt || new Date().toISOString();

    // Register active nodes
    for (const c of validCandidates) {
      const id = normalizeNodeId(c.name);
      const existing = nodeMap.get(id);
      if (existing) {
        existing.mentionCount++;
        existing.lastSeenAt = timestamp > existing.lastSeenAt ? timestamp : existing.lastSeenAt;
      } else {
        nodeMap.set(id, {
          id,
          label: c.name,
          category: inferNodeCategory(c.name),
          mentionCount: 1,
          degree: 0,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp
        });
      }
    }

    // Extract relational edges across pairwise valid candidates
    for (let i = 0; i < validCandidates.length; i++) {
      for (let j = i + 1; j < validCandidates.length; j++) {
        const c1 = validCandidates[i]!;
        const c2 = validCandidates[j]!;

        const relation = inferPredicateAndDirection(c1, c2, text);
        if (!relation) continue;

        const sourceId = normalizeNodeId(relation.source);
        const targetId = normalizeNodeId(relation.target);
        if (sourceId === targetId) continue;

        const edgeId = `edge_${sourceId}_${relation.predicate}_${targetId}`;
        const existingEdge = edgeMap.get(edgeId);

        if (existingEdge) {
          existingEdge.weight += 1.0;
          existingEdge.lastObservedAt = timestamp > existingEdge.lastObservedAt ? timestamp : existingEdge.lastObservedAt;
          existingEdge.epistemicState = epistemicState;
          existingEdge.contextSnippet = cluster.synthesizedHeadline;
        } else {
          edgeMap.set(edgeId, {
            id: edgeId,
            sourceId,
            targetId,
            predicate: relation.predicate,
            epistemicState,
            weight: 1.0,
            clusterId: cluster.id,
            firstObservedAt: timestamp,
            lastObservedAt: timestamp,
            sourceUrl: cluster.primarySource.url,
            contextSnippet: cluster.synthesizedHeadline
          });
        }
      }
    }
  }

  // Update node degrees based on extracted edges
  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  for (const edge of edges) {
    const s = nodeMap.get(edge.sourceId);
    if (s) s.degree++;
    const t = nodeMap.get(edge.targetId);
    if (t) t.degree++;
  }

  return {
    nodes,
    edges,
    extractedCount: edges.length,
    suppressedCount
  };
}
