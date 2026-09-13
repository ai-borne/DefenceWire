import type { PublicTopic } from '../../services/topicReadHandler.js';
import topicStrings from '../../resources/topicStrings.js';

export function orderedTopics(topics: readonly PublicTopic[]): PublicTopic[] { return [...topics].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0) || a.id.localeCompare(b.id)); }
export function renderTopicBadgeList(topics: readonly PublicTopic[], onOpen: (id: string) => void): HTMLElement | null {
  const ordered = orderedTopics(topics); if (!ordered.length) return null;
  const list = document.createElement('div'); list.className = 'dw-topic-badge-list'; list.setAttribute('aria-label', topicStrings.badgeListAria);
  for (const topic of ordered.slice(0, 3)) { const badge = document.createElement('button'); badge.type = 'button'; badge.className = 'dw-topic-badge'; badge.textContent = topic.displayHashtag; badge.setAttribute('aria-label', `${topicStrings.openTopicAria} ${topic.displayName}`); badge.addEventListener('click', (event) => { event.stopPropagation(); onOpen(topic.id); }); list.appendChild(badge); }
  if (ordered.length > 3) { const more = document.createElement('span'); more.className = 'dw-topic-badge dw-topic-badge--more'; more.textContent = `+${ordered.length - 3}`; more.setAttribute('aria-label', `${ordered.length - 3} ${topicStrings.moreTopics}`); list.appendChild(more); }
  return list;
}
