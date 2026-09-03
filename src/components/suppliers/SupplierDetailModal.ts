/**
 * Supplier Dossier Modal Component for DefenceWire.in (Phase 2.4)
 * Accessible tabbed supplier dossier, mirroring ProgramDetailModal.ts's
 * role="tablist"/"tab"/"tabpanel" pattern via the shared DossierTabController.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';
import { StoryCluster } from '../../types/news.js';
import { getLinkedProgramCount } from '../../data/suppliers/programSupplierMapper.js';
import { buildDossierTabs } from '../DossierTabController.js';
import { renderSupplierOverviewView } from './SupplierOverviewView.js';
import { renderSupplierCapabilitiesView } from './SupplierCapabilitiesView.js';
import { renderSupplierLinkedProgramsView } from './SupplierLinkedProgramsView.js';
import { renderSupplierIndigenisationView } from './SupplierIndigenisationView.js';
import { renderSupplierWireMentionsView } from './SupplierWireMentionsView.js';

export interface SupplierDetailModalOptions {
  relatedClusters?: StoryCluster[];
  onClose?: () => void;
}

export function openSupplierDetailModal(
  supplier: SupplierProfile,
  options: SupplierDetailModalOptions = {}
): HTMLElement {
  const existing = document.getElementById('dw-supplier-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-supplier-modal';
  backdrop.className = 'dw-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `${STRINGS.suppliers.heading}: ${supplier.name}`);

  const modal = document.createElement('div');
  modal.className = 'dw-modal-content dw-supplier-modal-content';

  let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  const closeModal = () => {
    if (typeof window !== 'undefined' && handleKeyDown) {
      window.removeEventListener('keydown', handleKeyDown);
      handleKeyDown = null;
    }
    backdrop.classList.add('dw-modal-closing');
    setTimeout(() => {
      backdrop.remove();
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#supplier/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      options.onClose?.();
    }, 150);
  };

  const header = document.createElement('div');
  header.className = 'dw-modal-header dw-supplier-modal-header';
  const titleMeta = document.createElement('div');
  titleMeta.className = 'dw-supplier-modal-title-meta';
  const linkedCount = getLinkedProgramCount(supplier.id);
  titleMeta.innerHTML = `
    <span class="dw-supplier-tier-badge dw-supplier-tier--${supplier.tier}">${sanitizePlainText(supplier.tier.toUpperCase())}</span>
    <h2 class="dw-modal-title dw-supplier-modal-title">${sanitizePlainText(supplier.name)}</h2>
    <div class="dw-supplier-modal-linked-count">${STRINGS.suppliers.linkedProgramsPrefix} ${linkedCount} ${STRINGS.suppliers.linkedProgramsSuffix}</div>
  `;
  header.appendChild(titleMeta);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', STRINGS.suppliers.modalCloseAria);
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const tabDefs = [
    { id: 'overview', label: STRINGS.suppliers.tabOverview },
    { id: 'capabilities', label: STRINGS.suppliers.tabCapabilities },
    { id: 'linked', label: STRINGS.suppliers.tabLinkedPrograms },
    { id: 'indigenisation', label: STRINGS.suppliers.tabIndigenisation },
    { id: 'wire', label: STRINGS.suppliers.tabWireMentions }
  ];

  const tabList = document.createElement('div');
  tabList.className = 'dw-supplier-modal-tabs';
  const body = document.createElement('div');
  body.className = 'dw-modal-body dw-supplier-modal-body';

  const panels: Record<string, HTMLElement> = {
    overview: renderSupplierOverviewView(supplier),
    capabilities: renderSupplierCapabilitiesView(supplier),
    linked: renderSupplierLinkedProgramsView(supplier),
    indigenisation: renderSupplierIndigenisationView(supplier),
    wire: renderSupplierWireMentionsView(supplier, options.relatedClusters ?? [])
  };
  Object.entries(panels).forEach(([id, panel]) => {
    panel.id = `dw-supplier-tabpanel-${id}`;
    panel.className = `dw-supplier-tabpanel ${id === 'overview' ? 'active' : ''}`;
  });

  buildDossierTabs(tabList, body, tabDefs, panels, {
    tabIdPrefix: 'dw-supplier-tab',
    tabBtnClass: 'dw-supplier-tab-btn',
    ariaLabel: STRINGS.suppliers.tabAriaLabel,
    defaultId: 'overview'
  });

  modal.appendChild(tabList);
  modal.appendChild(body);
  backdrop.appendChild(modal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeyDown);

  document.body.appendChild(backdrop);
  return backdrop;
}
