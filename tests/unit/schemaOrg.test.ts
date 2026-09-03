/**
 * Unit Tests for Schema.org JSON-LD Generator & Semantic Grounding
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildProgramJsonLd,
  buildProgramJsonLdObject,
  injectProgramJsonLd,
  removeProgramJsonLd
} from '../../src/seo/schemaOrg.js';
import { getProgramById } from '../../src/data/strategicPrograms.js';
import { getOrbatByProgramId } from '../../src/data/orbat/programOrbatData.js';

describe('Schema.org JSON-LD Semantic Grounding & SEO Engine', () => {
  const tejas = getProgramById('tejas-mk1a');

  beforeEach(() => {
    removeProgramJsonLd();
  });

  it('builds a Schema.org compliant structured graph object', () => {
    expect(tejas).toBeDefined();
    if (!tejas) return;

    const units = getOrbatByProgramId(tejas.id);
    const graphObj = buildProgramJsonLdObject(tejas, units);

    expect(graphObj['@context']).toBe('https://schema.org');
    expect(Array.isArray(graphObj['@graph'])).toBe(true);

    const types = graphObj['@graph'].map((n) => n['@type']);
    expect(types).toContain('TechArticle');
    expect(types).toContain('Product');
    expect(types).toContain('GovernmentOrganization');
  });

  it('populates TechArticle node with rich metadata and official citations', () => {
    if (!tejas) return;
    const units = getOrbatByProgramId(tejas.id);
    const graphObj = buildProgramJsonLdObject(tejas, units);

    const articleNode = graphObj['@graph'].find((n) => n['@type'] === 'TechArticle') as Record<string, unknown>;
    expect(articleNode).toBeDefined();
    expect(articleNode.headline).toContain('LCA Tejas Mk1A');
    expect(articleNode.description).toBe(tejas.summary);
    expect(articleNode.inLanguage).toBe('en');

    // Author & Publisher
    const author = articleNode.author as Record<string, unknown>;
    expect(author['@type']).toBe('GovernmentOrganization');
    expect(author.name).toBe(tejas.leadAgency);

    // Citations
    const citations = articleNode.citation as string[];
    expect(Array.isArray(citations)).toBe(true);
    expect(citations.length).toBeGreaterThanOrEqual(2);
    expect(citations.some((c) => c.includes('Standing Committee on Defence'))).toBe(true);
  });

  it('populates Product node with technical specifications and budget properties', () => {
    if (!tejas) return;
    const units = getOrbatByProgramId(tejas.id);
    const graphObj = buildProgramJsonLdObject(tejas, units);

    const productNode = graphObj['@graph'].find((n) => n['@type'] === 'Product') as Record<string, unknown>;
    expect(productNode).toBeDefined();
    expect(productNode.name).toBe(tejas.name);
    expect(productNode.category).toContain('AEROSPACE');

    const additionalProps = productNode.additionalProperty as Array<{ name: string; value: unknown }>;
    expect(Array.isArray(additionalProps)).toBe(true);

    const budgetProp = additionalProps.find((p) => p.name.includes('Sanctioned Budget'));
    expect(budgetProp).toBeDefined();
    expect(budgetProp?.value).toBe(tejas.sanctionedBudgetCrores);

    const iddmProp = additionalProps.find((p) => p.name.includes('Indigenous Content'));
    expect(iddmProp).toBeDefined();
    expect(iddmProp?.value).toBe(`${tejas.indigenousPercentage}%`);
  });

  it('escapes potentially dangerous script tags to prevent XSS breakout', () => {
    if (!tejas) return;
    const maliciousProgram = {
      ...tejas,
      summary: 'Malicious payload: </script><script>alert("pwned")</script>'
    };

    const jsonString = buildProgramJsonLd(maliciousProgram, []);
    expect(jsonString).not.toContain('</script>');
    expect(jsonString).toContain('\\u003c/script>');
    expect(() => JSON.parse(jsonString)).not.toThrow();
  });

  it('safely injects and cleans up JSON-LD script tags in the DOM', () => {
    if (!tejas) return;
    const units = getOrbatByProgramId(tejas.id);

    expect(document.getElementById('dw-program-jsonld')).toBeNull();

    const script = injectProgramJsonLd(tejas, units);
    expect(script).toBeDefined();
    expect(document.getElementById('dw-program-jsonld')).not.toBeNull();
    expect(script?.type).toBe('application/ld+json');
    expect(script?.textContent).toContain('LCA Tejas Mk1A');

    // Removing cleans up completely
    removeProgramJsonLd();
    expect(document.getElementById('dw-program-jsonld')).toBeNull();
  });
});
