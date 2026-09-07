/**
 * Public Pattern Banner Component (Phase 5 Display UI)
 * Renders the Situational Intelligence Matrix card for readers:
 * live radar signal indicator, confidence meter, synthesized hypothesis,
 * interactive entity pills, and deep-link bridge to the Obsidian Knowledge Graph.
 * Hard limit: <= 300 LOC.
 */

import { PATTERN_STRINGS } from '../../resources/patternStrings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { PublicPatternViewModel } from '../../viewmodels/PublicPatternViewModel.js';

export interface PublicPatternBannerOptions {
  onInspectInGraph?: (nodeIds: string[]) => void;
  onEntityClick?: (entityId: string) => void;
}

export function renderPublicPatternBanner(
  vm: PublicPatternViewModel,
  options: PublicPatternBannerOptions = {}
): HTMLElement {
  const banner = document.createElement('section');
  banner.className = 'dw-pattern-matrix-banner';
  banner.setAttribute('aria-label', PATTERN_STRINGS.publicHeading);

  const renderContent = () => {
    banner.innerHTML = '';

    if (vm.getIsDismissed() || vm.getTotalPatterns() === 0) {
      banner.classList.add('is-hidden');
      return;
    }

    banner.classList.remove('is-hidden');
    const pattern = vm.getActivePattern();
    if (!pattern) return;

    // 1. Header: Radar dot, brand label, confidence meter, pagination, dismiss
    const header = document.createElement('div');
    header.className = 'dw-pattern-banner-header';

    const brand = document.createElement('div');
    brand.className = 'dw-pattern-banner-brand';

    const radarDot = document.createElement('span');
    radarDot.className = 'dw-pattern-radar-dot';
    radarDot.setAttribute('aria-hidden', 'true');

    const brandLabel = document.createElement('span');
    brandLabel.className = 'dw-pattern-brand-label';
    brandLabel.textContent = PATTERN_STRINGS.radarLiveSignal;

    brand.appendChild(radarDot);
    brand.appendChild(brandLabel);
    header.appendChild(brand);

    const controls = document.createElement('div');
    controls.className = 'dw-pattern-header-controls';

    // Confidence badge
    const confidencePct = Math.round(pattern.confidence * 100);
    const confidenceBadge = document.createElement('div');
    confidenceBadge.className = 'dw-pattern-confidence-badge';
    confidenceBadge.title = `${PATTERN_STRINGS.confidenceLabel}: ${confidencePct}%`;

    const barBg = document.createElement('div');
    barBg.className = 'dw-pattern-confidence-bar-bg';

    const barFill = document.createElement('div');
    barFill.className = 'dw-pattern-confidence-bar-fill';
    barFill.style.width = `${Math.min(100, Math.max(0, confidencePct))}%`;
    barBg.appendChild(barFill);

    const confText = document.createElement('span');
    confText.textContent = `${confidencePct}%`;

    confidenceBadge.appendChild(barBg);
    confidenceBadge.appendChild(confText);
    controls.appendChild(confidenceBadge);

    // Carousel Pagination (if > 1 pattern)
    const total = vm.getTotalPatterns();
    if (total > 1) {
      const nav = document.createElement('div');
      nav.className = 'dw-pattern-nav-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'dw-pattern-nav-btn';
      prevBtn.type = 'button';
      prevBtn.setAttribute('aria-label', PATTERN_STRINGS.prevPattern);
      prevBtn.textContent = '◀';
      prevBtn.addEventListener('click', () => vm.prevPattern());

      const pageIndicator = document.createElement('span');
      pageIndicator.className = 'dw-pattern-page-indicator';
      pageIndicator.textContent = `${vm.getActiveIndex() + 1}/${total}`;

      const nextBtn = document.createElement('button');
      nextBtn.className = 'dw-pattern-nav-btn';
      nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', PATTERN_STRINGS.nextPattern);
      nextBtn.textContent = '▶';
      nextBtn.addEventListener('click', () => vm.nextPattern());

      nav.appendChild(prevBtn);
      nav.appendChild(pageIndicator);
      nav.appendChild(nextBtn);
      controls.appendChild(nav);
    }

    // Dismiss Button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'dw-pattern-dismiss-btn';
    dismissBtn.type = 'button';
    dismissBtn.setAttribute('aria-label', PATTERN_STRINGS.dismissLabel);
    dismissBtn.textContent = '✕';
    dismissBtn.addEventListener('click', () => vm.dismiss());
    controls.appendChild(dismissBtn);

    header.appendChild(controls);
    banner.appendChild(header);

    // 2. Title & Synthesis
    const title = document.createElement('h3');
    title.className = 'dw-pattern-title';
    title.textContent = sanitizePlainText(pattern.title);
    banner.appendChild(title);

    const synthesis = document.createElement('p');
    synthesis.className = 'dw-pattern-synthesis';
    synthesis.textContent = sanitizePlainText(pattern.synthesis);
    banner.appendChild(synthesis);

    // 3. Entity Pills
    if (pattern.nodeIds && pattern.nodeIds.length > 0) {
      const entitiesWrapper = document.createElement('div');
      entitiesWrapper.className = 'dw-pattern-entities';

      pattern.nodeIds.forEach((nodeId) => {
        const pill = document.createElement('button');
        pill.className = 'dw-pattern-entity-pill';
        pill.type = 'button';
        pill.textContent = `🏷️ ${sanitizePlainText(nodeId)}`;
        pill.addEventListener('click', () => {
          if (options.onEntityClick) {
            options.onEntityClick(nodeId);
          } else if (options.onInspectInGraph) {
            options.onInspectInGraph([nodeId]);
          }
        });
        entitiesWrapper.appendChild(pill);
      });

      banner.appendChild(entitiesWrapper);
    }

    // 4. Action Row: "Inspect in Intel Graph" & "Co-Occurring Signals" toggle
    const actions = document.createElement('div');
    actions.className = 'dw-pattern-actions';

    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'dw-pattern-btn-inspect';
    inspectBtn.type = 'button';
    inspectBtn.textContent = `🕸️ ${PATTERN_STRINGS.exploreInGraph}`;
    inspectBtn.addEventListener('click', () => {
      if (options.onInspectInGraph) {
        options.onInspectInGraph(pattern.nodeIds || []);
      }
    });
    actions.appendChild(inspectBtn);

    if (pattern.clusterIds && pattern.clusterIds.length > 0) {
      const signalsBtn = document.createElement('button');
      signalsBtn.className = 'dw-pattern-btn-signals';
      signalsBtn.type = 'button';
      signalsBtn.setAttribute('aria-expanded', vm.getIsExpanded() ? 'true' : 'false');
      signalsBtn.textContent = `⚡ ${PATTERN_STRINGS.coOccurringSignals} (${pattern.clusterIds.length}) ${vm.getIsExpanded() ? '▲' : '▼'}`;
      signalsBtn.addEventListener('click', () => vm.toggleExpanded());
      actions.appendChild(signalsBtn);
    }

    banner.appendChild(actions);

    // 5. Expandable Drawer: Co-Occurring Signals
    if (vm.getIsExpanded() && pattern.clusterIds && pattern.clusterIds.length > 0) {
      const drawer = document.createElement('div');
      drawer.className = 'dw-pattern-drawer';

      const drawerTitle = document.createElement('h4');
      drawerTitle.className = 'dw-pattern-drawer-title';
      drawerTitle.textContent = PATTERN_STRINGS.coOccurringSignals;
      drawer.appendChild(drawerTitle);

      const list = document.createElement('ul');
      list.className = 'dw-pattern-signals-list';

      pattern.clusterIds.forEach((clusterId) => {
        const item = document.createElement('li');
        item.className = 'dw-pattern-signal-item';

        const anchor = document.createElement('a');
        anchor.className = 'dw-pattern-signal-link';
        anchor.href = `#cluster-${clusterId}`;
        anchor.textContent = `• Cluster signal: ${clusterId}`;
        item.appendChild(anchor);
        list.appendChild(item);
      });

      drawer.appendChild(list);
      banner.appendChild(drawer);
    }
  };

  const unsubscribe = vm.subscribe(renderContent);
  renderContent();

  (banner as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    unsubscribe();
  };

  return banner;
}
