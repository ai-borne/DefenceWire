/**
 * Program Meta SSOT for DefenceWire.in
 * Single source of truth for /program/:id URLs, OpenGraph / Twitter metadata,
 * Schema.org JSON-LD, and static semantic HTML prerendering.
 * Consumed by edge prerender handler and client permalink routing.
 * Hard limit: <= 300 LOC. Target: < 180 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { OrbatUnit } from '../types/orbat.js';
import { StoryMetaDocument } from './storyMeta.js';
import { buildProgramJsonLd } from './schemaOrg.js';
import { STRINGS } from '../resources/strings.js';
import { resolveCitationLink } from '../utils/citationResolver.js';

const SITE_NAME = STRINGS.app.name;
const SITE_ORIGIN = 'https://www.defencewire.in';
const PROGRAM_PATH_PREFIX = '/program/';
const DEFAULT_OG_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`;

export function buildProgramUrl(programId: string): string {
  return `${SITE_ORIGIN}${PROGRAM_PATH_PREFIX}${programId}`;
}

export function parseProgramIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(PROGRAM_PATH_PREFIX)) return null;
  const id = pathname.slice(PROGRAM_PATH_PREFIX.length).trim().replace(/\/+$/, '');
  return id.length > 0 ? id : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildProgramSemanticBodyHtml(
  program: StrategicProgram,
  orbatUnits: OrbatUnit[] = []
): string {
  const name = escapeHtml(program.name);
  const domain = escapeHtml(program.domain.toUpperCase());
  const stage = escapeHtml(program.stage.toUpperCase());
  const summary = escapeHtml(program.summary);
  const agency = escapeHtml(program.leadAgency);
  const branches = escapeHtml(program.serviceBranch.join(', '));
  const budget = program.sanctionedBudgetCrores
    ? `₹${program.sanctionedBudgetCrores.toLocaleString('en-IN')} Cr`
    : 'TBD';

  const unitsHtml = orbatUnits.length > 0
    ? orbatUnits
        .map((u) => {
          const cite = resolveCitationLink(u.citation);
          return `
          <li class="dw-orbat-prerender-unit">
            <strong>${escapeHtml(u.unitDesignation)}</strong> ${u.nickname ? `(<em>"${escapeHtml(u.nickname)}"</em>)` : ''} — 
            <span>${escapeHtml(u.baseLocation)} (${escapeHtml(u.command)})</span> — 
            <span>Status: ${escapeHtml(u.status)}</span>
            <div class="dw-citation-meta">
              <a href="${escapeHtml(cite.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u.citation.sourceTitle)}</a> (${escapeHtml(cite.sourceLabel)})
            </div>
          </li>`;
        })
        .join('')
    : `<li><em>${escapeHtml(STRINGS.programs.orbatNoUnits)}</em></li>`;

  return `
    <article class="dw-program-prerender-dossier" itemscope itemtype="https://schema.org/TechArticle">
      <header>
        <span class="dw-domain-tag">${domain}</span> • <span class="dw-stage-tag">${stage}</span>
        <h1 itemprop="headline">${name}</h1>
        <p class="dw-agency-meta">Lead Agency: <strong>${agency}</strong> • Service: <strong>${branches}</strong> • Budget: <strong>${budget}</strong> • IDDM: <strong>${program.indigenousPercentage}%</strong></p>
      </header>
      <section class="dw-summary-section">
        <h2>Strategic Overview</h2>
        <p itemprop="description">${summary}</p>
      </section>
      <section class="dw-orbat-section">
        <h2>Order of Battle & Operational Deployments</h2>
        <ul class="dw-orbat-unit-list">
          ${unitsHtml}
        </ul>
      </section>
    </article>
  `.trim();
}

export function buildProgramMetaDocument(
  program: StrategicProgram,
  orbatUnits: OrbatUnit[] = []
): StoryMetaDocument {
  const url = buildProgramUrl(program.id);
  const title = `${program.name} — Indian Defence Strategic Dossier | ${SITE_NAME}`;
  const description = `${program.summary.slice(0, 155)}...`;
  const jsonLd = buildProgramJsonLd(program, orbatUnits);
  const semanticBodyHtml = buildProgramSemanticBodyHtml(program, orbatUnits);

  return {
    title,
    description,
    url,
    imageUrl: DEFAULT_OG_IMAGE_URL,
    jsonLd,
    semanticBodyHtml
  };
}
