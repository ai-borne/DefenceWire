/**
 * Tenders/RFP Explorer View Component for DefenceWire.in
 * Status/domain filters, keyword search, and a paginated tender listing.
 * Also backs the iDEX/TDF tab (TendersViewModel.sourceScope='idex') — same
 * view, filtered listing, per the MOAT3 plan (not a separate view: DRY).
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { Tender, TenderStatus } from '../types/tenders.js';
import { TendersViewModel } from '../viewmodels/TendersViewModel.js';
import { openTenderDetailModal } from './TenderDetailModal.js';
import { IDEX_TDF_SOURCES } from '../tenders/tenderSearchQueryBuilder.js';

const DOMAIN_OPTIONS: readonly { id: string | 'all'; label: string }[] = [
  { id: 'all', label: STRINGS.tenders.domainAllLabel },
  { id: 'Army', label: STRINGS.nav.army },
  { id: 'Navy', label: STRINGS.nav.navy },
  { id: 'Air Force', label: STRINGS.nav.airforce },
  { id: 'DRDO', label: STRINGS.tenders.domainDrdo }
];

const STATUS_TABS: readonly { id: TenderStatus | 'all'; label: string }[] = [
  { id: 'active', label: STRINGS.tenders.statusActive },
  { id: 'closed', label: STRINGS.tenders.statusClosed },
  { id: 'cancelled', label: STRINGS.tenders.statusCancelled },
  { id: 'all', label: STRINGS.tenders.statusAll }
];

function formatEmd(amount: number | null): string {
  if (amount == null) return STRINGS.tenders.notAvailable;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function sourceBadgeClass(source: string): string {
  return (IDEX_TDF_SOURCES as readonly string[]).includes(source) ? 'dw-tender-badge--idex' : 'dw-tender-badge--mod';
}

function renderTenderCard(tender: Tender, onSelect: (t: Tender) => void): HTMLElement {
  const card = document.createElement('article');
  card.className = `dw-tender-card dw-tender-card--${tender.status}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${STRINGS.tenders.viewOfficialListing} ${tender.title}`);

  const badgeRow = document.createElement('div');
  badgeRow.className = 'dw-tender-badge-row';

  const sourceBadge = document.createElement('span');
  sourceBadge.className = `dw-tender-badge ${sourceBadgeClass(tender.source)}`;
  sourceBadge.textContent = sanitizePlainText(tender.source.toUpperCase());
  badgeRow.appendChild(sourceBadge);

  const statusBadge = document.createElement('span');
  statusBadge.className = `dw-tender-status-badge dw-tender-status--${tender.status}`;
  statusBadge.textContent = sanitizePlainText(tender.status.toUpperCase());
  badgeRow.appendChild(statusBadge);

  if (tender.domain) {
    const domainBadge = document.createElement('span');
    domainBadge.className = 'dw-tender-badge dw-tender-badge--domain';
    domainBadge.textContent = sanitizePlainText(tender.domain);
    badgeRow.appendChild(domainBadge);
  }

  card.appendChild(badgeRow);

  const title = document.createElement('h3');
  title.className = 'dw-tender-title';
  title.textContent = sanitizePlainText(tender.title);
  card.appendChild(title);

  const org = document.createElement('div');
  org.className = 'dw-tender-org';
  org.textContent = sanitizePlainText(tender.organisationChain);
  card.appendChild(org);

  const metaRow = document.createElement('div');
  metaRow.className = 'dw-tender-meta-row';
  const closingText = tender.closingAt
    ? `${STRINGS.tenders.closingLabel}: ${formatTimeAgo(tender.closingAt)}`
    : `${STRINGS.tenders.closingLabel}: ${STRINGS.tenders.closingNotAvailable}`;
  const metaParts = [closingText, `${STRINGS.tenders.emdLabel}: ${formatEmd(tender.emdAmount)}`];
  if (tender.category) metaParts.push(sanitizePlainText(tender.category));
  metaRow.textContent = metaParts.join(' • ');
  card.appendChild(metaRow);

  const activate = () => onSelect(tender);
  card.addEventListener('click', activate);
  card.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });

  return card;
}

export function renderTendersExplorerView(tendersVm: TendersViewModel): HTMLElement {
  tendersVm.ensureLoaded();

  const container = document.createElement('div');
  container.className = 'dw-tenders-explorer';

  const isIdex = tendersVm.getSourceScope() === 'idex';

  const headerBlock = document.createElement('div');
  headerBlock.className = 'dw-tenders-header-block';

  const heading = document.createElement('h2');
  heading.className = 'dw-headline--lead';
  heading.textContent = isIdex ? `🚀 ${STRINGS.tenders.idexHeading}` : `📑 ${STRINGS.tenders.heading}`;
  headerBlock.appendChild(heading);

  const sub = document.createElement('p');
  sub.className = 'dw-snippet';
  sub.textContent = isIdex ? STRINGS.tenders.idexSubheading : STRINGS.tenders.subheading;
  headerBlock.appendChild(sub);

  container.appendChild(headerBlock);

  // Controls: search + status filter
  const controlsBar = document.createElement('div');
  controlsBar.className = 'dw-tenders-controls-bar';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-tenders-search-input';
  searchInput.placeholder = STRINGS.tenders.searchPlaceholder;
  searchInput.value = tendersVm.getSearchQuery();
  searchInput.setAttribute('aria-label', STRINGS.tenders.searchPlaceholder);
  searchInput.addEventListener('input', () => {
    tendersVm.setSearchQuery(searchInput.value);
  });
  controlsBar.appendChild(searchInput);

  const domainSelect = document.createElement('select');
  domainSelect.className = 'dw-tenders-domain-select';
  domainSelect.setAttribute('aria-label', STRINGS.tenders.domainAllLabel);
  DOMAIN_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    option.selected = tendersVm.getDomain() === opt.id;
    domainSelect.appendChild(option);
  });
  domainSelect.addEventListener('change', () => {
    tendersVm.setDomain(domainSelect.value);
  });
  controlsBar.appendChild(domainSelect);

  container.appendChild(controlsBar);

  // Status filter tabs
  const statusNav = document.createElement('div');
  statusNav.className = 'dw-tenders-status-nav';
  statusNav.setAttribute('role', 'tablist');

  const activeStatus = tendersVm.getStatus();
  STATUS_TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-tender-status-tab ${tab.id === activeStatus ? 'active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === activeStatus ? 'true' : 'false');
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      tendersVm.setStatus(tab.id);
    });
    statusNav.appendChild(btn);
  });
  container.appendChild(statusNav);

  if (tendersVm.getErrorMessage()) {
    const errorBanner = document.createElement('p');
    errorBanner.className = 'dw-snippet dw-tenders-error-banner';
    errorBanner.textContent = STRINGS.tenders.errorBanner;
    container.appendChild(errorBanner);
  }

  const results = tendersVm.getResults();
  const grid = document.createElement('div');
  grid.className = 'dw-tenders-grid';

  if (results.length === 0 && !tendersVm.isLoading()) {
    const empty = document.createElement('div');
    empty.className = 'dw-cluster dw-tenders-empty';
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.tenders.noResults;
    empty.appendChild(p);
    grid.appendChild(empty);
  } else {
    results.forEach((tender) => {
      grid.appendChild(
        renderTenderCard(tender, (t) => {
          if (typeof window !== 'undefined') {
            window.location.hash = `#tender/${encodeURIComponent(t.id)}`;
          }
          tendersVm.setSelectedTender(t);
          openTenderDetailModal(t, {
            onClose: () => tendersVm.setSelectedTender(null)
          });
        })
      );
    });
  }
  container.appendChild(grid);

  if (tendersVm.hasMore()) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'dw-tenders-load-more-btn';
    loadMoreBtn.textContent = tendersVm.isLoadingMore() ? STRINGS.tenders.loadingMore : STRINGS.tenders.loadMore;
    loadMoreBtn.disabled = tendersVm.isLoadingMore();
    loadMoreBtn.addEventListener('click', () => {
      void tendersVm.loadMore();
    });
    container.appendChild(loadMoreBtn);
  }

  return container;
}
