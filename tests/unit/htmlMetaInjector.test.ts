/**
 * Unit Tests for the Story HTML Meta Injector
 * Verifies safe, targeted rewriting of <title>, description, OG, Twitter,
 * and canonical tags in the built index.html for social-crawler prerendering.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { injectStoryMetaIntoHtml } from '../../src/seo/htmlMetaInjector.js';
import { StoryMetaDocument } from '../../src/seo/storyMeta.js';

const baseHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>DefenceWire.in — Real-Time Indian Defence &amp; Strategic Intelligence</title>
    <meta name="description" content="Homepage description." />
    <link rel="canonical" href="https://www.defencewire.in/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="DefenceWire.in — Real-Time Indian Defence & Strategic Intelligence" />
    <meta property="og:description" content="Homepage description." />
    <meta property="og:url" content="https://www.defencewire.in/" />
    <meta property="og:image" content="https://www.defencewire.in/icons/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="DefenceWire.in — Real-Time Indian Defence & Strategic Intelligence" />
    <meta name="twitter:description" content="Homepage description." />
    <meta name="twitter:image" content="https://www.defencewire.in/icons/icon-512.png" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

const meta: StoryMetaDocument = {
  title: 'HAL delivers Tejas Mk1A — DefenceWire.in',
  description: 'Equipped with Uttam AESA radar.',
  url: 'https://www.defencewire.in/story/cluster-tejas-mk1a',
  imageUrl: 'https://www.defencewire.in/icons/icon-512.png',
  jsonLd: '{"@context":"https://schema.org","@type":"NewsArticle","headline":"HAL delivers Tejas Mk1A"}',
  semanticBodyHtml: '<main id="app"><article class="dw-prerender-story"><h1 itemprop="headline">HAL delivers Tejas Mk1A</h1></article></main>'
};

describe('injectStoryMetaIntoHtml', () => {
  it('replaces the <title> tag', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<title>HAL delivers Tejas Mk1A — DefenceWire.in</title>');
    expect(result).not.toContain('Real-Time Indian Defence');
  });

  it('replaces the meta description content', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<meta name="description" content="Equipped with Uttam AESA radar." />');
  });

  it('replaces og:title, og:description, and og:url', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<meta property="og:title" content="HAL delivers Tejas Mk1A — DefenceWire.in" />');
    expect(result).toContain('<meta property="og:description" content="Equipped with Uttam AESA radar." />');
    expect(result).toContain('<meta property="og:url" content="https://www.defencewire.in/story/cluster-tejas-mk1a" />');
  });

  it('replaces twitter:title and twitter:description', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<meta name="twitter:title" content="HAL delivers Tejas Mk1A — DefenceWire.in" />');
    expect(result).toContain('<meta name="twitter:description" content="Equipped with Uttam AESA radar." />');
  });

  it('replaces the canonical link href', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<link rel="canonical" href="https://www.defencewire.in/story/cluster-tejas-mk1a" />');
  });

  it('leaves og:type and twitter:card untouched', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<meta property="og:type" content="website" />');
    expect(result).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('HTML-escapes special characters in the injected title', () => {
    const xssMeta: StoryMetaDocument = { ...meta, title: 'Ambush & "Betrayal" <script>alert(1)</script>' };
    const result = injectStoryMetaIntoHtml(baseHtml, xssMeta);
    expect(result).not.toContain('<script>alert(1)</script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('injects JSON-LD schema into the head', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"HAL delivers Tejas Mk1A"}</script>');
  });

  it('replaces div#app with the semantic prerendered body for AI crawlers', () => {
    const result = injectStoryMetaIntoHtml(baseHtml, meta);
    expect(result).toContain('<main id="app"><article class="dw-prerender-story"><h1 itemprop="headline">HAL delivers Tejas Mk1A</h1></article></main>');
    expect(result).not.toContain('<div id="app"></div>');
  });

  it('is a pure function that does not mutate its input', () => {
    const original = baseHtml;
    injectStoryMetaIntoHtml(baseHtml, meta);
    expect(baseHtml).toBe(original);
  });

  it('is idempotent when applied twice with the same meta', () => {
    const once = injectStoryMetaIntoHtml(baseHtml, meta);
    const twice = injectStoryMetaIntoHtml(once, meta);
    expect(twice).toBe(once);
  });
});
