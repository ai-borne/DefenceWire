/**
 * Story Meta SSOT for DefenceWire.in
 * Single source of truth for a story's permalink URL, OpenGraph / Twitter metadata,
 * Schema.org NewsArticle JSON-LD, and static semantic HTML prerendering.
 * Consumed by client permalink service and edge prerender handler.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';

const SITE_NAME = STRINGS.app.name;
const SITE_ORIGIN = 'https://www.defencewire.in';
const STORY_PATH_PREFIX = '/story/';
const DEFAULT_OG_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`;

export interface StoryMetaDocument {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  jsonLd?: string;
  semanticBodyHtml?: string;
}

export function buildStoryUrl(clusterId: string): string {
  return `${SITE_ORIGIN}${STORY_PATH_PREFIX}${clusterId}`;
}

export function parseStoryIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(STORY_PATH_PREFIX)) return null;
  const id = pathname.slice(STORY_PATH_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildStoryJsonLd(cluster: StoryCluster): string {
  const url = buildStoryUrl(cluster.id);
  const headline = cluster.synthesizedHeadline;
  const description = cluster.primarySource.snippet ?? cluster.synthesizedHeadline;
  const datePublished = cluster.createdAt ?? cluster.primarySource.publishedAt;
  const dateModified = cluster.updatedAt ?? datePublished;

  const jsonLdObj = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    headline,
    description,
    image: [DEFAULT_OG_IMAGE_URL],
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: cluster.primarySource.sourceName || SITE_NAME,
      url: cluster.primarySource.url
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE_URL
      }
    },
    articleSection: cluster.categories?.join(', ') || 'Defence',
    keywords: cluster.entities?.join(', ') || '',
    citation: (cluster.relatedCoverage || []).map((r) => r.url).filter(Boolean)
  };

  return JSON.stringify(jsonLdObj).replace(/</g, '\\u003c');
}

export function buildStorySemanticBodyHtml(cluster: StoryCluster): string {
  const headline = escapeHtml(cluster.synthesizedHeadline);
  const snippet = escapeHtml(cluster.primarySource.snippet ?? cluster.synthesizedHeadline);
  const sourceName = escapeHtml(cluster.primarySource.sourceName);
  const sourceUrl = escapeHtml(cluster.primarySource.url);
  const primaryTitle = escapeHtml(cluster.primarySource.title);
  const category = escapeHtml(cluster.categories?.[0] ?? 'Defence');
  const date = escapeHtml(cluster.createdAt ?? cluster.primarySource.publishedAt);

  const relatedHtml = (cluster.relatedCoverage || [])
    .map(
      (rel) =>
        `<li><a href="${escapeHtml(rel.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(rel.title)}</a> <span class="dw-source-tier">(${escapeHtml(rel.sourceName)})</span></li>`
    )
    .join('');

  return `<main id="app"><article class="dw-prerender-story" itemscope itemtype="https://schema.org/NewsArticle"><header><span class="dw-prerender-category">${category}</span><h1 itemprop="headline">${headline}</h1><time datetime="${date}" itemprop="datePublished">${date}</time></header><section class="dw-prerender-summary" itemprop="articleBody"><p class="dw-prerender-lead">${snippet}</p></section><section class="dw-prerender-sources"><h2>${escapeHtml(STRINGS.story.primarySourcePrefix)} ${sourceName}</h2><p><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${primaryTitle}</a></p>${relatedHtml ? `<h3>${escapeHtml(STRINGS.story.relatedCoverageHeading)}</h3><ul>${relatedHtml}</ul>` : ''}</section></article></main>`;
}

export function buildStoryMetaDocument(cluster: StoryCluster): StoryMetaDocument {
  return {
    title: `${cluster.synthesizedHeadline} — ${SITE_NAME}`,
    description: cluster.primarySource.snippet ?? cluster.synthesizedHeadline,
    url: buildStoryUrl(cluster.id),
    imageUrl: DEFAULT_OG_IMAGE_URL,
    jsonLd: buildStoryJsonLd(cluster),
    semanticBodyHtml: buildStorySemanticBodyHtml(cluster)
  };
}
