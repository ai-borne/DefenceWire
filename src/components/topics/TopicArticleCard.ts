import type { PublicTopicArticle } from '../../services/topicReadHandler.js';
import { getSafeLinkAttributes } from '../../utils/security.js';
import topicStrings from '../../resources/topicStrings.js';

export function renderTopicArticleCard(article: PublicTopicArticle): HTMLElement {
  const card = document.createElement('article'); card.className = 'dw-topic-article-card';
  const title = document.createElement('h3'); const link = document.createElement('a'); const attrs = getSafeLinkAttributes(article.primarySource.canonicalUrl ?? ''); Object.assign(link, attrs); link.textContent = article.primarySource.title; title.appendChild(link); card.appendChild(title);
  if (article.primarySource.snippet) { const snippet = document.createElement('p'); snippet.textContent = article.primarySource.snippet; card.appendChild(snippet); }
  const observed = document.createElement('time'); observed.className = 'dw-topic-observed-at'; observed.dateTime = article.publishedAt; observed.textContent = `${topicStrings.observationLabel}: ${new Date(article.publishedAt).toLocaleDateString()}`; card.appendChild(observed);
  const sources = document.createElement('ul'); sources.className = 'dw-topic-sources'; sources.setAttribute('aria-label', topicStrings.sources);
  for (const source of article.sources) { const item = document.createElement('li'); item.textContent = source.title; sources.appendChild(item); } card.appendChild(sources);
  return card;
}
