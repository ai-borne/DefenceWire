/**
 * Curator Desk — Tab 2: Intelligence Review View for DefenceWire.in
 * Inspects and refines synthesized domain intelligence briefs, SSB insights, and takeaways.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../../viewmodels/EditorViewModel.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { renderSSBEditor, renderHeadlineEditor } from '../EditorCandidateCard.js';
import { StoryCluster } from '../../types/news.js';

export type IntelFilterMode = 'all' | 'ssb' | 'summary';

export function renderIntelReviewView(editorVm: EditorViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  // State local to the view (or synced from query)
  let filterMode: IntelFilterMode = 'all';
  let searchQuery: string = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'dw-editor-toolbar';

  const filters = document.createElement('div');
  filters.className = 'dw-editor-filters';

  const tabOptions: Array<{ mode: IntelFilterMode; label: string }> = [
    { mode: 'all', label: STRINGS.curatorDesk.filterAllIntel },
    { mode: 'ssb', label: STRINGS.curatorDesk.filterHasSsb },
    { mode: 'summary', label: STRINGS.curatorDesk.filterHasSummary }
  ];

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-editor-search';
  searchInput.placeholder = STRINGS.curatorDesk.searchIntelPlaceholder;

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';

  const renderContent = () => {
    contentArea.innerHTML = '';
    const allClusters = editorVm.getCandidateClusters();
    const query = searchQuery.trim().toLowerCase();

    const filtered = allClusters.filter((c: StoryCluster) => {
      const intel = c.ssbIntel;
      if (filterMode === 'ssb' && (!intel?.gdLecturettePoints?.length && !intel?.potentialInterviewQuestions?.length)) return false;
      if (filterMode === 'summary' && !intel?.whyItMatters && !intel?.strategicAngle && !intel?.defenceTechTakeaway) return false;
      if (query) {
        const inHead = c.synthesizedHeadline.toLowerCase().includes(query);
        const inEntities = c.entities.some((e) => e.toLowerCase().includes(query));
        if (!inHead && !inEntities) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--dw-text-muted)';
      empty.style.fontSize = '0.85rem';
      empty.textContent = STRINGS.curatorDesk.noIntelFound;
      contentArea.appendChild(empty);
      return;
    }

    for (const cluster of filtered) {
      const card = document.createElement('div');
      card.className = 'dw-intel-card';

      const headRow = document.createElement('div');
      headRow.className = 'dw-editor-card-header';

      const title = document.createElement('h3');
      title.className = 'dw-editor-headline';
      title.textContent = sanitizePlainText(cluster.synthesizedHeadline);

      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'dw-editor-score-badge';
      scoreBadge.textContent = `${STRINGS.editor.scoreLabel}: ${Math.round(cluster.defenceScore)}`;

      headRow.appendChild(title);
      headRow.appendChild(scoreBadge);
      card.appendChild(headRow);

      const meta = document.createElement('div');
      meta.className = 'dw-editor-card-info';
      meta.textContent = `${STRINGS.story.primarySourcePrefix} ${cluster.primarySource.sourceName} • ${cluster.entities.join(', ') || 'General'}`;
      card.appendChild(meta);

      // 1. Why It Matters / Key Takeaway Section
      const whyItMattersText = cluster.ssbIntel?.whyItMatters;
      if (whyItMattersText) {
        const sec = document.createElement('div');
        sec.className = 'dw-intel-section';
        const secTitle = document.createElement('div');
        secTitle.className = 'dw-intel-section-title';
        secTitle.textContent = STRINGS.curatorDesk.whyItMattersLabel;
        const secBody = document.createElement('p');
        secBody.className = 'dw-intel-section-body';
        secBody.textContent = sanitizePlainText(whyItMattersText);
        sec.appendChild(secTitle);
        sec.appendChild(secBody);
        card.appendChild(sec);
      }

      // 2. Strategic Angle Section
      if (cluster.ssbIntel?.strategicAngle) {
        const sec = document.createElement('div');
        sec.className = 'dw-intel-section';
        const secTitle = document.createElement('div');
        secTitle.className = 'dw-intel-section-title';
        secTitle.textContent = STRINGS.curatorDesk.strategicAngleLabel;
        const secBody = document.createElement('p');
        secBody.className = 'dw-intel-section-body';
        secBody.textContent = sanitizePlainText(cluster.ssbIntel.strategicAngle);
        sec.appendChild(secTitle);
        sec.appendChild(secBody);
        card.appendChild(sec);
      }

      // 3. Key Specifications / Metrics Section
      const techSpecs = cluster.ssbIntel?.defenceTechTakeaway;
      if (techSpecs) {
        const sec = document.createElement('div');
        sec.className = 'dw-intel-section';
        const secTitle = document.createElement('div');
        secTitle.className = 'dw-intel-section-title';
        secTitle.textContent = STRINGS.curatorDesk.keySpecsLabel;
        const secBody = document.createElement('p');
        secBody.className = 'dw-intel-section-body';
        const specSummary = techSpecs.keySignificance || (techSpecs.specifications ? techSpecs.specifications.join(', ') : '');
        secBody.textContent = sanitizePlainText(specSummary);
        sec.appendChild(secTitle);
        sec.appendChild(secBody);
        card.appendChild(sec);
      }

      // Inline Edit Dialog Container
      const formContainer = document.createElement('div');
      card.appendChild(formContainer);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'dw-editor-actions';

      const editHeadBtn = document.createElement('button');
      editHeadBtn.type = 'button';
      editHeadBtn.className = 'dw-editor-btn';
      editHeadBtn.textContent = STRINGS.editor.editHeadline;
      editHeadBtn.onclick = () => renderHeadlineEditor(formContainer, cluster, editorVm);
      actions.appendChild(editHeadBtn);

      const editSsbBtn = document.createElement('button');
      editSsbBtn.type = 'button';
      editSsbBtn.className = 'dw-editor-btn dw-editor-btn--promote';
      editSsbBtn.textContent = STRINGS.curatorDesk.editBriefBtn;
      editSsbBtn.onclick = () => renderSSBEditor(formContainer, cluster, editorVm);
      actions.appendChild(editSsbBtn);

      card.appendChild(actions);
      contentArea.appendChild(card);
    }
  };

  for (const tab of tabOptions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-editor-filter-tab ${filterMode === tab.mode ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.onclick = () => {
      filterMode = tab.mode;
      filters.querySelectorAll('.dw-editor-filter-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderContent();
    };
    filters.appendChild(btn);
  }

  searchInput.oninput = (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderContent();
  };

  toolbar.appendChild(filters);
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);
  container.appendChild(contentArea);

  renderContent();
  return container;
}
