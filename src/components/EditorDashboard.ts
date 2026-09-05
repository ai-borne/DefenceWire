/**
 * Editorial Curator Dashboard Component for DefenceWire.in
 * Modular 5-Tab Workstation coordinating Wire Curation, Intelligence Review, Ecosystem Pipeline,
 * Crawler Health, and Source Scorecard.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel, EditorDeskPanel } from '../viewmodels/EditorViewModel.js';
import { SupplierCandidatesPanelViewModel } from '../viewmodels/SupplierCandidatesPanelViewModel.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { renderEditorAuthModal } from './EditorAuthModal.js';
import { renderWireCurationView } from './editor/WireCurationView.js';
import { renderIntelReviewView } from './editor/IntelReviewView.js';
import { renderSupplierCandidatesPanelView } from './SupplierCandidatesPanelView.js';
import { renderCrawlerHealthView } from './editor/CrawlerHealthView.js';
import { renderSourceScorecardView } from './editor/SourceScorecardView.js';
import { renderIngestView } from './editor/IngestView.js';
import { CuratorIngestViewModel } from '../viewmodels/CuratorIngestViewModel.js';
import { renderKnowledgeBaseView } from './editor/KnowledgeBaseView.js';
import { CuratorKnowledgeBaseViewModel } from '../viewmodels/CuratorKnowledgeBaseViewModel.js';
import knowledgeBaseStrings from '../resources/knowledgeBaseStrings.js';

// Module-scoped singletons: EditorDashboard.js is already lazy-loaded on first
// Curator Desk open, so owning these ViewModels here (rather than in the
// eagerly-bundled main.ts) keeps them out of the main reader bundle budget.
let ingestVmSingleton: CuratorIngestViewModel | null = null;

function getIngestViewModel(onChange: () => void): CuratorIngestViewModel {
  if (!ingestVmSingleton) {
    ingestVmSingleton = new CuratorIngestViewModel();
    ingestVmSingleton.subscribe(onChange);
  }
  return ingestVmSingleton;
}

let knowledgeBaseVmSingleton: CuratorKnowledgeBaseViewModel | null = null;

function getKnowledgeBaseViewModel(onChange: () => void): CuratorKnowledgeBaseViewModel {
  if (!knowledgeBaseVmSingleton) {
    knowledgeBaseVmSingleton = new CuratorKnowledgeBaseViewModel();
    knowledgeBaseVmSingleton.subscribe(onChange);
  }
  return knowledgeBaseVmSingleton;
}

export function renderEditorDashboard(
  editorVm: EditorViewModel,
  supplierCandidatesVm: SupplierCandidatesPanelViewModel,
  onIngestChange: () => void = () => {}
): HTMLElement {
  if (!editorVm.isAuthenticated()) {
    return renderEditorAuthModal(editorVm);
  }

  const overlay = document.createElement('div');
  overlay.className = 'dw-editor-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', STRINGS.editor.dashboardTitle);

  const panel = document.createElement('div');
  panel.className = 'dw-editor-panel';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dw-editor-header';

  const title = document.createElement('h2');
  title.className = 'dw-editor-title';
  title.textContent = `🎯 ${STRINGS.editor.dashboardTitle}`;

  const email = editorVm.getCuratorEmail();
  const provider = editorVm.getAuthProvider();
  if (email) {
    const badge = document.createElement('span');
    badge.className = 'dw-editor-identity-badge';
    badge.style.fontSize = '0.72rem';
    badge.style.fontWeight = '700';
    badge.style.padding = '3px 8px';
    badge.style.borderRadius = '4px';
    badge.style.background = provider === 'cloudflare_zero_trust' ? 'var(--dw-status-online-bg)' : 'var(--dw-bg-card)';
    badge.style.color = provider === 'cloudflare_zero_trust' ? 'var(--dw-status-online-text)' : 'var(--dw-text-secondary)';
    badge.style.border = '1px solid var(--dw-border-secondary)';
    badge.style.marginLeft = '12px';
    badge.textContent = provider === 'cloudflare_zero_trust'
      ? `🛡️ ${STRINGS.editor.zeroTrustBadge}: ${sanitizePlainText(email)}`
      : `⚡ ${STRINGS.editor.sessionBadge}`;
    title.appendChild(badge);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dw-editor-close';
  closeBtn.setAttribute('aria-label', STRINGS.editor.closeDashboard);
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => editorVm.setOpen(false);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // 2. Action Bar (Publish, Export, Copy, Lock)
  const actionBar = document.createElement('div');
  actionBar.className = 'dw-editor-action-bar';
  actionBar.style.padding = '8px 18px';
  actionBar.style.background = 'var(--dw-bg-secondary)';
  actionBar.style.borderBottom = '1px solid var(--dw-border-secondary)';
  actionBar.style.display = 'flex';
  actionBar.style.justifyContent = 'space-between';
  actionBar.style.alignItems = 'center';
  actionBar.style.flexWrap = 'wrap';
  actionBar.style.gap = '8px';

  const actionGroup = document.createElement('div');
  actionGroup.style.display = 'flex';
  actionGroup.style.gap = '6px';
  actionGroup.style.flexWrap = 'wrap';

  // Sync to Cloudflare D1 Button
  const publishBtn = document.createElement('button');
  publishBtn.type = 'button';
  publishBtn.className = 'dw-editor-btn dw-editor-btn--publish';
  publishBtn.textContent = editorVm.getIsPublishing() ? `⏳ ${STRINGS.editor.publishing}` : `🚀 ${STRINGS.editor.publishToProduction}`;
  publishBtn.disabled = editorVm.getIsPublishing();
  publishBtn.onclick = async () => {
    await editorVm.publishToProduction();
  };
  actionGroup.appendChild(publishBtn);

  // Purge Edge Cache Button
  const purgeBtn = document.createElement('button');
  purgeBtn.type = 'button';
  purgeBtn.className = 'dw-editor-btn dw-editor-btn--purge';
  purgeBtn.textContent = editorVm.getIsPurgingCache() ? `⏳ ${STRINGS.editor.purgingCache}` : `⚡ ${STRINGS.editor.purgeCache}`;
  purgeBtn.disabled = editorVm.getIsPurgingCache();
  purgeBtn.onclick = async () => {
    await editorVm.purgeEdgeCache();
  };
  actionGroup.appendChild(purgeBtn);

  // Rollback Last Publish Button (kill-switch)
  const rollbackBtn = document.createElement('button');
  rollbackBtn.type = 'button';
  rollbackBtn.className = 'dw-editor-btn dw-editor-btn--rollback';
  rollbackBtn.textContent = editorVm.getIsRollingBack() ? `⏳ ${STRINGS.editor.rollingBack}` : `↩️ ${STRINGS.editor.rollbackLastPublish}`;
  rollbackBtn.disabled = editorVm.getIsRollingBack();
  rollbackBtn.onclick = async () => {
    await editorVm.rollbackToPreviousPublish();
  };
  actionGroup.appendChild(rollbackBtn);

  // Export JSON Button
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'dw-editor-btn dw-editor-btn--export';
  exportBtn.textContent = `💾 ${STRINGS.editor.exportJson}`;
  exportBtn.onclick = () => {
    const jsonStr = editorVm.exportCuratedJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'news.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  actionGroup.appendChild(exportBtn);

  // Copy JSON Button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  copyBtn.textContent = `📋 ${STRINGS.editor.copyJson}`;
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(editorVm.exportCuratedJson());
      alert(STRINGS.editor.copiedToClipboard);
    } catch {
      // Fallback
    }
  };
  actionGroup.appendChild(copyBtn);

  // Lock Desk Button
  const lockBtn = document.createElement('button');
  lockBtn.type = 'button';
  lockBtn.className = 'dw-editor-btn dw-editor-btn--lock';
  lockBtn.textContent = `🔒 ${STRINGS.editor.lockDesk}`;
  lockBtn.onclick = () => editorVm.logout();

  actionBar.appendChild(actionGroup);
  actionBar.appendChild(lockBtn);
  panel.appendChild(actionBar);

  // Status message banner if any
  const statusMsg = editorVm.getPublishStatusMessage();
  if (statusMsg) {
    const banner = document.createElement('div');
    banner.style.padding = '6px 18px';
    banner.style.fontSize = '0.78rem';
    banner.style.fontWeight = '600';
    banner.style.background = 'var(--dw-bg-card)';
    banner.style.borderBottom = '1px solid var(--dw-border-secondary)';
    banner.style.color = statusMsg.includes('Error') || statusMsg.includes('Failed') || statusMsg.includes('required')
      ? 'var(--dw-text-accent)'
      : 'var(--dw-badge-text)';
    banner.textContent = sanitizePlainText(statusMsg);
    panel.appendChild(banner);
  }

  // 3. 5-Tab Workstation Navigation
  const deskTabs = document.createElement('div');
  deskTabs.className = 'dw-editor-desk-tabs';
  deskTabs.style.padding = '8px 18px';
  deskTabs.style.background = 'var(--dw-bg-secondary)';
  deskTabs.style.borderBottom = '1px solid var(--dw-border-secondary)';

  const panelTabs: Array<{ id: EditorDeskPanel; label: string }> = [
    { id: 'stories', label: STRINGS.curatorDesk.tabWire },
    { id: 'intel', label: STRINGS.curatorDesk.tabIntel },
    { id: 'supplierCandidates', label: STRINGS.editorSupplierCandidates.panelTabLabel },
    { id: 'crawler', label: STRINGS.curatorDesk.tabCrawler },
    { id: 'scorecard', label: STRINGS.curatorDesk.tabScorecard },
    { id: 'ingest', label: STRINGS.ingest.tabLabel },
    { id: 'knowledgeBase', label: knowledgeBaseStrings.tabLabel }
  ];

  for (const tab of panelTabs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = editorVm.isPanelActive(tab.id);
    btn.className = `dw-editor-desk-tab ${isSelected ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.onclick = () => editorVm.setActiveDeskPanel(tab.id);
    deskTabs.appendChild(btn);
  }
  panel.appendChild(deskTabs);

  // 4. Render Active Workstation View
  if (editorVm.isPanelActive('supplierCandidates')) {
    panel.appendChild(renderSupplierCandidatesPanelView(supplierCandidatesVm));
  } else if (editorVm.isPanelActive('intel')) {
    panel.appendChild(renderIntelReviewView(editorVm));
  } else if (editorVm.isPanelActive('crawler')) {
    panel.appendChild(renderCrawlerHealthView(editorVm));
  } else if (editorVm.isPanelActive('scorecard')) {
    panel.appendChild(renderSourceScorecardView(editorVm));
  } else if (editorVm.isPanelActive('ingest')) {
    panel.appendChild(renderIngestView(getIngestViewModel(onIngestChange)));
  } else if (editorVm.isPanelActive('knowledgeBase')) {
    panel.appendChild(renderKnowledgeBaseView(getKnowledgeBaseViewModel(onIngestChange)));
  } else {
    panel.appendChild(renderWireCurationView(editorVm));
  }

  overlay.appendChild(panel);
  return overlay;
}
