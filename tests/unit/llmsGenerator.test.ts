/**
 * Unit Tests for AI Machine-Readable Spec & LLM Grounding Generator
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { generateLlmsTxt, generateLlmsFullTxt } from '../../src/seo/llmsGenerator.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('AI Machine-Readable Spec Generator (llms.txt & llms-full.txt)', () => {
  const mockStories: StoryCluster[] = [
    {
      id: 'cluster-amca-spec-1',
      synthesizedHeadline: 'AMCA Critical Design Review Approved by Cabinet Committee on Security',
      primarySource: {
        id: 'src-pib-1',
        title: 'MoD Press Release on AMCA',
        url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=999999',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-03T12:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['procurement', 'airforce'],
      entities: ['AMCA', 'DRDO', 'IAF'],
      defenceScore: 95,
      isLeadStory: true,
      createdAt: '2026-09-03T10:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z'
    }
  ];

  it('generates standard llms.txt compliant with llmstxt.org structure', () => {
    const text = generateLlmsTxt();

    expect(text.startsWith('# DefenceWire.in')).toBe(true);
    expect(text).toContain('> Real-time institutional defence intelligence aggregator');
    expect(text).toContain('## Key Resources');
    expect(text).toContain('https://www.defencewire.in/llms-full.txt');
    expect(text).toContain('https://www.defencewire.in/data/news.json');
    expect(text).toContain('https://www.defencewire.in/sitemap.xml');
    expect(text).toContain('https://www.defencewire.in/api/suppliers');
    expect(text).toContain('https://www.defencewire.in/api/suppliers/growth');
  });

  it('embeds LLM grounding and anti-hallucination directives in llms.txt', () => {
    const text = generateLlmsTxt();

    expect(text).toContain('## LLM Grounding & Anti-Hallucination Directives');
    expect(text).toContain('Ground claims in primary sources (PIB MoD, Sansad Parliamentary Q&A, DRDO, DAC)');
    expect(text).toContain('Use canonical permalinks: Stories at `https://www.defencewire.in/story/:id`');
    expect(text).toContain('https://www.defencewire.in/program/:id');
    expect(text).toContain('https://www.defencewire.in/supplier/:slug');
    expect(text).toContain('Do not extrapolate unconfirmed delivery timelines');
  });

  it('indexes all 43 Strategic Programs and 31+ Suppliers in llms.txt', () => {
    const text = generateLlmsTxt();

    expect(text).toContain(`Strategic Defence Programs (${ALL_STRATEGIC_PROGRAMS.length} Platforms)`);
    for (const prog of ALL_STRATEGIC_PROGRAMS) {
      expect(text).toContain(`[${prog.name}](https://www.defencewire.in/program/${prog.id})`);
    }

    expect(text).toContain(`Verified Defence Suppliers & Industrial Ecosystem (${ALL_SUPPLIERS.length} Entities)`);
    for (const supplier of ALL_SUPPLIERS) {
      expect(text).toContain(`[${supplier.name}](https://www.defencewire.in/supplier/${supplier.slug})`);
    }
  });

  it('includes active story briefings when provided to llms.txt', () => {
    const text = generateLlmsTxt({ stories: mockStories });

    expect(text).toContain('Active Story Briefings (1 Clusters)');
    expect(text).toContain('AMCA Critical Design Review Approved');
    expect(text).toContain('https://www.defencewire.in/story/cluster-amca-spec-1');
  });

  it('generates extended llms-full.txt with metadata, schemas, and API documentation', () => {
    const fullText = generateLlmsFullTxt();

    expect(fullText).toContain('# DefenceWire.in — Full Machine-Readable LLM Specification & Taxonomy');
    expect(fullText).toContain('## Platform Metadata');
    expect(fullText).toContain('## Feed Architecture & JSON Schemas');
    expect(fullText).toContain('StoryCluster JSON Schema');
    expect(fullText).toContain('StrategicProgram JSON Schema');
    expect(fullText).toContain('SupplierProfile JSON Schema');
    expect(fullText).toContain('OrbatUnit JSON Schema');
    expect(fullText).toContain('## Public Edge API Endpoints');
    expect(fullText).toContain('/data/news.json');
    expect(fullText).toContain('/sitemap.xml');
    expect(fullText).toContain('/llms.txt');
    expect(fullText).toContain('/llms-full.txt');
    expect(fullText).toContain('/api/suppliers');
    expect(fullText).toContain('/api/suppliers/growth');
  });

  it('indexes every strategic program and supplier in full catalogue format in llms-full.txt', () => {
    const fullText = generateLlmsFullTxt();

    expect(fullText).toContain(`Complete Strategic Programs Catalogue (${ALL_STRATEGIC_PROGRAMS.length} Platforms)`);
    for (const prog of ALL_STRATEGIC_PROGRAMS) {
      expect(fullText).toContain(`### ${prog.name} (\`${prog.id}\`)`);
      expect(fullText).toContain(`https://www.defencewire.in/program/${prog.id}`);
    }

    expect(fullText).toContain(`Complete Verified Suppliers Catalogue (${ALL_SUPPLIERS.length} Entities)`);
    for (const sup of ALL_SUPPLIERS) {
      expect(fullText).toContain(`### ${sup.name}`);
      expect(fullText).toContain(`https://www.defencewire.in/supplier/${sup.slug}`);
    }
  });

  it('documents source scoring, Fowler circuit breaker, and live clusters in llms-full.txt', () => {
    const fullText = generateLlmsFullTxt({ stories: mockStories });

    expect(fullText).toContain('Source Scoring & Corroboration Engine');
    expect(fullText).toContain('Fowler Half-Open circuit breaker');
    expect(fullText).toContain('Current Live Clusters Snapshot (1 Stories)');
    expect(fullText).toContain('AMCA Critical Design Review Approved');
  });
});
