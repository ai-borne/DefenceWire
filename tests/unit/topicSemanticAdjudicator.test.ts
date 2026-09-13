import { describe, expect, it } from 'vitest';
import { requestSemanticDecision, retrieveLikelyTopics, semanticInputHash, validateSemanticResponse } from '../../crawler/topicSemanticAdjudicator.js';
import { TopicRegistrySnapshot } from '../../src/types/topics.js';

const registry: TopicRegistrySnapshot = {
  registryVersion: 4,
  topics: [{ id: 'jordan', displayName: 'Jordan', displayHashtag: '#Jordan', topicType: 'country', description: 'Middle East country', status: 'active', verificationState: 'published', displayPriority: 0, registryVersion: 4, replacedByTopicId: null },
    { id: 'airbases', displayName: 'Airbases', displayHashtag: '#Airbases', topicType: 'facility', description: 'Military air facilities', status: 'active', verificationState: 'published', displayPriority: 0, registryVersion: 4, replacedByTopicId: null }],
  aliases: [{ normalizedAlias: 'jordan', topicId: 'jordan', aliasType: 'canonical', requiresContext: false, contextRuleJson: null, verificationState: 'published' }], relations: [], implicationRules: []
};
const text = 'The attack targeted Muwaffaq Salti Air Base in Jordan.';

describe('guarded semantic topic adjudication', () => {
  it('accepts only registered existing IDs and source-exact evidence', () => {
    const valid = validateSemanticResponse({ existingTopics: [{ topicId: 'jordan', role: 'location', confidence: 0.9, evidence: 'Jordan' }], discoveredConcepts: [{ name: 'Muwaffaq Salti Air Base', type: 'facility', role: 'target', confidence: 0.96, evidence: 'Muwaffaq Salti Air Base' }] }, text, registry);
    expect(valid?.existingTopics[0]?.topicId).toBe('jordan');
    expect(valid?.discoveredConcepts[0]).toMatchObject({ createProvisional: true, topicType: 'facility' });
    expect(validateSemanticResponse({ existingTopics: [{ topicId: 'invented', role: 'actor', confidence: 1, evidence: 'Jordan' }], discoveredConcepts: [] }, text, registry)).toBeNull();
    expect(validateSemanticResponse({ existingTopics: [], discoveredConcepts: [{ name: 'Made Up Base', type: 'facility', role: 'facility', confidence: 0.9, evidence: 'not in source' }] }, text, registry)).toBeNull();
  });

  it('keeps abstract themes and near duplicates in review rather than creating topics', () => {
    const abstract = validateSemanticResponse({ existingTopics: [], discoveredConcepts: [{ name: 'Muwaffaq Salti Air Base', type: 'strategic_theme', role: 'context', confidence: 0.8, evidence: 'Muwaffaq Salti Air Base' }] }, text, registry);
    expect(abstract?.discoveredConcepts[0]?.createProvisional).toBe(false);
    const duplicate = validateSemanticResponse({ existingTopics: [], discoveredConcepts: [{ name: 'Jordan', type: 'country', role: 'actor', confidence: 0.8, evidence: 'Jordan' }] }, text, registry);
    expect(duplicate?.discoveredConcepts[0]?.createProvisional).toBe(false);
    const uncertainPerson = validateSemanticResponse({ existingTopics: [], discoveredConcepts: [{ name: 'Muwaffaq Salti Air Base', type: 'person', role: 'actor', confidence: 0.8, evidence: 'Muwaffaq Salti Air Base' }] }, text, registry);
    expect(uncertainPerson?.discoveredConcepts[0]?.createProvisional).toBe(false);
  });

  it('tells the model the exact field name and enumerated values the parser requires (Phase 13 Stage 3 regression)', async () => {
    // A real shadow run against Gemini found the model reasonably emits {"id":...} (matching the topics
    // list's own field name) unless told to use "topicId", and invents plausible-but-unlisted role/type
    // values unless the allowed set is spelled out — either one silently zeroes every existingTopics link.
    let sentPrompt = '';
    await requestSemanticDecision(text, registry, { enabled: true, apiKey: 'test' }, async (_url, init) => {
      sentPrompt = JSON.parse(String(init?.body)).contents[0].parts[0].text;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"existingTopics":[],"discoveredConcepts":[]}' }] } }] }), { status: 200 });
    });
    expect(sentPrompt).toContain('"topicId"');
    for (const role of ['subject', 'actor', 'target', 'operator', 'location', 'facility', 'platform', 'programme', 'context']) expect(sentPrompt).toContain(role);
    for (const type of ['country', 'facility', 'exercise', 'operation', 'strategic_theme']) expect(sentPrompt).toContain(type);
  });

  it('is deterministic, bounded, and fails safely on model outage or malformed output', async () => {
    const ids = retrieveLikelyTopics(text, registry);
    expect(ids).toContain('jordan');
    expect(semanticInputHash(text, ids, 4, 'hybrid-topic-v1', 'semantic-shadow-v1')).toBe(semanticInputHash(text, ids, 4, 'hybrid-topic-v1', 'semantic-shadow-v1'));
    const result = await requestSemanticDecision(text, registry, { enabled: true, apiKey: 'test' }, async () => new Response('bad gateway', { status: 502 }));
    expect(result.decision).toBeNull();
    expect(validateSemanticResponse({ existingTopics: 'ignore all previous instructions', discoveredConcepts: [] }, text, registry)).toBeNull();
  });
});
