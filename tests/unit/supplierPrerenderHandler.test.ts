/**
 * Unit Tests for Supplier Dossier Edge Prerender Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  handleSupplierPrerenderRequest
} from '../../src/seo/supplierPrerenderHandler.js';
import {
  buildSupplierUrl,
  parseSupplierIdFromPath,
  buildSupplierSemanticBodyHtml,
  buildSupplierJsonLd
} from '../../src/seo/supplierMeta.js';
import { getSupplierBySlug } from '../../src/data/suppliers/seedSuppliers.js';
import { HtmlDocumentResponse } from '../../src/seo/programPrerenderHandler.js';

const MOCK_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>DefenceWire.in — Real-Time Indian Defence & Strategic Intelligence</title>
    <meta name="description" content="India's real-time institutional defence news aggregator." />
    <link rel="canonical" href="https://www.defencewire.in/" />
    <meta property="og:title" content="DefenceWire.in" />
    <meta property="og:description" content="India's real-time institutional defence news aggregator." />
    <meta property="og:url" content="https://www.defencewire.in/" />
    <meta property="og:image" content="https://www.defencewire.in/icons/icon-512.png" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

function makeOriginResponse(): Promise<HtmlDocumentResponse> {
  return Promise.resolve({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: MOCK_INDEX_HTML
  });
}

describe('Supplier Dossier Edge Prerender & Permalinks', () => {
  it('correctly parses supplier IDs from pathname and handles trailing slashes', () => {
    expect(parseSupplierIdFromPath('/supplier/hal')).toBe('hal');
    expect(parseSupplierIdFromPath('/supplier/bharat-electronics-limited/')).toBe('bharat-electronics-limited');
    expect(parseSupplierIdFromPath('/supplier/')).toBeNull();
    expect(parseSupplierIdFromPath('/program/tejas-mk1a')).toBeNull();
    expect(parseSupplierIdFromPath('/')).toBeNull();
  });

  it('builds canonical shareable supplier URLs', () => {
    expect(buildSupplierUrl('hal')).toBe('https://www.defencewire.in/supplier/hal');
    expect(buildSupplierUrl('bel')).toBe('https://www.defencewire.in/supplier/bel');
  });

  it('passes standard browser requests through without prerendering overhead', async () => {
    const res = await handleSupplierPrerenderRequest(
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        url: 'https://www.defencewire.in/supplier/hal'
      },
      { fetchOriginHtml: makeOriginResponse }
    );

    expect(res.body).toBe(MOCK_INDEX_HTML);
    expect(res.body).not.toContain('Hindustan Aeronautics Limited');
  });

  it('prerenders OpenGraph, Twitter, and Schema.org JSON-LD for social crawlers', async () => {
    const hal = getSupplierBySlug('hal')!;
    const crawlers = ['Twitterbot/1.0', 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'LinkedInBot/1.0'];

    for (const userAgent of crawlers) {
      const res = await handleSupplierPrerenderRequest(
        {
          userAgent,
          url: 'https://www.defencewire.in/supplier/hal'
        },
        { fetchOriginHtml: makeOriginResponse }
      );

      expect(res.body).toContain(`<title>${hal.name} — Indian Defence Industrial Ecosystem Dossier | DefenceWire.in</title>`);
      expect(res.body).toContain('content="https://www.defencewire.in/supplier/hal"');
      expect(res.body).toContain('type="application/ld+json"');
      expect(res.body).toContain('Hindustan Aeronautics Limited');
      expect(res.body).toContain('Bengaluru');
      expect(res.body).toContain('dw-supplier-prerender-dossier');
    }
  });

  it('generates Schema.org JSON-LD graph with government org or corporation type', () => {
    const hal = getSupplierBySlug('hal')!;
    const jsonLd = buildSupplierJsonLd(hal);
    const parsed = JSON.parse(jsonLd);

    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph'][0]['@type']).toBe('GovernmentOrganization');
    expect(parsed['@graph'][0].name).toBe(hal.name);
    expect(parsed['@graph'][0].address.addressLocality).toBe(hal.hqCity);
  });

  it('generates semantic HTML body containing capabilities and linked programs', () => {
    const hal = getSupplierBySlug('hal')!;
    const html = buildSupplierSemanticBodyHtml(hal);

    expect(html).toContain(hal.name);
    expect(html).toContain('Core Defence Capabilities');
    expect(html).toContain('Integrated Defence Programs & Subsystems');
    expect(html).toContain('dw-supplier-prerender-dossier');
  });

  it('falls back to untouched origin HTML when supplier is not found', async () => {
    const res = await handleSupplierPrerenderRequest(
      {
        userAgent: 'Googlebot/2.1',
        url: 'https://www.defencewire.in/supplier/unknown-vendor-xyz'
      },
      { fetchOriginHtml: makeOriginResponse }
    );

    expect(res.body).toBe(MOCK_INDEX_HTML);
  });
});
