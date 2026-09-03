/**
 * Supplier Meta SSOT for DefenceWire.in
 * Single source of truth for /supplier/:slug URLs, OpenGraph / Twitter metadata,
 * Schema.org Corporation / GovernmentOrganization JSON-LD, and static semantic HTML prerendering.
 * Hard limit: <= 300 LOC. Target: < 160 LOC.
 */

import { SupplierProfile } from '../types/suppliers.js';
import { StoryMetaDocument } from './storyMeta.js';
import { STRINGS } from '../resources/strings.js';

const SITE_NAME = STRINGS.app.name;
const SITE_ORIGIN = 'https://www.defencewire.in';
const SUPPLIER_PATH_PREFIX = '/supplier/';
const DEFAULT_OG_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`;

export function buildSupplierUrl(slug: string): string {
  return `${SITE_ORIGIN}${SUPPLIER_PATH_PREFIX}${slug}`;
}

export function parseSupplierIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(SUPPLIER_PATH_PREFIX)) return null;
  const id = pathname.slice(SUPPLIER_PATH_PREFIX.length).trim().replace(/\/+$/, '');
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

export function buildSupplierJsonLd(supplier: SupplierProfile): string {
  const url = buildSupplierUrl(supplier.slug);
  const isDpsu = supplier.tier === 'dpsu';

  const graph: Record<string, unknown>[] = [
    {
      '@type': isDpsu ? 'GovernmentOrganization' : 'Corporation',
      '@id': `${url}#org`,
      url,
      name: supplier.name,
      alternateName: supplier.aliases && supplier.aliases.length > 0 ? supplier.aliases : undefined,
      description: supplier.description,
      address: {
        '@type': 'PostalAddress',
        addressLocality: supplier.hqCity,
        addressRegion: supplier.hqState,
        addressCountry: 'IN'
      },
      knowsAbout: supplier.capabilities.map((c) => c.capabilityDomain),
      ...(supplier.corridor ? { memberOf: { '@type': 'Organization', name: `${supplier.corridor} Defence Industrial Corridor` } } : {}),
      ...(supplier.website ? { sameAs: [supplier.website] } : {}),
      ...(supplier.stockSymbol ? { tickerSymbol: supplier.stockSymbol } : {})
    }
  ];

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph
  }).replace(/<\/script>/gi, '<\\/script>');
}

export function buildSupplierSemanticBodyHtml(supplier: SupplierProfile): string {
  const name = escapeHtml(supplier.name);
  const tier = escapeHtml(supplier.tier.toUpperCase().replace(/_/g, ' '));
  const location = escapeHtml(`${supplier.hqCity}, ${supplier.hqState}`);
  const description = escapeHtml(supplier.description);

  const capabilitiesHtml = supplier.capabilities.length > 0
    ? supplier.capabilities
        .map((c) => `<li><strong>${escapeHtml(c.capabilityDomain)}</strong>: ${escapeHtml(c.certifications.join(', ') || 'Certified')}</li>`)
        .join('')
    : '<li><em>Defence Manufacturing</em></li>';

  const linkedProgramsHtml = supplier.linkedPrograms.length > 0
    ? supplier.linkedPrograms
        .map((lp) => `<li><strong>Program:</strong> ${escapeHtml(lp.programId)} — <em>${escapeHtml(lp.subsystemName)}</em> (${escapeHtml(lp.indigenisationStatus.replace(/_/g, ' '))})</li>`)
        .join('')
    : '<li><em>Sovereign supply chain partner</em></li>';

  return `
    <article class="dw-supplier-prerender-dossier" itemscope itemtype="https://schema.org/Corporation">
      <header>
        <span class="dw-tier-tag">${tier}</span>
        <h1 itemprop="name">${name}</h1>
        <p class="dw-location-meta">HQ: <strong>${location}</strong> ${supplier.corridor ? `• Corridor: <strong>${escapeHtml(supplier.corridor)}</strong>` : ''} ${supplier.stockSymbol ? `• Ticker: <strong>${escapeHtml(supplier.stockSymbol)}</strong>` : ''}</p>
      </header>
      <section class="dw-summary-section">
        <h2>Corporate & Strategic Overview</h2>
        <p itemprop="description">${description}</p>
      </section>
      <section class="dw-capabilities-section">
        <h2>Core Defence Capabilities</h2>
        <ul>${capabilitiesHtml}</ul>
      </section>
      <section class="dw-linked-programs-section">
        <h2>Integrated Defence Programs & Subsystems</h2>
        <ul>${linkedProgramsHtml}</ul>
      </section>
    </article>
  `.trim();
}

export function buildSupplierMetaDocument(supplier: SupplierProfile): StoryMetaDocument {
  const url = buildSupplierUrl(supplier.slug);
  const title = `${supplier.name} — Indian Defence Industrial Ecosystem Dossier | ${SITE_NAME}`;
  const description = `${supplier.description.slice(0, 155)}...`;
  const jsonLd = buildSupplierJsonLd(supplier);
  const semanticBodyHtml = buildSupplierSemanticBodyHtml(supplier);

  return {
    title,
    description,
    url,
    imageUrl: DEFAULT_OG_IMAGE_URL,
    jsonLd,
    semanticBodyHtml
  };
}
