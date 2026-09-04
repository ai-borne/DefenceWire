/**
 * Unit Tests for Cloudflare Pages Functions: /llms.txt, /llms-full.txt, and /sitemap.xml
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { onRequestGet as onGetLlmsTxt } from '../../functions/llms.txt.js';
import { onRequestGet as onGetLlmsFullTxt } from '../../functions/llms-full.txt.js';
import { onRequestGet as onGetSitemapXml } from '../../functions/sitemap.xml.js';

describe('Pages Functions: Machine-Readable Specs & Edge Cache Revalidation', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clusters: [] })
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('serves /llms.txt with 200, ETag, Cache-Tag, and grounding content on cold request', async () => {
    const request = new Request('https://www.defencewire.in/llms.txt');
    const response = await onGetLlmsTxt({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-tag')).toBe('dw-llms-txt,dw-ai-grounding');

    const etag = response.headers.get('etag');
    expect(etag).toBeDefined();
    expect(etag?.startsWith('"')).toBe(true);

    const body = await response.text();
    expect(body).toContain('# DefenceWire.in');
    expect(body).toContain('https://www.defencewire.in/program/tejas-mk1a');
  });

  it('revalidates /llms.txt and returns 304 Not Modified when If-None-Match matches', async () => {
    // 1. Initial request to obtain current ETag
    const coldRequest = new Request('https://www.defencewire.in/llms.txt');
    const coldResponse = await onGetLlmsTxt({ request: coldRequest });
    const etag = coldResponse.headers.get('etag')!;

    // 2. Conditional request
    const condRequest = new Request('https://www.defencewire.in/llms.txt', {
      headers: { 'if-none-match': etag }
    });
    const condResponse = await onGetLlmsTxt({ request: condRequest });

    expect(condResponse.status).toBe(304);
    expect(condResponse.headers.get('etag')).toBe(etag);
    expect(condResponse.headers.get('cache-tag')).toBe('dw-llms-txt,dw-ai-grounding');

    const text = await condResponse.text();
    expect(text).toBe('');
  });

  it('serves /llms-full.txt with 200, full schemas, and Edge Cache headers', async () => {
    const request = new Request('https://www.defencewire.in/llms-full.txt');
    const response = await onGetLlmsFullTxt({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-tag')).toBe('dw-llms-full,dw-ai-grounding');

    const body = await response.text();
    expect(body).toContain('Full Machine-Readable LLM Specification');
    expect(body).toContain('StoryCluster JSON Schema');
    expect(body).toContain('StrategicProgram JSON Schema');
  });

  it('revalidates /llms-full.txt and returns 304 when If-None-Match matches', async () => {
    const coldRequest = new Request('https://www.defencewire.in/llms-full.txt');
    const coldResponse = await onGetLlmsFullTxt({ request: coldRequest });
    const etag = coldResponse.headers.get('etag')!;

    const condRequest = new Request('https://www.defencewire.in/llms-full.txt', {
      headers: { 'if-none-match': etag }
    });
    const condResponse = await onGetLlmsFullTxt({ request: condRequest });

    expect(condResponse.status).toBe(304);
    expect(await condResponse.text()).toBe('');
  });

  it('serves /sitemap.xml with 200, ETag, and dw-sitemap Cache-Tag', async () => {
    const request = new Request('https://www.defencewire.in/sitemap.xml');
    const response = await onGetSitemapXml({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect(response.headers.get('cache-tag')).toBe('dw-sitemap,seo');

    const etag = response.headers.get('etag');
    expect(etag).toBeDefined();

    const body = await response.text();
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('revalidates /sitemap.xml and returns 304 when If-None-Match matches', async () => {
    const coldRequest = new Request('https://www.defencewire.in/sitemap.xml');
    const coldResponse = await onGetSitemapXml({ request: coldRequest });
    const etag = coldResponse.headers.get('etag')!;

    const condRequest = new Request('https://www.defencewire.in/sitemap.xml', {
      headers: { 'if-none-match': etag }
    });
    const condResponse = await onGetSitemapXml({ request: condRequest });

    expect(condResponse.status).toBe(304);
    expect(await condResponse.text()).toBe('');
  });
});
