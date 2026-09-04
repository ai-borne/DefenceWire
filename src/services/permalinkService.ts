/**
 * Permalink Service for DefenceWire.in
 * Builds shareable /story/:id URLs, syncs browser history & document meta tags,
 * and deep-links to a story cluster on initial page load.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { buildStoryUrl, buildStoryMetaDocument, parseStoryIdFromPath } from '../seo/storyMeta.js';

export { buildStoryUrl, parseStoryIdFromPath };

function setMetaContent(selector: string, content: string): void {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

/**
 * Updates the document title & Open Graph/Twitter meta tags to reflect the
 * currently focused story, so browser tabs, history entries, and any manual
 * sharing reflect the right headline even without server-side rendering.
 * The tag content itself comes from the storyMeta SSOT shared with the edge
 * prerender handler, so client and bot-facing metadata can never drift.
 */
export function applyStoryMeta(cluster: StoryCluster): void {
  const meta = buildStoryMetaDocument(cluster);
  document.title = meta.title;

  setMetaContent('meta[name="description"]', meta.description);
  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:description"]', meta.description);
  setMetaContent('meta[property="og:url"]', meta.url);
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:description"]', meta.description);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', meta.url);
}

export function pushStoryUrl(cluster: StoryCluster): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', new URL(buildStoryUrl(cluster.id)).pathname);
  applyStoryMeta(cluster);
}

export function buildStorySourcesUrl(clusterId: string): string {
  return `${buildStoryUrl(clusterId)}#sources-${clusterId}`;
}

export interface StoryTarget {
  clusterId: string | null;
  targetDrawer: 'sources' | 'ssb' | null;
}

/**
 * Resolves location pathname and hash into a target story cluster and target drawer.
 * Supports:
 * - #sources-${clusterId} or #/sources/${clusterId} (or /story/:id#sources) -> expands Sources Drawer
 * - /story/:id -> expands SSB Intelligence Drawer
 */
export function parseStoryTargetFromLocation(location: { pathname: string; hash?: string }): StoryTarget {
  const hash = location.hash || '';
  if (hash.startsWith('#sources-')) {
    const rawId = hash.slice('#sources-'.length);
    return { clusterId: decodeURIComponent(rawId), targetDrawer: 'sources' };
  }
  const sourcesSlashMatch = hash.match(/^#\/?sources\/([^/?#]+)/);
  if (sourcesSlashMatch?.[1]) {
    return { clusterId: decodeURIComponent(sourcesSlashMatch[1]), targetDrawer: 'sources' };
  }
  const pathClusterId = parseStoryIdFromPath(location.pathname);
  if (pathClusterId) {
    if (hash === '#sources' || hash === '#/sources') {
      return { clusterId: pathClusterId, targetDrawer: 'sources' };
    }
    return { clusterId: pathClusterId, targetDrawer: 'ssb' };
  }
  return { clusterId: null, targetDrawer: null };
}

/**
 * Resolves the current URL & hash to a story cluster (if any), expands its
 * corresponding drawer (sources drawer for #sources-*, ssb summary for standard story),
 * applies its meta tags, and scrolls it into view.
 */
export function deepLinkToStoryFromLocation(newsVm: NewsViewModel): void {
  if (typeof window === 'undefined') return;
  const { clusterId, targetDrawer } = parseStoryTargetFromLocation(window.location);
  if (!clusterId) return;

  const cluster = newsVm.getClusterById(clusterId);
  if (!cluster) return;

  applyStoryMeta(cluster);
  if (targetDrawer === 'sources') {
    if (!newsVm.isSourcesExpanded(cluster.id)) {
      newsVm.setSourcesExpanded(cluster.id, true);
    }
  } else if (targetDrawer === 'ssb') {
    if (!newsVm.isSSBExpanded(cluster.id) && cluster.ssbIntel) {
      newsVm.toggleSSBDrawer(cluster.id);
    }
  }

  requestAnimationFrame(() => {
    document.getElementById(`cluster-${cluster.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export async function copyStoryLink(clusterId: string): Promise<boolean> {
  const url = buildStoryUrl(clusterId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
