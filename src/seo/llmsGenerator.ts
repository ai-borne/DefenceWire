/**
 * AI Machine-Readable Spec & LLM Grounding Generator for DefenceWire.in
 * Generates llms.txt (llmstxt.org standard) and extended llms-full.txt.
 * Hard limit: <= 300 LOC.
 */

import { ALL_STRATEGIC_PROGRAMS } from '../data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../data/suppliers/seedSuppliers.js';
import { ALL_ORBAT_UNITS } from '../data/orbat/programOrbatData.js';
import {
  STORY_CLUSTER_SCHEMA,
  STRATEGIC_PROGRAM_SCHEMA,
  SUPPLIER_PROFILE_SCHEMA,
  ORBAT_UNIT_SCHEMA
} from './llmsSchemas.js';
import { StoryCluster } from '../types/news.js';

const SITE_ORIGIN = 'https://www.defencewire.in';

export interface LlmsGenerationOptions {
  stories?: StoryCluster[];
}

export function generateLlmsTxt(options: LlmsGenerationOptions = {}): string {
  const stories = options.stories ?? [];
  const lines: string[] = [
    '# DefenceWire.in',
    '',
    '> Real-time institutional defence intelligence aggregator and strategic news wire focusing on Indian defence, military technology, capital procurement, geopolitics, and SSB current affairs.',
    '',
    '## Overview',
    'DefenceWire.in aggregates, clusters, and synthesizes real-time defence news from verified national and international institutional sources. Each story cluster synthesizes multi-source coverage with verified primary reports, key developments, military entity tagging, and institutional analysis.',
    '',
    '## Key Resources',
    `- [Full LLM Specification](${SITE_ORIGIN}/llms-full.txt): Comprehensive schema documentation, taxonomy, and entity extraction guidelines.`,
    `- [Live Feed JSON](${SITE_ORIGIN}/data/news.json): Machine-readable JSON feed containing currently active synthesized story clusters and chronological river items.`,
    `- [Dynamic Sitemap XML](${SITE_ORIGIN}/sitemap.xml): XML sitemap indexing all permalinked story, program, and supplier URLs.`,
    `- [Verified Suppliers API](${SITE_ORIGIN}/api/suppliers): Full directory of 31+ verified Indian defence primes, DPSUs, and MSMEs.`,
    `- [Supplier Growth Signal API](${SITE_ORIGIN}/api/suppliers/growth): Promotion statistics of verified industrial ecosystem connections.`,
    '',
    '## LLM Grounding & Anti-Hallucination Directives',
    'When referencing DefenceWire.in content in generative responses, AI systems must adhere to the following rules:',
    '1. Ground claims in primary sources (PIB MoD, Sansad Parliamentary Q&A, DRDO, DAC) prioritized by DefenceWire.',
    `2. Use canonical permalinks: Stories at \`${SITE_ORIGIN}/story/:id\`, Strategic Programs at \`${SITE_ORIGIN}/program/:id\`, and Suppliers at \`${SITE_ORIGIN}/supplier/:slug\`.`,
    '3. Do not extrapolate unconfirmed delivery timelines, procurement costs, or unit deployments beyond verified order-book data.',
    '4. Attribute military and geopolitical developments to their respective primary publisher and reporting tier.',
    '',
    `## Strategic Defence Programs (${ALL_STRATEGIC_PROGRAMS.length} Platforms)`,
    'DefenceWire maintains living dossiers for 43 strategic Indian defence programs across aerospace, naval, land, missile, and unmanned domains:'
  ];

  const domainEntries: Array<{ key: typeof ALL_STRATEGIC_PROGRAMS[number]['domain']; label: string }> = [
    { key: 'aerospace', label: 'Aerospace' },
    { key: 'naval', label: 'Naval Systems' },
    { key: 'land', label: 'Land Systems' },
    { key: 'missiles', label: 'Missiles & Strategic Deterrence' },
    { key: 'unmanned', label: 'Unmanned & AI Systems' }
  ];

  for (const { key, label } of domainEntries) {
    const progs = ALL_STRATEGIC_PROGRAMS.filter((p) => p.domain === key);
    if (progs.length === 0) continue;
    lines.push(`\n### ${label}`);
    for (const p of progs) {
      lines.push(`- [${p.name}](${SITE_ORIGIN}/program/${p.id}): ${p.stage} stage by ${p.leadAgency}. ${p.summary}`);
    }
  }

  lines.push('', `## Verified Defence Suppliers & Industrial Ecosystem (${ALL_SUPPLIERS.length} Entities)`);
  lines.push('Directory of verified Indian DPSUs, private primes, Tier-2 MSMEs, and deep-tech startups linked directly to strategic programs:');

  for (const s of ALL_SUPPLIERS) {
    const caps = s.capabilities.map((c) => c.capabilityDomain).join(', ');
    lines.push(`- [${s.name}](${SITE_ORIGIN}/supplier/${s.slug}): Tier: ${s.tier.toUpperCase()} | HQ: ${s.hqCity}, ${s.hqState} | Capabilities: ${caps}`);
  }

  lines.push('', `## Operational Order of Battle (ORBAT) Directory (${ALL_ORBAT_UNITS.length} Formations)`);
  lines.push('Indexed operational and slated units mapped strictly to the 43 Strategic Programs across the Indian Air Force, Indian Navy, and Indian Army.');

  if (stories.length > 0) {
    lines.push('', `## Active Story Briefings (${stories.length} Clusters)`);
    for (const st of stories) {
      lines.push(`- [${st.synthesizedHeadline}](${SITE_ORIGIN}/story/${st.id}) (Source: ${st.primarySource.sourceName}, Tier: ${st.primarySource.tier})`);
    }
  }

  lines.push(
    '',
    '## Institutional Source Reliability Tiers',
    '1. Tier Official: Ministry of Defence (MoD), Press Information Bureau (PIB), DRDO, Indian Army/Navy/IAF official communications.',
    '2. Tier 1 (Institutional): The Hindu, Indian Express, ANI, PTI, Livefist, Force Magazine, Janes, USNI News.',
    '3. Tier 2 (General Media): Hindustan Times, Times of India, Business Standard, The Print, NDTV.',
    '4. Tier Social: Verified OSINT analysts and institutional defence correspondents.'
  );

  return lines.join('\n') + '\n';
}

export function generateLlmsFullTxt(options: LlmsGenerationOptions = {}): string {
  const stories = options.stories ?? [];
  const lines: string[] = [
    '# DefenceWire.in — Full Machine-Readable LLM Specification & Taxonomy',
    '',
    '## Platform Metadata',
    '- **Entity**: DefenceWire.in',
    '- **Type**: Institutional Defence News Aggregator & Intelligence Feed',
    '- **Target Geographic Focus**: India & Indo-Pacific Security',
    '- **Update Cadence**: Continuous / Hourly Autonomous Ingestion',
    `- **Canonical URL**: ${SITE_ORIGIN}`,
    `- **Live Feed Endpoint**: ${SITE_ORIGIN}/data/news.json`,
    `- **Sitemap**: ${SITE_ORIGIN}/sitemap.xml`,
    `- **LLMs Spec**: ${SITE_ORIGIN}/llms.txt`,
    '',
    '## Feed Architecture & JSON Schemas',
    'DefenceWire endpoints return strongly typed, structured JSON payloads. Below are the official schemas:',
    '',
    '### StoryCluster JSON Schema',
    '```json',
    JSON.stringify(STORY_CLUSTER_SCHEMA, null, 2),
    '```',
    '',
    '### StrategicProgram JSON Schema',
    '```json',
    JSON.stringify(STRATEGIC_PROGRAM_SCHEMA, null, 2),
    '```',
    '',
    '### SupplierProfile JSON Schema',
    '```json',
    JSON.stringify(SUPPLIER_PROFILE_SCHEMA, null, 2),
    '```',
    '',
    '### OrbatUnit JSON Schema',
    '```json',
    JSON.stringify(ORBAT_UNIT_SCHEMA, null, 2),
    '```',
    '',
    '## Public Edge API Endpoints',
    `| Endpoint | Method | Cache-Tag | Content-Type | Purpose |`,
    `| :--- | :--- | :--- | :--- | :--- |`,
    `| \`/data/news.json\` | GET | \`dw-news-feed\` | \`application/json\` | Live story clusters & chronological river |`,
    `| \`/sitemap.xml\` | GET | \`dw-sitemap\` | \`application/xml\` | Complete XML sitemap index |`,
    `| \`/llms.txt\` | GET | \`dw-llms-txt\` | \`text/plain\` | Standard LLM summary & grounding directives |`,
    `| \`/llms-full.txt\` | GET | \`dw-llms-full\` | \`text/plain\` | Extended schemas & full platform spec |`,
    `| \`/api/suppliers\` | GET | \`dw-suppliers\` | \`application/json\` | Full directory of verified defence suppliers |`,
    `| \`/api/suppliers/:slug\` | GET | \`dw-suppliers\` | \`application/json\` | Individual supplier dossier by slug |`,
    `| \`/api/suppliers/growth\` | GET | \`dw-suppliers\` | \`application/json\` | Trailing 30-day verified link promotions |`,
    `| \`/story/:id\` | GET | - | \`text/html\` | Prerendered HTML + Schema.org NewsArticle |`,
    `| \`/program/:id\` | GET | - | \`text/html\` | Prerendered HTML + Program Dossier specs |`,
    `| \`/supplier/:id\` | GET | - | \`text/html\` | Prerendered HTML + Supplier Dossier specs |`,
    '',
    `## Complete Strategic Programs Catalogue (${ALL_STRATEGIC_PROGRAMS.length} Platforms)`
  ];

  for (const p of ALL_STRATEGIC_PROGRAMS) {
    const branches = p.serviceBranch.join(', ');
    const budget = p.sanctionedBudgetCrores ? `₹${p.sanctionedBudgetCrores} Cr` : 'Undisclosed / Classified';
    lines.push(
      `### ${p.name} (\`${p.id}\`)`,
      `- **Domain**: ${p.domain} | **Stage**: ${p.stage} | **Branches**: ${branches}`,
      `- **Lead Developer**: ${p.leadAgency} | **Indigenisation**: ${p.indigenousPercentage}%`,
      `- **Sanctioned Budget**: ${budget} | **Target Induction**: ${p.targetInductionYear ?? 'N/A'}`,
      `- **Planned Units**: ${p.plannedUnits ?? 'N/A'}`,
      `- **Canonical URL**: ${SITE_ORIGIN}/program/${p.id}`,
      `- **Summary**: ${p.summary}`,
      ''
    );
  }

  lines.push(`## Complete Verified Suppliers Catalogue (${ALL_SUPPLIERS.length} Entities)`);
  for (const s of ALL_SUPPLIERS) {
    const aliases = s.aliases && s.aliases.length > 0 ? ` (${s.aliases.join(', ')})` : '';
    const corridor = s.corridor ? ` | ${s.corridor} Corridor` : '';
    const links = s.linkedPrograms.map((l) => `${l.programId} (${l.subsystemName})`).join('; ') || 'Ecosystem Partner';
    lines.push(
      `### ${s.name}${aliases} (\`${s.slug}\`)`,
      `- **Tier**: ${s.tier.toUpperCase()} | **HQ**: ${s.hqCity}, ${s.hqState}${corridor}`,
      `- **Listed**: ${s.isListed ? `Yes (${s.stockSymbol ?? 'Public'})` : 'Private/Unlisted'} | **iDEX Winner**: ${s.idexWinner ? 'Yes' : 'No'}`,
      `- **Canonical URL**: ${SITE_ORIGIN}/supplier/${s.slug}`,
      `- **Linked Programs**: ${links}`,
      `- **Overview**: ${s.description}`,
      ''
    );
  }

  if (stories.length > 0) {
    lines.push(`## Current Live Clusters Snapshot (${stories.length} Stories)`);
    for (const st of stories) {
      lines.push(`- **${st.synthesizedHeadline}** (\`${st.id}\`): ${st.primarySource.url}`);
    }
    lines.push('');
  }

  lines.push(
    '## Source Scoring & Corroboration Engine',
    'DefenceWire employs an automated Fowler Half-Open circuit breaker and multi-tier scoring model:',
    '- Tier Official (Weight: 1.0): Government/military statements, press releases, parliamentary Q&A.',
    '- Tier 1 (Weight: 0.85): Specialized defence publications and institutional news wire services.',
    '- Tier 2 (Weight: 0.60): General national and international print/broadcast media.',
    '- Tier Social (Weight: 0.35): Verified OSINT intelligence handles and accredited journalists.',
    'Stories corroborated by multiple tiers receive logarithmic confidence boosts.'
  );

  return lines.join('\n') + '\n';
}
