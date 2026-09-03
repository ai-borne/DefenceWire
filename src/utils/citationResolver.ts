/**
 * Automated Government Citation Deep-Link Resolver for DefenceWire.in
 * Deterministically resolves official Indian defence citations to primary
 * government archives (PIB, Sansad Committees, MoD, DRDO, e-Gazette).
 * Hard limit: <= 300 LOC. Target: < 120 LOC.
 */

import { OrbatCitation } from '../types/orbat.js';

export interface ResolvedCitationLink {
  url: string;
  sourceLabel: string;
  isDirectDocument: boolean;
}

const PIB_BASE_URL = 'https://pib.gov.in/PressReleasePage.aspx?PRID=';
const SANSAD_COMMITTEES_URL = 'https://sansad.in/ls/committees/reports';
const SANSAD_QUESTIONS_URL = 'https://sansad.in/ls/questions/questions-search';
const MOD_DAC_URL = 'https://mod.gov.in/dod/defence-acquisition-council';
const MOD_ANNUAL_REPORTS_URL = 'https://mod.gov.in/documents/annual-report';
const DRDO_PORTAL_URL = 'https://www.drdo.gov.in/';
const EGAZETTE_URL = 'https://egazette.gov.in/';

export function resolveCitationUrl(citation: OrbatCitation): string {
  // 1. Return explicit URL if provided
  if (citation.url && citation.url.startsWith('http')) {
    return citation.url;
  }

  const doc = citation.documentNumber ?? '';
  const title = citation.sourceTitle ?? '';
  const combined = `${doc} ${title}`;

  // 2. Direct PIB Press Release (PRID)
  const pibMatch = combined.match(/PIB(?:\s+ID|\s+Release)?\s*[:#-]?\s*(\d{5,8})/i);
  if (pibMatch && pibMatch[1]) {
    return `${PIB_BASE_URL}${pibMatch[1]}`;
  }

  // 3. Parliamentary Questions (Starred / Unstarred)
  if (/Lok Sabha.*(?:Starred|Unstarred)\s*Q/i.test(combined) || /Rajya Sabha.*Q/i.test(combined)) {
    return SANSAD_QUESTIONS_URL;
  }

  // 4. Parliamentary Standing Committee Reports
  if (/Standing Committee|Report No|Lok Sabha.*Report/i.test(combined)) {
    return SANSAD_COMMITTEES_URL;
  }

  // 5. Defence Acquisition Council (DAC) Decisions
  if (/DAC\b|Defence Acquisition Council/i.test(combined)) {
    return MOD_DAC_URL;
  }

  // 6. MoD Annual Reports & Communiques
  if (/MoD Annual Report|MoD-AR|Ministry of Defence/i.test(combined)) {
    return MOD_ANNUAL_REPORTS_URL;
  }

  // 7. DRDO Portals & Communiques
  if (/DRDO/i.test(combined)) {
    return DRDO_PORTAL_URL;
  }

  // 8. Official Gazette
  if (/Gazette/i.test(combined)) {
    return EGAZETTE_URL;
  }

  // 9. SourceType Fallbacks
  switch (citation.sourceType) {
    case 'pib_release':
      return 'https://pib.gov.in/';
    case 'parliamentary_report':
      return SANSAD_COMMITTEES_URL;
    case 'dac_decision':
      return MOD_DAC_URL;
    case 'mod_annual_report':
      return MOD_ANNUAL_REPORTS_URL;
    case 'gazette_notification':
      return EGAZETTE_URL;
    default:
      return 'https://mod.gov.in/';
  }
}

export function resolveCitationLink(citation: OrbatCitation): ResolvedCitationLink {
  const url = resolveCitationUrl(citation);
  const isDirectPib = url.includes('PRID=');

  let sourceLabel = 'Official Source';
  if (url.includes('pib.gov.in')) {
    sourceLabel = isDirectPib ? 'PIB Press Release' : 'Press Information Bureau';
  } else if (url.includes('sansad.in')) {
    sourceLabel = url.includes('questions') ? 'Sansad Q&A Portal' : 'Parliamentary Committee Report';
  } else if (url.includes('mod.gov.in')) {
    sourceLabel = url.includes('defence-acquisition-council') ? 'DAC Decision Portal' : 'Ministry of Defence';
  } else if (url.includes('drdo.gov.in')) {
    sourceLabel = 'DRDO Official Portal';
  } else if (url.includes('egazette.gov.in')) {
    sourceLabel = 'The Gazette of India';
  }

  return {
    url,
    sourceLabel,
    isDirectDocument: isDirectPib
  };
}
