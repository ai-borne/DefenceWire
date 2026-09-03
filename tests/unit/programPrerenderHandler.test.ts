/**
 * Unit Tests for Program Dossier Edge Prerender Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  handleProgramPrerenderRequest,
  HtmlDocumentResponse
} from '../../src/seo/programPrerenderHandler.js';
import {
  buildProgramUrl,
  parseProgramIdFromPath,
  buildProgramSemanticBodyHtml
} from '../../src/seo/programMeta.js';
import { getProgramById } from '../../src/data/strategicPrograms.js';
import { getOrbatByProgramId } from '../../src/data/orbat/programOrbatData.js';

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
    <meta name="twitter:title" content="DefenceWire.in" />
    <meta name="twitter:description" content="India's real-time institutional defence news aggregator." />
    <meta name="twitter:image" content="https://www.defencewire.in/icons/icon-512.png" />
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

describe('Program Dossier Edge Prerender & Permalinks', () => {
  it('correctly parses program IDs from pathname and handles trailing slashes', () => {
    expect(parseProgramIdFromPath('/program/tejas-mk1a')).toBe('tejas-mk1a');
    expect(parseProgramIdFromPath('/program/k9-vajra-t/')).toBe('k9-vajra-t');
    expect(parseProgramIdFromPath('/program/')).toBeNull();
    expect(parseProgramIdFromPath('/story/story-123')).toBeNull();
    expect(parseProgramIdFromPath('/')).toBeNull();
  });

  it('builds canonical shareable program URLs', () => {
    expect(buildProgramUrl('tejas-mk1a')).toBe('https://www.defencewire.in/program/tejas-mk1a');
    expect(buildProgramUrl('project-75i')).toBe('https://www.defencewire.in/program/project-75i');
  });

  it('passes standard browser requests through without prerendering overhead', async () => {
    const res = await handleProgramPrerenderRequest(
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        url: 'https://www.defencewire.in/program/tejas-mk1a'
      },
      { fetchOriginHtml: makeOriginResponse }
    );

    expect(res.body).toBe(MOCK_INDEX_HTML);
    expect(res.body).not.toContain('LCA Tejas Mk1A');
  });

  it('prerenders OpenGraph, Twitter, and Schema.org JSON-LD for social crawlers', async () => {
    const crawlers = ['Twitterbot/1.0', 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'facebookexternalhit/1.1'];

    const tejas = getProgramById('tejas-mk1a')!;
    for (const userAgent of crawlers) {
      const res = await handleProgramPrerenderRequest(
        {
          userAgent,
          url: 'https://www.defencewire.in/program/tejas-mk1a'
        },
        { fetchOriginHtml: makeOriginResponse }
      );

      expect(res.body).toContain(`<title>${tejas.name} — Indian Defence Strategic Dossier | DefenceWire.in</title>`);
      expect(res.body).toContain('content="https://www.defencewire.in/program/tejas-mk1a"');
      expect(res.body).toContain('type="application/ld+json"');
      expect(res.body).toContain('LCA Tejas Mk1A');
      expect(res.body).toContain('No. 45 Squadron IAF');
      expect(res.body).toContain('dw-program-prerender-dossier');
    }
  });

  it('falls back to untouched origin HTML when program ID is not recognized', async () => {
    const res = await handleProgramPrerenderRequest(
      {
        userAgent: 'Twitterbot/1.0',
        url: 'https://www.defencewire.in/program/non-existent-program-id'
      },
      { fetchOriginHtml: makeOriginResponse }
    );

    expect(res.body).toBe(MOCK_INDEX_HTML);
  });

  it('generates semantic HTML body containing ORBAT unit formations and citations', () => {
    const tejas = getProgramById('tejas-mk1a')!;
    const units = getOrbatByProgramId('tejas-mk1a');

    const html = buildProgramSemanticBodyHtml(tejas, units);
    expect(html).toContain('LCA Tejas Mk1A');
    expect(html).toContain('No. 45 Squadron IAF');
    expect(html).toContain('Flying Daggers');
    expect(html).toContain('AFS Sulur');
    expect(html).toContain('Standing Committee on Defence');
    expect(html).toContain('dw-citation-meta');
  });
});
