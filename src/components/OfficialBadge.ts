/**
 * Official Badge & Primary Source Citation Sub-Component for DefenceWire.in
 * Renders verified government badges (Lok Sabha, Rajya Sabha, PIB MoD, Tender, iDEX)
 * and parliament Q&A metadata with safe links to official PDFs.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem, OfficialSourceType, ParliamentQuestionMeta } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';

/**
 * Resolves the appropriate OfficialSourceType based on source metadata,
 * parliament question details, domain, and source reliability tier.
 */
export function resolveOfficialType(source: StorySourceItem): OfficialSourceType | null {
  if (source.officialType) {
    return source.officialType;
  }

  if (source.parliamentMeta?.house === 'Lok Sabha') {
    return 'lok_sabha';
  }
  if (source.parliamentMeta?.house === 'Rajya Sabha') {
    return 'rajya_sabha';
  }

  const domain = source.sourceDomain?.toLowerCase() || '';
  const name = source.sourceName?.toLowerCase() || '';

  if (domain.includes('defproc') || domain.includes('eprocure') || domain.includes('tenders.gov.in')) {
    return 'tender';
  }

  if (domain.includes('idex.gov.in') || domain.includes('tdf.drdo.in')) {
    return 'idex';
  }

  if (
    source.tier === SourceTier.TIER_1_OFFICIAL ||
    domain === 'pib.gov.in' ||
    domain === 'drdo.gov.in' ||
    domain === 'indiannavy.nic.in' ||
    domain === 'indianairforce.nic.in' ||
    domain === 'indianarmy.nic.in' ||
    name.includes('press information bureau') ||
    name.includes('ministry of defence')
  ) {
    return 'pib_mod';
  }

  return null;
}

/**
 * Retrieves the display label from STRINGS for an official badge type.
 */
function getBadgeLabel(type: OfficialSourceType): string {
  switch (type) {
    case 'lok_sabha':
      return STRINGS.badges.lokSabha;
    case 'rajya_sabha':
      return STRINGS.badges.rajyaSabha;
    case 'tender':
      return STRINGS.badges.tender;
    case 'idex':
      return STRINGS.badges.idex;
    case 'pib_mod':
    default:
      return STRINGS.badges.pibMod;
  }
}

/**
 * Retrieves the CSS class modifier for styling each official badge type.
 */
function getBadgeClassModifier(type: OfficialSourceType): string {
  switch (type) {
    case 'lok_sabha':
      return 'dw-official-badge--lok-sabha';
    case 'rajya_sabha':
      return 'dw-official-badge--rajya-sabha';
    case 'tender':
      return 'dw-official-badge--tender';
    case 'idex':
      return 'dw-official-badge--idex';
    case 'pib_mod':
    default:
      return 'dw-official-badge--pib';
  }
}

/**
 * Renders structured parliament metadata pills and official PDF link.
 */
export function renderParliamentMetaDetails(meta: ParliamentQuestionMeta): HTMLElement {
  const detailsEl = document.createElement('div');
  detailsEl.className = 'dw-parliament-details';

  // 1. Question Number & Question Type (Starred / Unstarred)
  if (meta.questionNumber) {
    const qTag = document.createElement('span');
    qTag.className = 'dw-parliament-tag';
    const qNumText = sanitizePlainText(String(meta.questionNumber));
    const qTypeText = meta.questionType ? ` • ${sanitizePlainText(meta.questionType)}` : '';
    qTag.textContent = `${qNumText}${qTypeText}`;
    detailsEl.appendChild(qTag);
  }

  // 2. Answering Date
  if (meta.answeringDate) {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'dw-parliament-date';
    dateSpan.textContent = sanitizePlainText(meta.answeringDate);
    detailsEl.appendChild(dateSpan);
  }

  // 3. Minister / Ministry
  const ministerOrMinistry = [meta.minister, meta.ministry].filter(Boolean).join(', ');
  if (ministerOrMinistry) {
    const ministerSpan = document.createElement('span');
    ministerSpan.className = 'dw-parliament-minister';
    ministerSpan.textContent = sanitizePlainText(ministerOrMinistry);
    detailsEl.appendChild(ministerSpan);
  }

  // 4. Official PDF Direct Document Link
  if (meta.pdfUrl) {
    const pdfLink = document.createElement('a');
    pdfLink.className = 'dw-official-pdf-link';
    const safeAttrs = getSafeLinkAttributes(meta.pdfUrl);
    pdfLink.href = safeAttrs.href;
    pdfLink.target = safeAttrs.target;
    pdfLink.rel = safeAttrs.rel;
    pdfLink.setAttribute('aria-label', STRINGS.badges.pdfAria);
    pdfLink.textContent = `📄 ${STRINGS.badges.pdfLabel}`;
    detailsEl.appendChild(pdfLink);
  }

  return detailsEl;
}

/**
 * Renders an official badge container if the story source represents an official
 * government communique, tender, startup challenge, or sworn parliamentary question.
 */
export function renderOfficialBadge(source: StorySourceItem): HTMLElement | null {
  const type = resolveOfficialType(source);
  if (!type) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'dw-official-badge-container';

  const badgeEl = document.createElement('span');
  badgeEl.className = `dw-official-badge ${getBadgeClassModifier(type)}`;
  badgeEl.textContent = getBadgeLabel(type);
  container.appendChild(badgeEl);

  if (source.parliamentMeta) {
    const metaDetails = renderParliamentMetaDetails(source.parliamentMeta);
    container.appendChild(metaDetails);
  }

  return container;
}
