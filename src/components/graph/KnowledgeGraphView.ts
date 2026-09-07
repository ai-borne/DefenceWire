/**
 * Knowledge Graph Container View Component (Phase 3)
 * Full split-screen view with category filters, micro-canvas graph,
 * time scrubber, and interactive entity intelligence inspector.
 * Hard limit: <= 300 LOC.
 */

import graphStrings from '../../resources/graphStrings.js';
import threadStrings from '../../resources/threadStrings.js';
import { NodeCategory } from '../../types/graph.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../../utils/security.js';
import { KnowledgeGraphViewModel } from '../../viewmodels/KnowledgeGraphViewModel.js';
import { KnowledgeGraphCanvas } from './KnowledgeGraphCanvas.js';
import { renderTimeScrubber } from './TimeScrubber.js';

interface CategoryTab {
  id: NodeCategory | 'all';
  label: string;
}

const CATEGORY_TABS: readonly CategoryTab[] = [
  { id: 'all', label: graphStrings.categoryFilterAll },
  { id: 'platform', label: 'Platforms' },
  { id: 'threat', label: 'Threats' },
  { id: 'facility', label: 'Facilities' },
  { id: 'location', label: 'Locations' },
  { id: 'organization', label: 'Agencies' },
  { id: 'program', label: 'Programs' }
] as const;

export function renderKnowledgeGraphView(vm: KnowledgeGraphViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-graph-view';

  // 1. Header & Subtitle
  const header = document.createElement('div');
  header.className = 'dw-graph-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'dw-graph-title-row';

  const title = document.createElement('h2');
  title.className = 'dw-graph-title';
  title.textContent = `🕸️ ${graphStrings.tabTitle}`;

  const subtitle = document.createElement('p');
  subtitle.className = 'dw-graph-subtitle';
  subtitle.textContent = graphStrings.tabSubtitle;

  titleRow.appendChild(title);
  header.appendChild(titleRow);
  header.appendChild(subtitle);

  // 2. Filter Controls & Search Bar
  const controls = document.createElement('div');
  controls.className = 'dw-graph-controls';

  const categoryBar = document.createElement('div');
  categoryBar.className = 'dw-graph-category-bar';
  categoryBar.setAttribute('role', 'tablist');

  CATEGORY_TABS.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `dw-graph-tab ${vm.getActiveCategory() === cat.id ? 'active' : ''}`;
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', vm.getActiveCategory() === cat.id ? 'true' : 'false');
    btn.textContent = cat.label;

    btn.addEventListener('click', () => {
      vm.setActiveCategory(cat.id);
      categoryBar.querySelectorAll('.dw-graph-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
    });
    categoryBar.appendChild(btn);
  });

  const searchInput = document.createElement('input');
  searchInput.className = 'dw-graph-search';
  searchInput.type = 'search';
  searchInput.placeholder = graphStrings.searchPlaceholder;
  searchInput.setAttribute('aria-label', graphStrings.searchPlaceholder);
  searchInput.value = vm.getSearchQuery();
  searchInput.addEventListener('input', (e) => {
    vm.setSearchQuery((e.target as HTMLInputElement).value);
  });

  controls.appendChild(categoryBar);
  controls.appendChild(searchInput);
  header.appendChild(controls);
  container.appendChild(header);

  // 3. Main Split Content (Canvas + Inspector)
  const splitLayout = document.createElement('div');
  splitLayout.className = 'dw-graph-layout';

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'dw-graph-canvas-wrapper';

  const canvas = document.createElement('canvas');
  canvas.className = 'dw-graph-canvas';
  canvas.setAttribute('aria-label', graphStrings.canvasAriaLabel);

  // Floating Canvas Controls
  const floatingControls = document.createElement('div');
  floatingControls.className = 'dw-graph-floating-controls';

  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'dw-graph-btn';
  zoomInBtn.textContent = '+';
  zoomInBtn.title = graphStrings.zoomIn;

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'dw-graph-btn';
  zoomOutBtn.textContent = '−';
  zoomOutBtn.title = graphStrings.zoomOut;

  const resetBtn = document.createElement('button');
  resetBtn.className = 'dw-graph-btn';
  resetBtn.textContent = '↺';
  resetBtn.title = graphStrings.resetView;

  floatingControls.appendChild(zoomInBtn);
  floatingControls.appendChild(zoomOutBtn);
  floatingControls.appendChild(resetBtn);

  canvasWrapper.appendChild(canvas);
  canvasWrapper.appendChild(floatingControls);

  // Time Scrubber mount
  const scrubber = renderTimeScrubber(vm);
  canvasWrapper.appendChild(scrubber);

  // 4. Inspector Sidebar
  const inspector = document.createElement('aside');
  inspector.className = 'dw-graph-inspector';
  inspector.setAttribute('aria-label', graphStrings.inspectorTitle);

  const updateInspector = () => {
    inspector.innerHTML = '';
    const { node, neighbors, incidentEdges } = vm.getSelectedNodeDetails();

    if (!node) {
      const empty = document.createElement('div');
      empty.className = 'dw-graph-inspector-empty';
      empty.innerHTML = `<span class="dw-graph-empty-icon">🎯</span><p>${graphStrings.inspectorNoSelection}</p>`;
      inspector.appendChild(empty);
      return;
    }

    const card = document.createElement('div');
    card.className = 'dw-graph-inspector-card';

    const nodeTitle = document.createElement('h3');
    nodeTitle.className = 'dw-graph-inspector-name';
    nodeTitle.textContent = sanitizePlainText(node.label);

    const metaRow = document.createElement('div');
    metaRow.className = 'dw-graph-inspector-meta';

    const catBadge = document.createElement('span');
    catBadge.className = `dw-graph-badge dw-graph-cat-${node.category}`;
    catBadge.textContent = node.category.toUpperCase();

    const degreeBadge = document.createElement('span');
    degreeBadge.className = 'dw-graph-badge dw-graph-badge-degree';
    degreeBadge.textContent = `${graphStrings.inspectorDegreeLabel}: ${node.degree}`;

    metaRow.appendChild(catBadge);
    metaRow.appendChild(degreeBadge);
    card.appendChild(nodeTitle);
    card.appendChild(metaRow);

    // Timestamps
    const datesRow = document.createElement('p');
    datesRow.className = 'dw-graph-inspector-dates';
    datesRow.textContent = `${graphStrings.inspectorFirstSeen}: ${node.firstSeenAt.slice(0, 10)} • ${graphStrings.inspectorLastSeen}: ${node.lastSeenAt.slice(0, 10)}`;
    card.appendChild(datesRow);

    // 2-Hop neighborhood button
    const focusBtn = document.createElement('button');
    focusBtn.className = 'dw-graph-btn-action';
    focusBtn.textContent = `🔍 ${graphStrings.inspectorFocusTwoHop}`;
    focusBtn.addEventListener('click', () => {
      vm.loadSubgraph(node.id);
    });
    card.appendChild(focusBtn);

    const threadBtn = document.createElement('button');
    threadBtn.className = 'dw-graph-btn-action dw-graph-btn-thread';
    threadBtn.textContent = `🔗 ${threadStrings.viewFullThread}`;
    threadBtn.addEventListener('click', () => {
      import('../threads/ThreadDetailModal.js')
        .then(({ openThreadDetailModal }) => {
          openThreadDetailModal(node.id);
        })
        .catch(() => {});
    });
    card.appendChild(threadBtn);

    // Connected Linkages List
    const linksHeading = document.createElement('h4');
    linksHeading.className = 'dw-graph-inspector-subhead';
    linksHeading.textContent = `${graphStrings.inspectorConnectedLinks} (${incidentEdges.length})`;
    card.appendChild(linksHeading);

    const linkList = document.createElement('div');
    linkList.className = 'dw-graph-link-list';

    incidentEdges.forEach((edge) => {
      const neighbor = neighbors.find((n) => n.id === (edge.sourceId === node.id ? edge.targetId : edge.sourceId));
      if (!neighbor) return;

      const item = document.createElement('div');
      item.className = 'dw-graph-link-item';

      const edgeLabel = document.createElement('span');
      edgeLabel.className = 'dw-graph-link-predicate';
      edgeLabel.textContent = edge.predicate.replace(/_/g, ' ');

      const neighborName = document.createElement('span');
      neighborName.className = 'dw-graph-link-neighbor';
      neighborName.textContent = sanitizePlainText(neighbor.label);

      const statePill = document.createElement('span');
      statePill.className = `dw-graph-state-pill dw-graph-state-${edge.epistemicState.toLowerCase()}`;
      statePill.textContent = edge.epistemicState;

      item.appendChild(edgeLabel);
      item.appendChild(neighborName);
      item.appendChild(statePill);

      if (edge.sourceUrl) {
        const srcLink = document.createElement('a');
        const safeAttrs = getSafeLinkAttributes(edge.sourceUrl);
        srcLink.href = safeAttrs.href;
        srcLink.target = safeAttrs.target;
        srcLink.rel = safeAttrs.rel;
        srcLink.className = 'dw-graph-source-link';
        srcLink.textContent = '↗';
        srcLink.title = graphStrings.inspectorViewSources;
        item.appendChild(srcLink);
      }

      item.addEventListener('click', () => {
        vm.setSelectedNodeId(neighbor.id);
      });

      linkList.appendChild(item);
    });

    card.appendChild(linkList);
    inspector.appendChild(card);
  };

  splitLayout.appendChild(canvasWrapper);
  splitLayout.appendChild(inspector);
  container.appendChild(splitLayout);

  // Initialize Canvas engine
  const graphCanvas = new KnowledgeGraphCanvas(canvas, vm);

  zoomInBtn.addEventListener('click', () => graphCanvas.zoomIn());
  zoomOutBtn.addEventListener('click', () => graphCanvas.zoomOut());
  resetBtn.addEventListener('click', () => graphCanvas.resetView());

  const unsubscribeInspector = vm.subscribe(updateInspector);
  updateInspector();

  // Load initial graph data if not yet loaded
  vm.loadSubgraph();

  // Cleanup hook
  (container as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    graphCanvas.destroy();
    unsubscribeInspector();
    vm.destroy();
  };

  return container;
}
