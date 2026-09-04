/**
 * Story Sources Drawer Component for DefenceWire.in
 * Houses corroborating coverage links and official discussion quotes/perspectives.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanSourceName } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';

export function renderStorySourcesDrawer(
  cluster: Pick<StoryCluster, 'id' | 'relatedCoverage' | 'discussions'>
): HTMLElement {
  const drawer = document.createElement('section');
  drawer.className = 'dw-sources-drawer';
  drawer.id = `sources-drawer-${cluster.id}`;
  drawer.setAttribute('aria-label', STRINGS.story.relatedCoverageHeading);

  // 1. Corroborating Coverage Sub-list
  if (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) {
    const relatedBox = document.createElement('div');
    relatedBox.className = 'dw-related-box';

    const relatedHeading = document.createElement('div');
    relatedHeading.className = 'dw-related-heading';
    relatedHeading.textContent = `${STRINGS.story.relatedCoverageHeading}:`;
    relatedBox.appendChild(relatedHeading);

    const relatedUl = document.createElement('ul');
    relatedUl.className = 'dw-related-list';

    for (const item of cluster.relatedCoverage) {
      const li = document.createElement('li');
      li.className = 'dw-related-item';

      const link = document.createElement('a');
      const safeAttrs = getSafeLinkAttributes(item.url);
      link.href = safeAttrs.href;
      link.target = safeAttrs.target;
      link.rel = safeAttrs.rel;
      link.textContent = sanitizePlainText(item.title);

      const itemMeta = document.createElement('span');
      itemMeta.className = 'dw-river-meta';
      itemMeta.style.marginLeft = '6px';
      const cleanName = sanitizePlainText(cleanSourceName(item.sourceName));
      const timeAgo = item.publishedAt ? formatTimeAgo(item.publishedAt) : '';
      itemMeta.textContent = timeAgo ? `(${cleanName}, ${timeAgo})` : `(${cleanName})`;

      li.appendChild(link);
      li.appendChild(itemMeta);
      relatedUl.appendChild(li);
    }

    relatedBox.appendChild(relatedUl);
    drawer.appendChild(relatedBox);
  }

  // 2. Perspectives & Official Quotes
  if (cluster.discussions && cluster.discussions.length > 0) {
    const discBox = document.createElement('div');
    discBox.className = 'dw-discussions';

    const discHeading = document.createElement('div');
    discHeading.className = 'dw-related-heading';
    discHeading.textContent = `${STRINGS.story.perspectivesHeading}:`;
    discBox.appendChild(discHeading);

    for (const disc of cluster.discussions) {
      const quoteP = document.createElement('p');
      quoteP.className = 'dw-discussion-quote';
      quoteP.textContent = `“${sanitizePlainText(disc.quote)}”`;

      const metaP = document.createElement('div');
      metaP.className = 'dw-discussion-meta';

      const authorSpan = document.createElement('span');
      authorSpan.textContent = `— ${sanitizePlainText(disc.author)}, ${sanitizePlainText(disc.handleOrTitle)} `;
      metaP.appendChild(authorSpan);

      if (disc.sourcePlatform === 'X/Twitter' || disc.handleOrTitle.includes('@')) {
        const verifiedBadge = document.createElement('span');
        verifiedBadge.className = 'dw-verified-badge';
        verifiedBadge.textContent = `✓ ${STRINGS.story.officialSignalBadge}`;
        metaP.appendChild(verifiedBadge);
      }

      if (disc.url) {
        const discLink = document.createElement('a');
        const safeAttrs = getSafeLinkAttributes(disc.url);
        discLink.href = safeAttrs.href;
        discLink.target = safeAttrs.target;
        discLink.rel = safeAttrs.rel;
        discLink.className = 'dw-discussion-link';
        discLink.textContent = `[${sanitizePlainText(disc.sourcePlatform)}]`;
        metaP.appendChild(discLink);
      } else {
        const platformSpan = document.createElement('span');
        platformSpan.className = 'dw-discussion-platform';
        platformSpan.textContent = `[${sanitizePlainText(disc.sourcePlatform)}]`;
        metaP.appendChild(platformSpan);
      }

      discBox.appendChild(quoteP);
      discBox.appendChild(metaP);
    }

    drawer.appendChild(discBox);
  }

  return drawer;
}
