/**
 * Story Meta SSOT for DefenceWire.in
 * Single source of truth for a story's permalink URL and its title/description/
 * image metadata. Consumed by both the client-side permalink service (browser
 * document meta) and the edge prerender handler (bot-facing HTML), so the two
 * surfaces can never drift apart.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

const SITE_NAME = 'DefenceWire.in';
const SITE_ORIGIN = 'https://www.defencewire.in';
const STORY_PATH_PREFIX = '/story/';
const DEFAULT_OG_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`;

export interface StoryMetaDocument {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
}

export function buildStoryUrl(clusterId: string): string {
  return `${SITE_ORIGIN}${STORY_PATH_PREFIX}${clusterId}`;
}

export function parseStoryIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(STORY_PATH_PREFIX)) return null;
  const id = pathname.slice(STORY_PATH_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export function buildStoryMetaDocument(cluster: StoryCluster): StoryMetaDocument {
  return {
    title: `${cluster.synthesizedHeadline} — ${SITE_NAME}`,
    description: cluster.primarySource.snippet ?? cluster.synthesizedHeadline,
    url: buildStoryUrl(cluster.id),
    imageUrl: DEFAULT_OG_IMAGE_URL
  };
}
