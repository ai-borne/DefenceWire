/**
 * Story HTML Meta Injector for DefenceWire.in
 * Pure string-level rewriter that swaps the built index.html's <title>,
 * description, Open Graph, Twitter, and canonical tags for a story's own
 * meta document. No DOM or Workers runtime required, so it can be unit
 * tested directly and reused verbatim inside the edge prerender handler.
 * Hard limit: <= 300 LOC.
 */

import { StoryMetaDocument } from './storyMeta.js';

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceTitleTag(html: string, title: string): string {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`);
}

function replaceTagAttribute(html: string, tagMatcher: RegExp, attribute: 'content' | 'href', value: string): string {
  const match = html.match(tagMatcher);
  if (!match) return html;

  const attrPattern = new RegExp(`${attribute}="[^"]*"`, 'i');
  const updatedTag = match[0].replace(attrPattern, `${attribute}="${escapeHtmlAttribute(value)}"`);
  return html.replace(match[0], updatedTag);
}

export function injectStoryMetaIntoHtml(html: string, meta: StoryMetaDocument): string {
  let result = html;

  result = replaceTitleTag(result, meta.title);
  result = replaceTagAttribute(result, /<meta[^>]*name="description"[^>]*>/i, 'content', meta.description);
  result = replaceTagAttribute(result, /<link[^>]*rel="canonical"[^>]*>/i, 'href', meta.url);

  result = replaceTagAttribute(result, /<meta[^>]*property="og:title"[^>]*>/i, 'content', meta.title);
  result = replaceTagAttribute(result, /<meta[^>]*property="og:description"[^>]*>/i, 'content', meta.description);
  result = replaceTagAttribute(result, /<meta[^>]*property="og:url"[^>]*>/i, 'content', meta.url);
  result = replaceTagAttribute(result, /<meta[^>]*property="og:image"[^>]*>/i, 'content', meta.imageUrl);

  result = replaceTagAttribute(result, /<meta[^>]*name="twitter:title"[^>]*>/i, 'content', meta.title);
  result = replaceTagAttribute(result, /<meta[^>]*name="twitter:description"[^>]*>/i, 'content', meta.description);
  result = replaceTagAttribute(result, /<meta[^>]*name="twitter:image"[^>]*>/i, 'content', meta.imageUrl);

  return result;
}
