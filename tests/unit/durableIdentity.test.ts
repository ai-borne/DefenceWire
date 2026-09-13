import { describe, expect, it } from 'vitest';
import {
  canonicalizeArticleUrl, createSourceArticleId, mintClusterId
} from '../../crawler/durableIdentity.js';

describe('durable article identity', () => {
  it('normalizes equivalent URL forms without discarding content parameters', async () => {
    const variants = [
      'https://Example.com:443/news/story/?utm_source=x&id=7#section',
      'https://example.com/news/story?id=7',
      'https://example.com/news/%73tory/?id=7&fbclid=abc'
    ];
    expect(new Set(variants.map(canonicalizeArticleUrl))).toEqual(new Set(['https://example.com/news/story?id=7']));
    const ids = await Promise.all(variants.map((url) => createSourceArticleId({
      url, sourceOwnerKey: 'owner', publishedAt: 'now', title: 'Story', contentHash: 'hash'
    })));
    expect(new Set(ids)).toHaveLength(1);
    expect(ids[0]).toMatch(/^article_[0-9a-f]{32}$/);
  });

  it('uses the reviewed deterministic fallback for genuinely URL-less sources', async () => {
    const input = { sourceOwnerKey: 'wire', publishedAt: '2026-09-13', title: '  A Story ', contentHash: 'abc' };
    expect(await createSourceArticleId(input)).toBe(await createSourceArticleId({ ...input, title: 'a story' }));
  });

  it('rejects non-web URLs before they can become stored canonical URLs', () => {
    expect(() => canonicalizeArticleUrl('javascript:alert(1)')).toThrow(/HTTP or HTTPS/);
  });
});

describe('durable cluster identity', () => {
  it('mints the cluster id independently of source or model content', () => {
    const uuid = '123e4567-e89b-42d3-a456-426614174000';
    expect(mintClusterId(uuid)).toBe(`cluster_${uuid}`);
    expect(() => mintClusterId('https://source.example/primary')).toThrow(/random UUID/);
  });
});
