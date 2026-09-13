import { describe, expect, it, vi } from 'vitest';
import {
  loadTopicRegistry, normalizeTopicAlias, resolveTopicRedirect
} from '../../src/services/topicRegistryService.js';

describe('topic registry service', () => {
  it('normalizes punctuation, case, and compatibility characters consistently', () => {
    expect(normalizeTopicAlias(' U.S. ')).toBe('u s');
    expect(normalizeTopicAlias('Sukhoi Su‑57')).toBe('sukhoi su 57');
    expect(normalizeTopicAlias('ＵＳＡ')).toBe('usa');
  });

  it('loads topics and aliases in one bounded registry operation', async () => {
    const batch = vi.fn().mockResolvedValue([[
      {
        id: 'india', display_name: 'India', display_hashtag: '#India', topic_type: 'country',
        description: null, status: 'active', verification_state: 'published',
        display_priority: 100, registry_version: 3, replaced_by_topic_id: null
      }
    ], [
      {
        normalized_alias: 'india', topic_id: 'india', alias_type: 'canonical',
        requires_context: 0, context_rule_json: null, verification_state: 'published'
      }
    ], [], []]);
    const snapshot = await loadTopicRegistry({ batch, first: vi.fn() });
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]![0]).toHaveLength(4);
    expect(snapshot).toMatchObject({
      registryVersion: 3, topics: [{ id: 'india' }], aliases: [{ topicId: 'india' }],
      relations: [], implicationRules: []
    });
  });

  it('resolves redirects through a parameterized query', async () => {
    const first = vi.fn().mockResolvedValue({ id: 'united-states' });
    expect(await resolveTopicRedirect({ batch: vi.fn(), first }, 'usa')).toBe('united-states');
    const call = first.mock.calls[0];
    expect(call).toBeDefined();
    expect(call![0]).not.toContain('usa');
    expect(call![1]).toEqual(['usa']);
  });
});
