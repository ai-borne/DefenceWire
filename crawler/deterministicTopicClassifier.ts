/** Registry-only topic recognition. This module deliberately has no model or D1 dependency. */
import { createHash } from 'node:crypto';
import { TopicAliasRecord, TopicAssignmentRole, TopicRecord, TopicRegistrySnapshot } from '../src/types/topics.js';

export const CLASSIFIER_VERSION = 'hybrid-topic-v1';
export const ASSIGNMENT_POLICY_VERSION = 'semantic-shadow-v1';

export interface ClassifiedMention {
  topicId: string; role: TopicAssignmentRole; confidence: number;
  evidenceStart: number; evidenceEnd: number; evidenceContentHash: string;
  mentionKind: 'exact' | 'contextual' | 'implication';
}

export interface TopicCandidate { name: string; evidenceStart: number; evidenceEnd: number; evidenceContentHash: string; }

export interface ClassificationResult { mentions: ClassifiedMention[]; candidates: TopicCandidate[]; fingerprint: string; }

export function classifyTopicText(text: string, registry: TopicRegistrySnapshot): ClassificationResult {
  const fingerprint = contentFingerprint(text);
  const topics = new Map(registry.topics.map((topic) => [topic.id, topic]));
  const mentions = registry.aliases.flatMap((alias) => matchAlias(text, alias, topics.get(alias.topicId), fingerprint))
    .filter((mention) => !isIncidental(text, mention.evidenceStart));
  const unique = new Map<string, ClassifiedMention>();
  for (const mention of mentions) {
    const key = `${mention.topicId}:${mention.evidenceStart}:${mention.evidenceEnd}`;
    if (!unique.has(key)) unique.set(key, mention);
  }
  const direct = [...unique.values()];
  return { mentions: applyImplications(direct, registry, text).sort(sortMentions), candidates: extractCandidates(text, fingerprint), fingerprint };
}

export function contentFingerprint(text: string): string {
  return createHash('sha256').update(normalize(text)).digest('hex');
}

export function aggregateClusterMentions(mentions: ClassifiedMention[]): ClassifiedMention[] {
  const best = new Map<string, ClassifiedMention>();
  for (const mention of mentions) {
    const current = best.get(mention.topicId);
    if (!current || mention.confidence > current.confidence) best.set(mention.topicId, mention);
  }
  return [...best.values()].sort((a, b) => a.topicId.localeCompare(b.topicId));
}

function matchAlias(text: string, alias: TopicAliasRecord, topic: TopicRecord | undefined, hash: string): ClassifiedMention[] {
  if (!topic || alias.verificationState === 'rejected' || !contextAllows(text, alias)) return [];
  const expression = aliasPattern(alias.normalizedAlias);
  const searchable = toSearchableText(text);
  const matches: ClassifiedMention[] = [];
  for (const match of searchable.value.matchAll(expression)) {
    const value = match[0]; const index = match.index ?? 0;
    const start = searchable.starts[index] ?? 0;
    const end = searchable.ends[index + value.length - 1] ?? start + value.length;
    matches.push({ topicId: topic.id, role: roleFor(topic, text, start), confidence: 0.95,
      evidenceStart: start, evidenceEnd: end, evidenceContentHash: hash, mentionKind: 'exact' });
  }
  return matches;
}

function aliasPattern(alias: string): RegExp {
  const parts = normalize(alias).split(' ').map((part) => [...part].map((char) => `${escapeRegExp(char)}${/[a-z]/i.test(char) ? '\\p{M}*' : ''}`).join(''));
  const body = parts.length === 1 && /^[a-z]{2,4}$/i.test(alias)
    ? [...alias].map((char) => `${escapeRegExp(char)}\\p{M}*`).join('[.-]?') : parts.join('[\\s.‐‑‒–—−-]+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu');
}

function toSearchableText(value: string): { value: string; starts: number[]; ends: number[] } {
  const chars: string[] = []; const starts: number[] = []; const ends: number[] = [];
  let offset = 0;
  for (const original of value) {
    const normalized = original.normalize('NFKD').toLocaleLowerCase('en-US').replace(/[.‐‑‒–—−]/g, '-');
    for (const char of normalized) { chars.push(char); starts.push(offset); ends.push(offset + original.length); }
    offset += original.length;
  }
  return { value: chars.join(''), starts, ends };
}

function contextAllows(text: string, alias: TopicAliasRecord): boolean {
  if (!alias.requiresContext) return true;
  try {
    const required = JSON.parse(alias.contextRuleJson ?? '{}').requiredTerms;
    return Array.isArray(required) && required.some((term) => normalize(text).includes(normalize(String(term))));
  } catch { return false; }
}

function roleFor(topic: TopicRecord, text: string, start: number): TopicAssignmentRole {
  if (topic.topicType === 'facility') return 'facility';
  if (topic.topicType === 'platform') return 'platform';
  if (topic.topicType === 'programme') return 'programme';
  if (topic.topicType === 'location' || topic.topicType === 'operational_theatre') return 'location';
  const before = text.slice(Math.max(0, start - 36), start).toLowerCase();
  const after = text.slice(start, start + 40).toLowerCase();
  if (/\b(in|at|from|near)\s*$/.test(before)) return 'location';
  if (/\b(attacks?|targeted|against|hits?)\s*$/.test(before)) return 'target';
  if (/\b(operat(?:es?|ing)|deploy(?:s|ed|ment)?|aircraft|personnel)\b/.test(after)) return 'operator';
  return topic.topicType === 'bilateral_relationship' ? 'context' : 'actor';
}

function applyImplications(direct: ClassifiedMention[], registry: TopicRegistrySnapshot, text: string): ClassifiedMention[] {
  const topicIds = new Set(direct.map((item) => item.topicId)); const results = [...direct];
  for (const rule of registry.implicationRules) {
    if (rule.maximumDepth !== 1 || !topicIds.has(rule.sourceTopicId) || topicIds.has(rule.impliedTopicId)) continue;
    if (!ruleAllows(rule.requiredContextJson, topicIds, text)) continue;
    const evidence = direct.find((item) => item.topicId === rule.sourceTopicId)!;
    results.push({ ...evidence, topicId: rule.impliedTopicId, role: 'context', confidence: 0.9, mentionKind: 'implication' });
    topicIds.add(rule.impliedTopicId);
  }
  return results;
}

function ruleAllows(json: string, topicIds: Set<string>, text: string): boolean {
  try {
    const rule = JSON.parse(json) as { materialActors?: string[]; eventTypes?: string[] };
    if (rule.materialActors?.some((id) => !topicIds.has(id))) return false;
    if (!rule.eventTypes?.length) return true;
    const normalized = normalize(text);
    return rule.eventTypes.some((type) => type === 'military' ? /\b(military|army|air|navy|border|force|attack|personnel)\b/.test(normalized) : type === 'diplomatic' && /\b(talk|meeting|negotiat|diplom)\b/.test(normalized));
  } catch { return false; }
}

function isIncidental(text: string, start: number): boolean {
  // The "after" window stops at the next clause boundary so a trigger word
  // describing an unrelated noun in a later clause (e.g. a title/attribution
  // introduced by ":" — "for Indian Navy: Former Arihant Commander") doesn't
  // falsely suppress the mention. A trigger word genuinely describing the
  // mention itself ("...Iran only as historical background.") stays within
  // the same clause and is still caught.
  const before = text.slice(Math.max(0, start - 70), start);
  const afterFull = text.slice(start, start + 85);
  const clauseBoundary = afterFull.search(/[.!?:]/);
  const after = clauseBoundary === -1 ? afterFull : afterFull.slice(0, clauseBoundary);
  return /\b(histor(?:y|ical)|previously|former(?:ly)?|background)\b/i.test(before + after);
}

function extractCandidates(text: string, hash: string): TopicCandidate[] {
  const known = /\b(?:Air Base|Airbase|Base|Facility|Airport|Exercise|Operation)\b/g;
  const candidates: TopicCandidate[] = [];
  for (const match of text.matchAll(/\b(?:[A-Z][\p{L}\p{N}'-]+\s+){1,4}(?:Air Base|Airbase|Base|Facility|Airport|Exercise|Operation)\b/gu)) {
    if (known.test(match[0])) candidates.push({ name: match[0], evidenceStart: match.index ?? 0,
      evidenceEnd: (match.index ?? 0) + match[0].length, evidenceContentHash: hash });
    known.lastIndex = 0;
  }
  return candidates;
}

function normalize(value: string): string { return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-US').replace(/[.‐‑‒–—−]/g, '-').replace(/[_\s-]+/g, ' ').trim(); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sortMentions(a: ClassifiedMention, b: ClassifiedMention): number { return a.topicId.localeCompare(b.topicId) || a.evidenceStart - b.evidenceStart; }
