/**
 * Unit Tests for 43 Strategic Defence Programs SSOT & Query Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_STRATEGIC_PROGRAMS,
  filterPrograms,
  findProgramByAlias,
  getAllPrograms,
  getProgramById,
  getProgramDomainStats,
  getProgramsByDomain,
  getProgramsByStage,
  matchProgramsInText
} from '../../src/data/strategicPrograms.js';
import { COLOR_PALETTE } from '../../src/resources/colors.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Strategic Defence Programs: 43 Sovereign Repositories SSOT', () => {
  it('loads exactly 43 unique sovereign programs across 5 operational domains', () => {
    const all = getAllPrograms();
    expect(all).toHaveLength(43);

    const ids = new Set(all.map((p) => p.id));
    expect(ids.size).toBe(43);
  });

  it('partitions programs exactly across all 5 operational domains', () => {
    const aerospace = getProgramsByDomain('aerospace');
    const naval = getProgramsByDomain('naval');
    const land = getProgramsByDomain('land');
    const missiles = getProgramsByDomain('missiles');
    const unmanned = getProgramsByDomain('unmanned');

    expect(aerospace).toHaveLength(11);
    expect(naval).toHaveLength(9);
    expect(land).toHaveLength(8);
    expect(missiles).toHaveLength(10);
    expect(unmanned).toHaveLength(5);

    expect(aerospace.length + naval.length + land.length + missiles.length + unmanned.length).toBe(43);
  });

  it('validates data integrity and completeness for all 43 programs', () => {
    for (const prog of ALL_STRATEGIC_PROGRAMS) {
      expect(prog.id).toBeTruthy();
      expect(prog.name).toBeTruthy();
      expect(prog.shortName).toBeTruthy();
      expect(prog.domain).toBeTruthy();
      expect(prog.stage).toBeTruthy();
      expect(prog.leadAgency).toBeTruthy();
      expect(prog.serviceBranch.length).toBeGreaterThan(0);
      expect(prog.summary.length).toBeGreaterThan(20);
      expect(prog.indigenousPercentage).toBeGreaterThanOrEqual(0);
      expect(prog.indigenousPercentage).toBeLessThanOrEqual(100);
      expect(prog.searchAliases.length).toBeGreaterThan(0);
      expect(prog.keySubsystems.length).toBeGreaterThan(0);
      expect(prog.keyMilestones.length).toBeGreaterThan(0);

      // Verify each subsystem
      for (const sub of prog.keySubsystems) {
        expect(sub.name).toBeTruthy();
        expect(sub.type).toBeTruthy();
        expect(sub.supplier).toBeTruthy();
        expect(typeof sub.indigenous).toBe('boolean');
      }

      // Verify each milestone
      for (const ms of prog.keyMilestones) {
        expect(ms.id).toBeTruthy();
        expect(ms.date).toBeTruthy();
        expect(ms.title).toBeTruthy();
        expect(['completed', 'in_progress', 'upcoming']).toContain(ms.status);
      }
    }
  });

  it('provides fast O(1) indexed lookups by program id', () => {
    const tejas = getProgramById('tejas-mk1a');
    expect(tejas).toBeDefined();
    expect(tejas?.name).toContain('Tejas Mk1A');
    expect(tejas?.domain).toBe('aerospace');
    expect(tejas?.stage).toBe('production');

    const amca = getProgramById('amca');
    expect(amca).toBeDefined();
    expect(amca?.domain).toBe('aerospace');
    expect(amca?.stage).toBe('development');

    const p75i = getProgramById('project-75i');
    expect(p75i).toBeDefined();
    expect(p75i?.domain).toBe('naval');

    const nonExistent = getProgramById('unknown-program-xyz');
    expect(nonExistent).toBeUndefined();
  });

  it('filters programs by stage, domain, and indigenisation metrics', () => {
    const productionPrograms = getProgramsByStage('production');
    expect(productionPrograms.length).toBeGreaterThan(0);
    expect(productionPrograms.every((p) => p.stage === 'production')).toBe(true);

    const highIndigenisation = filterPrograms({ minIndigenisation: 80 });
    expect(highIndigenisation.length).toBeGreaterThan(0);
    expect(highIndigenisation.every((p) => p.indigenousPercentage >= 80)).toBe(true);

    const filtered = filterPrograms({ domain: 'aerospace', stage: 'development' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((p) => p.domain === 'aerospace' && p.stage === 'development')).toBe(true);
  });

  it('performs accurate multi-field text search across names, aliases, and subsystems', () => {
    const amcaResults = filterPrograms({ query: 'amca' });
    expect(amcaResults.some((p) => p.id === 'amca')).toBe(true);

    const uttamResults = filterPrograms({ query: 'Uttam' });
    expect(uttamResults.length).toBeGreaterThan(0);

    const zorawarResults = filterPrograms({ query: 'Zorawar' });
    expect(zorawarResults.some((p) => p.id === 'zorawar-light-tank')).toBe(true);
  });

  it('computes domain and lifecycle stage statistics accurately', () => {
    const stats = getProgramDomainStats();
    expect(stats.total).toBe(43);
    expect(stats.aerospace).toBe(11);
    expect(stats.naval).toBe(9);
    expect(stats.land).toBe(8);
    expect(stats.missiles).toBe(10);
    expect(stats.unmanned).toBe(5);
    expect(
      stats.inProductionOrInducted +
      stats.inTrials +
      stats.inDevelopment +
      stats.inConceptOrSanctioned
    ).toBe(43);
  });

  it('matches programs in article text and resolves aliases via regex word boundaries', () => {
    const matched = matchProgramsInText(
      'IAF leadership reviewed LCA Tejas Mk1A delivery timelines alongside AMCA 5th gen stealth progress and Zorawar light tank trials in Ladakh.'
    );
    const matchedIds = matched.map((p) => p.id);
    expect(matchedIds).toContain('tejas-mk1a');
    expect(matchedIds).toContain('amca');
    expect(matchedIds).toContain('zorawar-light-tank');

    const singleMatch = findProgramByAlias('Project 75I');
    expect(singleMatch?.id).toBe('project-75i');
  });

  it('validates strings and colors SSOT for strategic programs', () => {
    expect(STRINGS.programs.heading).toBe('Strategic Defence Programs');
    expect(STRINGS.programs.domainAll).toContain('43');
    expect(STRINGS.programs.stageConcept).toBeDefined();
    expect(STRINGS.programs.stageSanctioned).toBeDefined();
    expect(STRINGS.programs.stageDevelopment).toBeDefined();
    expect(STRINGS.programs.stageTrials).toBeDefined();
    expect(STRINGS.programs.stageProduction).toBeDefined();
    expect(STRINGS.programs.stageInduction).toBeDefined();

    // Verify all stage colors are valid hex codes
    expect(COLOR_PALETTE.programStage.conceptBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.developmentBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.trialsBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.productionBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.inductionBg).toMatch(/^#[0-9A-F]{6}$/i);

    // Verify all domain colors are valid hex codes
    expect(COLOR_PALETTE.programDomain.aerospace).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.naval).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.land).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.missiles).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.unmanned).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
