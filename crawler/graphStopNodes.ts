/**
 * Graph Stop-Node Filter & Entity Taxonomy (Phase 2)
 * Suppresses non-actionable super-hubs (e.g., "India", "Indian Army", "MoD")
 * to prevent visual clutter and combinatorial hairball explosion in force-graphs.
 * Hard limit: <= 300 LOC.
 */

import { NodeCategory } from '../src/types/graph.js';

/**
 * Normalized stop nodes that represent generic nations, administrative ministries,
 * or top-level service branches that would otherwise link to almost every story.
 */
export const GRAPH_STOP_NODES = new Set<string>([
  'india',
  'indian',
  'bharat',
  'ministry of defence',
  'defence ministry',
  'mod',
  'raksha mantralaya',
  'government of india',
  'govt of india',
  'government',
  'govt',
  'centre',
  'union government',
  'armed forces',
  'indian armed forces',
  'military',
  'defence forces',
  'indian army',
  'army',
  'indian air force',
  'iaf',
  'air force',
  'indian navy',
  'navy',
  'china',
  'pakistan'
]);

/**
 * Normalized stop-node regex patterns for matching variants with punctuation or minor affixes.
 */
const STOP_NODE_PATTERNS: RegExp[] = [
  /^(?:the\s+)?india(?:n)?$/i,
  /^(?:the\s+)?bharat$/i,
  /^(?:the\s+)?ministry\s+of\s+defence$/i,
  /^(?:the\s+)?defence\s+ministry$/i,
  /^(?:the\s+)?mod$/i,
  /^(?:the\s+)?government(?:\s+of\s+india)?$/i,
  /^(?:the\s+)?govt(?:\s+of\s+india)?$/i,
  /^(?:the\s+)?indian\s+armed\s+forces$/i,
  /^(?:the\s+)?armed\s+forces$/i,
  /^(?:the\s+)?indian\s+army$/i,
  /^(?:the\s+)?army$/i,
  /^(?:the\s+)?indian\s+air\s+force$/i,
  /^(?:the\s+)?iaf$/i,
  /^(?:the\s+)?indian\s+navy$/i,
  /^(?:the\s+)?navy$/i
];

export function isGraphStopNode(term: string): boolean {
  if (!term) return true;
  const normalized = term.trim().toLowerCase();
  if (GRAPH_STOP_NODES.has(normalized)) {
    return true;
  }
  return STOP_NODE_PATTERNS.some((p) => p.test(normalized));
}

export function normalizeNodeId(label: string): string {
  if (!label) return 'node_unknown';
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `node_${slug || 'unknown'}`;
}

export interface RecognizedTarget {
  name: string;
  category: NodeCategory;
  pattern: RegExp;
}

export const RECOGNIZED_TARGET_ENTITIES: RecognizedTarget[] = [
  // --- Strategic Geographic Locations & Border Fronts ---
  { name: 'Delhi', category: 'location', pattern: /\b(delhi|new\s+delhi|ncr)\b/i },
  { name: 'Ladakh', category: 'location', pattern: /\b(ladakh|leh|eastern\s+ladakh)\b/i },
  { name: 'LAC', category: 'location', pattern: /\b(lac|line\s+of\s+actual\s+control)\b/i },
  { name: 'LOC', category: 'location', pattern: /\b(loc|line\s+of\s+control)\b/i },
  { name: 'Galwan', category: 'location', pattern: /\bgalwan(\s+valley)?\b/i },
  { name: 'Pangong Tso', category: 'location', pattern: /\bpangong(\s+tso)?\b/i },
  { name: 'Siachen', category: 'location', pattern: /\bsiachen(\s+glacier)?\b/i },
  { name: 'Pokhran', category: 'facility', pattern: /\bpokhran(\s+ranges?)?\b/i },
  { name: 'Chandipur', category: 'facility', pattern: /\b(chandipur|itr\s+chandipur|integrated\s+test\s+range)\b/i },
  { name: 'APJ Abdul Kalam Island', category: 'facility', pattern: /\b(wheeler\s+island|kalam\s+island|apj\s+abdul\s+kalam\s+island)\b/i },
  { name: 'Karwar', category: 'facility', pattern: /\b(karwar|project\s+seabird|ins\s+kadamba)\b/i },
  { name: 'Visakhapatnam', category: 'facility', pattern: /\b(visakhapatnam|vizag|eastern\s+naval\s+command)\b/i },
  { name: 'Red Fort', category: 'facility', pattern: /\bred\s+fort\b/i },
  { name: 'Andaman & Nicobar', category: 'facility', pattern: /\b(andaman|nicobar|anc|port\s+blair)\b/i },
  { name: 'Arunachal Pradesh', category: 'location', pattern: /\b(arunachal(\s+pradesh)?|tawang)\b/i },
  { name: 'Jammu & Kashmir', category: 'location', pattern: /\b(jammu|kashmir|srinagar)\b/i },

  // --- Specific Operational Units & Platforms ---
  { name: 'L-70 Guns', category: 'platform', pattern: /\b(l-?70(\s+air\s+defence\s+guns?|\s+guns?|\s+bofors)?|upgraded\s+l-?70)\b/i },
  { name: 'Zorawar Tank', category: 'platform', pattern: /\bzorawar(\s+light\s+tank)?\b/i },
  { name: 'Tejas Mk1A', category: 'platform', pattern: /\btejas\s*(mk1a|mk-1a|mark\s*1a)?\b/i },
  { name: 'Rafale', category: 'platform', pattern: /\brafale(-m)?\b/i },
  { name: 'S-400 Triumf', category: 'platform', pattern: /\bs-400\b|triumf/i },
  { name: 'BrahMos', category: 'platform', pattern: /\bbrahmos(-ng|-er)?\b/i },
  { name: 'Akash-NG', category: 'platform', pattern: /\bakash(-ng)?\b/i },
  { name: 'Astra BVR', category: 'platform', pattern: /\bastra\s*(mk-?[123]|bvr|missile)?\b/i },
  { name: 'Pinaka MBRL', category: 'platform', pattern: /\bpinaka\s*(mbrl)?\b/i },
  { name: 'MQ-9B Predator', category: 'platform', pattern: /\b(mq-9b|skyguardian|seaguardian|predator\s+drone)\b/i },
  { name: 'INS Vikrant', category: 'platform', pattern: /\bins\s+vikrant\b|iac-1/i },
  { name: 'INS Arihant', category: 'platform', pattern: /\bins\s+arihant\b/i },
  { name: 'Project 75I', category: 'program', pattern: /\b(project\s*75-?i|p-?75i)\b/i },
  { name: 'AMCA', category: 'program', pattern: /\bamca\b|advanced\s+medium\s+combat\s+aircraft/i },

  // --- Threats & Anomalies ---
  { name: 'Drone Infiltration', category: 'threat', pattern: /\b(drone\s+(?:threat|incursion|infiltration|swarm)|hostile\s+drone|unidentified\s+uav)\b/i },
  { name: 'Border Standoff', category: 'threat', pattern: /\b(border\s+standoff|skirmish|transgression|incursion|clash)\b/i }
];

export function inferNodeCategory(label: string): NodeCategory {
  const lower = label.toLowerCase();
  for (const target of RECOGNIZED_TARGET_ENTITIES) {
    if (target.pattern.test(lower)) {
      return target.category;
    }
  }

  if (/(?:tank|gun|missile|radar|fighter|aircraft|uav|drone|frigate|destroyer|submarine|carrier|corvette)/i.test(lower)) {
    return 'platform';
  }
  if (/(?:island|range|base|command|yard|port|fort|itr)/i.test(lower)) {
    return 'facility';
  }
  if (/(?:valley|sector|border|glacier|lac|loc|ladakh|delhi|kashmir|arunachal)/i.test(lower)) {
    return 'location';
  }
  if (/(?:threat|incursion|infiltration|clash|attack|skirmish|anomal)/i.test(lower)) {
    return 'threat';
  }
  if (/(?:drdo|hal|bel|bdl|mdl|l&t|tata|adani|mod|army|navy|air force|iaf)/i.test(lower)) {
    return 'organization';
  }
  if (/(?:project|program|mission|amca)/i.test(lower)) {
    return 'program';
  }

  return 'platform';
}
