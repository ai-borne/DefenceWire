/**
 * Unit Tests for Global Organization Schema & Entity Definition
 * Verifies that index.html contains valid Schema.org NewsMediaOrganization,
 * WebSite, and DataFeed JSON-LD structures for AI search and knowledge graph indexing.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Global Entity Schema in index.html', () => {
  const indexPath = resolve(__dirname, '../../index.html');
  const indexHtml = readFileSync(indexPath, 'utf-8');

  function getParsedJsonLd(): { '@context': string; '@graph': Array<Record<string, unknown>> } {
    const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    expect(jsonLdMatch).not.toBeNull();
    const rawJson = (jsonLdMatch && jsonLdMatch[1]) ? jsonLdMatch[1] : '{}';
    return JSON.parse(rawJson) as { '@context': string; '@graph': Array<Record<string, unknown>> };
  }

  it('contains a valid JSON-LD script block in index.html', () => {
    const parsed = getParsedJsonLd();
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph']).toBeInstanceOf(Array);
  });

  it('declares NewsMediaOrganization with canonical name and description', () => {
    const parsed = getParsedJsonLd();
    const org = parsed['@graph'].find((item) => item['@type'] === 'NewsMediaOrganization') as {
      name: string;
      url: string;
      description: string;
      logo: { url: string };
    } | undefined;

    expect(org).toBeDefined();
    expect(org?.name).toBe('DefenceWire.in');
    expect(org?.url).toBe('https://www.defencewire.in/');
    expect(org?.description).toContain('defence news aggregator');
    expect(org?.logo.url).toBe('https://www.defencewire.in/icons/icon-512.png');
  });

  it('declares WebSite with SearchAction potential action', () => {
    const parsed = getParsedJsonLd();
    const site = parsed['@graph'].find((item) => item['@type'] === 'WebSite') as {
      name: string;
      publisher: { ['@id']: string };
    } | undefined;

    expect(site).toBeDefined();
    expect(site?.name).toBe('DefenceWire.in');
    expect(site?.publisher['@id']).toBe('https://www.defencewire.in/#organization');
  });

  it('declares DataFeed for machine-readable discovery of news.json', () => {
    const parsed = getParsedJsonLd();
    const feed = parsed['@graph'].find((item) => item['@type'] === 'DataFeed') as {
      url: string;
    } | undefined;

    expect(feed).toBeDefined();
    expect(feed?.url).toBe('https://www.defencewire.in/data/news.json');
  });
});
