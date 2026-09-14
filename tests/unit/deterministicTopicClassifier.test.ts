import { describe, expect, it } from 'vitest';
import { classifyTopicText, contentFingerprint } from '../../crawler/deterministicTopicClassifier.js';
import { TopicAliasRecord, TopicRegistrySnapshot } from '../../src/types/topics.js';

const registry: TopicRegistrySnapshot = {
  registryVersion: 7,
  topics: [
    ['india', 'country'], ['china', 'country'], ['united-states', 'country'], ['iran', 'country'], ['jordan', 'country'],
    ['lac', 'operational_theatre'], ['india-china', 'bilateral_relationship'], ['su-57', 'platform'],
    ['muwaffaq-salti-air-base', 'facility'], ['airbases', 'facility'], ['akash-ng', 'platform'], ['indian-navy', 'military_service']
  ].map(([id, topicType]) => ({ id: id!, displayName: id!, displayHashtag: `#${id!}`, topicType: topicType as never,
    description: null, status: 'active', verificationState: 'published', displayPriority: 0, registryVersion: 7, replacedByTopicId: null })),
  aliases: [
    ['india', 'india'], ['indian', 'india'], ['china', 'china'], ['chinese', 'china'], ['usa', 'united-states'], ['us', 'united-states'], ['united states', 'united-states'], ['iran', 'iran'], ['jordan', 'jordan'], ['jordanian', 'jordan'], ['lac', 'lac'], ['line of actual control', 'lac'], ['su57', 'su-57'], ['su 57', 'su-57'], ['sukhoi su 57', 'su-57'], ['muwaffaq salti air base', 'muwaffaq-salti-air-base'], ['akash ng', 'akash-ng'], ['akas ng', 'akash-ng'], ['indian navy', 'indian-navy']
  ].map(([normalizedAlias, topicId]): TopicAliasRecord => ({ normalizedAlias: normalizedAlias!, topicId: topicId!, aliasType: 'canonical', requiresContext: false, contextRuleJson: null, verificationState: 'published' }))
    .concat([{ normalizedAlias: 'nsa', topicId: 'lac', aliasType: 'acronym', requiresContext: true,
      contextRuleJson: '{"requiredTerms":["china","border","doval"]}', verificationState: 'published' }]),
  relations: [],
  implicationRules: [
    { sourceTopicId: 'lac', impliedTopicId: 'india-china', requiredContextJson: '{"materialActors":["india","china"],"eventTypes":["military","diplomatic"]}', maximumDepth: 1, verificationState: 'published' }
  ]
};

const ids = (text: string) => classifyTopicText(text, registry).mentions.map((item) => item.topicId).sort();

describe('deterministic topic classification', () => {
  it('resolves aliases with punctuation, word boundaries, roles, and direct multi-topic evidence', () => {
    const result = classifyTopicText('Iran-backed force attacks U.S. airbase in Jordan. The strike targeted Muwaffaq Salti Air Base.', registry);
    expect(result.mentions.map((item) => [item.topicId, item.role])).toEqual(expect.arrayContaining([
      ['iran', 'actor'], ['united-states', 'target'], ['jordan', 'location'], ['muwaffaq-salti-air-base', 'facility']
    ]));
    expect(ids('Local shipyard tests Su-57 beside black water.')).toEqual(['su-57']);
    expect(ids('Ākāś-NG completes an interceptor trial.')).toEqual(['akash-ng']);
  });

  it('applies only explicit bounded implication rules and rejects incidental history', () => {
    expect(ids('Indian and Chinese armies hold military talks along the LAC.')).toEqual(['china', 'india', 'india-china', 'lac']);
    expect(ids('Officials referenced Iran only as historical background.')).toEqual([]);
  });

  it('does not let a "Former <title>" attribution in an unrelated later clause suppress a real mention (Phase 14 shadow-eval finding)', () => {
    expect(ids('Hangor Submarines a Big Headache for Indian Navy: Former Arihant Commander')).toEqual(['india', 'indian-navy']);
  });

  it('resolves the NSA acronym to LAC only in an India-China border context', () => {
    expect(ids('NSA Ajit Doval meets Chinese counterpart to advance border negotiations.'))
      .toEqual(expect.arrayContaining(['lac']));
    expect(ids('NSA leak exposes surveillance programme, US officials confirm.')).not.toContain('lac');
  });

  it('is stable and surfaces a source-grounded unknown facility candidate without assigning it', () => {
    const text = 'U.S. personnel deployed to Muwaffaq Salti Air Base.';
    expect(classifyTopicText(text, registry)).toEqual(classifyTopicText(text, registry));
    expect(contentFingerprint(text)).toBe(contentFingerprint(text));
    const unknown = classifyTopicText('Forces landed at New Dawn Air Base.', { ...registry, aliases: registry.aliases.filter((item) => item.topicId !== 'muwaffaq-salti-air-base') });
    expect(unknown.candidates).toHaveLength(1);
    expect(unknown.mentions.some((item) => item.topicId === 'muwaffaq-salti-air-base')).toBe(false);
  });
});
