/**
 * Unit & Contract Tests for Program-Centric ORBAT & Semantic Grounding
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_ORBAT_UNITS,
  getAllOrbatUnits,
  getOrbatByProgramId,
  getOrbatProfileForProgram,
  getOrbatUnitById,
  getOrbatUnitsByServiceBranch,
  getOrbatUnitsByStatus
} from '../../src/data/orbat/programOrbatData.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';

describe('ORBAT & Military Unit Deployment Data Contracts', () => {
  const validProgramIds = new Set(ALL_STRATEGIC_PROGRAMS.map((p) => p.id));

  it('loads a populated repository of sovereign ORBAT units across all domains', () => {
    const allUnits = getAllOrbatUnits();
    expect(allUnits.length).toBeGreaterThanOrEqual(35);
    expect(allUnits).toEqual(ALL_ORBAT_UNITS);
  });

  it('ensures every single ORBAT unit maps strictly to one of the 43 Strategic Programs', () => {
    for (const unit of ALL_ORBAT_UNITS) {
      expect(validProgramIds.has(unit.programId)).toBe(true);
    }
  });

  it('enforces unique IDs across all cataloged ORBAT units', () => {
    const idSet = new Set<string>();
    for (const unit of ALL_ORBAT_UNITS) {
      expect(idSet.has(unit.id)).toBe(false);
      idSet.add(unit.id);
    }
  });

  it('enforces 100% official citation coverage with non-empty metadata for every unit', () => {
    const validSourceTypes = new Set([
      'parliamentary_report',
      'mod_annual_report',
      'pib_release',
      'gazette_notification',
      'dac_decision'
    ]);

    for (const unit of ALL_ORBAT_UNITS) {
      expect(unit.citation).toBeDefined();
      expect(unit.citation.sourceTitle.length).toBeGreaterThan(10);
      expect(validSourceTypes.has(unit.citation.sourceType)).toBe(true);
      expect(unit.citation.date).toMatch(/^\d{4}-\d{2}/);
    }
  });

  it('correctly maps iconic operational squadrons and regiments to their platforms', () => {
    // Tejas Mk1A
    const tejasUnits = getOrbatByProgramId('tejas-mk1a');
    expect(tejasUnits.length).toBeGreaterThanOrEqual(2);
    const designations = tejasUnits.map((u) => u.unitDesignation);
    expect(designations).toContain('No. 45 Squadron IAF');
    expect(designations).toContain('No. 18 Squadron IAF');

    // K9 Vajra-T
    const k9Units = getOrbatByProgramId('k9-vajra-t');
    expect(k9Units.length).toBeGreaterThanOrEqual(2);
    expect(k9Units.some((u) => u.baseLocation.includes('Ladakh'))).toBe(true);

    // INS Vikrant / IAC-1 Carrier Battle Group
    const iac2Units = getOrbatByProgramId('iac-2-vishal');
    expect(iac2Units.length).toBeGreaterThanOrEqual(1);

    // BrahMos Supersonic Cruise Missile
    const brahmosUnits = getOrbatByProgramId('brahmos-supersonic');
    expect(brahmosUnits.length).toBeGreaterThanOrEqual(2);
    expect(brahmosUnits.some((u) => u.unitDesignation.includes('861st'))).toBe(true);
  });

  it('filters units accurately by service branch', () => {
    const iafUnits = getOrbatUnitsByServiceBranch('Indian Air Force');
    const navyUnits = getOrbatUnitsByServiceBranch('Indian Navy');
    const armyUnits = getOrbatUnitsByServiceBranch('Indian Army');
    const triServices = getOrbatUnitsByServiceBranch('Tri-Services');

    expect(iafUnits.length).toBeGreaterThanOrEqual(8);
    expect(navyUnits.length).toBeGreaterThanOrEqual(6);
    expect(armyUnits.length).toBeGreaterThanOrEqual(7);
    expect(triServices.length).toBeGreaterThanOrEqual(4);

    for (const u of iafUnits) {
      expect(u.serviceBranch).toBe('Indian Air Force');
    }
  });

  it('filters units accurately by operational status', () => {
    const operational = getOrbatUnitsByStatus('operational');
    const slated = getOrbatUnitsByStatus('slated');
    const forming = getOrbatUnitsByStatus('forming');
    const evaluating = getOrbatUnitsByStatus('evaluating');

    expect(operational.length).toBeGreaterThanOrEqual(12);
    expect(slated.length).toBeGreaterThanOrEqual(8);
    expect(forming.length).toBeGreaterThanOrEqual(3);
    expect(evaluating.length).toBeGreaterThanOrEqual(3);

    for (const u of operational) {
      expect(u.status).toBe('operational');
    }
  });

  it('provides single-unit lookup by unique ID', () => {
    const unit = getOrbatUnitById('orbat-tejas-45sqn');
    expect(unit).toBeDefined();
    expect(unit?.nickname).toBe('Flying Daggers');
    expect(unit?.baseLocation).toContain('Sulur');

    const nonExistent = getOrbatUnitById('unknown-id-xyz');
    expect(nonExistent).toBeUndefined();
  });

  it('generates a complete ProgramOrbatProfile with operational counts', () => {
    const profile = getOrbatProfileForProgram('tejas-mk1a', 'LCA Tejas Mk1A');
    expect(profile.programId).toBe('tejas-mk1a');
    expect(profile.programName).toBe('LCA Tejas Mk1A');
    expect(profile.totalOperationalUnits).toBeGreaterThanOrEqual(2);
    expect(profile.units.length).toBeGreaterThanOrEqual(3);
  });
});
