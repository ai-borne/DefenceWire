/**
 * Geopolitical Scope Pill Component for DefenceWire.in
 * Visual discriminator for Indian Domestic vs Foreign/International military wire coverage.
 * Hard limit: <= 60 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { resolveClusterScope } from '../utils/sourceAttribution.js';

export function renderScopePill(cluster: StoryCluster): HTMLElement {
  const scope = resolveClusterScope(cluster);
  const pill = document.createElement('span');
  const isDomestic = scope === 'domestic';

  pill.className = `dw-scope-pill ${isDomestic ? 'dw-scope-pill--domestic' : 'dw-scope-pill--global'}`;
  const label = isDomestic ? STRINGS.story.domesticScopePill : STRINGS.story.globalScopePill;
  pill.textContent = label;
  pill.setAttribute('aria-label', label);

  return pill;
}
