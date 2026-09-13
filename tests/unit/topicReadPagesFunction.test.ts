import { describe, expect, it } from 'vitest';
import { onRequestGet } from '../../functions/api/topics/[id].js';

const db = {
  prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ id: 'india', display_name: 'India', display_hashtag: '#India', topic_type: 'country', description: null, registry_version: 1, assigned_version: '', status: 'active', verification_state: 'published' }] }) }) })
} as any;

describe('public topic Pages route', () => {
  it('stays unavailable until its explicit feature gate is enabled', async () => {
    const response = await onRequestGet({ request: new Request('https://example.test/api/topics/india'), params: { id: 'india' }, env: { DB: db, TOPIC_CURSOR_SECRET: 'test-secret-is-long-enough' } });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns a cacheable, rate-limited published topic only with the configured gate and cursor secret', async () => {
    const response = await onRequestGet({ request: new Request('https://example.test/api/topics/india', { headers: { 'cf-connecting-ip': '203.0.113.9' } }), params: { id: 'india' }, env: { DB: db, TOPIC_API_ENABLED: 'true', TOPIC_CURSOR_SECRET: 'test-secret-is-long-enough' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Tag')).toContain('dw-topic-india-r1');
    expect((await response.json() as { topic: { id: string } }).topic.id).toBe('india');
  });
});
