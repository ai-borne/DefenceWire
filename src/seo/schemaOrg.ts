/**
 * Schema.org JSON-LD Generator & Semantic Grounding for DefenceWire
 * Generates Google-compliant TechArticle, Product, and GovernmentOrganization schemas.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { OrbatUnit } from '../types/orbat.js';

const SITE_ORIGIN = 'https://www.defencewire.in';
const SITE_NAME = 'DefenceWire.in';
const SCRIPT_TAG_ID = 'dw-program-jsonld';

export interface ProgramJsonLdGraph {
  '@context': string;
  '@graph': Array<Record<string, unknown>>;
}

export function buildProgramJsonLdObject(
  program: StrategicProgram,
  orbatUnits: OrbatUnit[] = []
): ProgramJsonLdGraph {
  const permalink = `${SITE_ORIGIN}/#program/${program.id}`;

  const citations = [
    ...orbatUnits.map((u) => u.citation.sourceTitle),
    ...program.keyMilestones.map((m) => `${m.title} (${m.date})`)
  ].filter(Boolean);

  const keywords = Array.from(
    new Set([
      'Indian Defence',
      program.domain,
      program.stage,
      ...program.serviceBranch,
      ...(program.searchAliases ?? [])
    ])
  ).join(', ');

  const techArticleNode: Record<string, unknown> = {
    '@type': 'TechArticle',
    '@id': `${permalink}#article`,
    url: permalink,
    headline: `${program.name} — Sovereign Strategic Defence Platform Dossier`,
    description: program.summary,
    inLanguage: 'en',
    author: {
      '@type': 'GovernmentOrganization',
      name: program.leadAgency
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_ORIGIN}/icons/icon-512.png`
      }
    },
    about: {
      '@type': 'Thing',
      name: program.name,
      alternateName: program.searchAliases
    },
    keywords,
    citation: citations.length > 0 ? citations : undefined
  };

  const additionalProperties: Array<{ '@type': string; name: string; value: string | number }> = [
    { '@type': 'PropertyValue', name: 'Operational Domain', value: program.domain },
    { '@type': 'PropertyValue', name: 'Lifecycle Stage', value: program.stage },
    { '@type': 'PropertyValue', name: 'Indigenous Content (IDDM)', value: `${program.indigenousPercentage}%` }
  ];

  if (program.sanctionedBudgetCrores) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'Sanctioned Budget (INR Crores)',
      value: program.sanctionedBudgetCrores
    });
  }

  if (program.plannedUnits) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'Planned Procurement Units',
      value: program.plannedUnits
    });
  }

  const productNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${permalink}#product`,
    name: program.name,
    alternateName: program.shortName,
    model: program.officialDesignation || program.shortName,
    description: program.summary,
    category: `Military Equipment > ${program.domain.toUpperCase()}`,
    manufacturer: {
      '@type': 'GovernmentOrganization',
      name: program.leadAgency
    },
    additionalProperty: additionalProperties
  };

  const branchNodes = program.serviceBranch.map((branch) => {
    const branchUnits = orbatUnits.filter((u) => u.serviceBranch === branch);
    return {
      '@type': 'GovernmentOrganization',
      name: branch,
      department: branchUnits.map((u) => ({
        '@type': 'GovernmentOrganization',
        name: u.unitDesignation,
        location: u.baseLocation,
        operationalStatus: u.status
      }))
    };
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [techArticleNode, productNode, ...branchNodes]
  };
}

export function buildProgramJsonLd(
  program: StrategicProgram,
  orbatUnits: OrbatUnit[] = []
): string {
  const jsonObj = buildProgramJsonLdObject(program, orbatUnits);
  return JSON.stringify(jsonObj).replace(/</g, '\\u003c');
}

export function injectProgramJsonLd(
  program: StrategicProgram,
  orbatUnits: OrbatUnit[] = []
): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;

  removeProgramJsonLd();

  const script = document.createElement('script');
  script.id = SCRIPT_TAG_ID;
  script.type = 'application/ld+json';
  script.textContent = buildProgramJsonLd(program, orbatUnits);
  document.head.appendChild(script);

  return script;
}

export function removeProgramJsonLd(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(SCRIPT_TAG_ID);
  if (existing) {
    existing.remove();
  }
}
