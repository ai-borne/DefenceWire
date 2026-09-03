/**
 * Unit Tests for Jane's-Grade Specifications, Order Books & iDEX Challenge Stores
 * Verifies Sub-Phase 1.2 structured data stores, mathematical consistency, and mappings.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import {
  ALL_PROGRAM_SPECS,
  getSpecsByProgramId,
  getAllProgramSpecs
} from '../../src/data/specs/programSpecsAggregator.js';
import {
  ALL_PROGRAM_ORDER_BOOKS,
  getOrderBookByProgramId,
  getAllProgramOrderBooks
} from '../../src/data/programOrderBooks.js';
import {
  ALL_IDEX_CHALLENGES,
  getChallengesByProgramId,
  getIdexChallengeById,
  getAllIdexChallenges
} from '../../src/data/idexProgramMapper.js';

describe('Program Technical Specifications Store (Phase 1.2)', () => {
  it('should provide complete Jane-grade technical specifications for all 43 strategic programs', () => {
    expect(ALL_PROGRAM_SPECS.length).toBe(43);
    expect(getAllProgramSpecs().length).toBe(43);

    // Verify 100% 1-to-1 coverage against ALL_STRATEGIC_PROGRAMS
    for (const program of ALL_STRATEGIC_PROGRAMS) {
      const specs = getSpecsByProgramId(program.id);
      expect(specs, `Missing technical specs for program: ${program.id}`).toBeDefined();
      expect(specs?.programId).toBe(program.id);

      // Every program must have at least dimensions or performance or propulsion or avionics or armament
      const hasCoreData = Boolean(
        specs?.dimensions ||
        specs?.performance ||
        specs?.propulsion ||
        specs?.avionics ||
        specs?.armament
      );
      expect(hasCoreData, `Program ${program.id} has no specification categories populated`).toBe(true);
    }
  });

  it('should return undefined when querying specs for an unknown or invalid program ID', () => {
    expect(getSpecsByProgramId('non-existent-program')).toBeUndefined();
    expect(getSpecsByProgramId('')).toBeUndefined();
  });

  it('should accurately encode authentic Jane-grade avionics, propulsion and armament metrics for flagship platforms', () => {
    // Aerospace flagship: Tejas Mk1A
    const tejas = getSpecsByProgramId('tejas-mk1a');
    expect(tejas?.performance?.maxSpeed).toContain('Mach 1.8');
    expect(tejas?.performance?.combatRadiusKm).toBe(500);
    expect(tejas?.propulsion?.engineModel).toContain('F404');
    expect(tejas?.avionics?.radarSuite).toContain('Uttam AESA');
    expect(tejas?.armament?.hardpointsCount).toBe(8);

    // 5th-Gen Stealth flagship: AMCA
    const amca = getSpecsByProgramId('amca');
    expect(amca?.performance?.rcsEstimate).toContain('0.001 m²');
    expect(amca?.armament?.internalBays).toContain('internal weapon bay');
    expect(amca?.avionics?.radarSuite).toContain('Gallium Nitride');

    // High-altitude Land flagship: Zorawar Light Tank
    const zorawar = getSpecsByProgramId('zorawar-light-tank');
    expect(zorawar?.dimensions?.mtowKg).toBe(25000);
    expect(zorawar?.propulsion?.powerOutput).toContain('750 hp');
    expect(zorawar?.armament?.compatibleWeapons).toContain('105mm Cockerill High-Pressure Gun');

    // Strategic Naval flagship: Project 75(I) AIP Submarine
    const p75i = getSpecsByProgramId('project-75i');
    expect(p75i?.propulsion?.engineType).toContain('Air-Independent Propulsion');
    expect(p75i?.performance?.enduranceHours).toBe(720);
    expect(p75i?.dimensions?.displacementTons).toBe(3200);

    // Hypersonic Strategic Missile flagship: Project Kusha
    const kusha = getSpecsByProgramId('project-kusha');
    expect(kusha?.performance?.maxSpeed).toContain('Mach 5.5');
    expect(kusha?.performance?.combatRadiusKm).toBe(350);
    expect(kusha?.avionics?.radarSuite).toContain('GaN TR Modules');

    // Autonomous Swarm flagship: ALFA-S
    const alfas = getSpecsByProgramId('alfa-s-swarms');
    expect(alfas?.avionics?.datalink).toContain('AI mesh');
    expect(alfas?.dimensions?.emptyWeightKg).toBe(15);
  });
});

describe('Program Order Books & Delivery Tracker (Phase 1.2)', () => {
  it('should maintain strict mathematical consistency across all active order books (sanctioned == delivered + pending)', () => {
    const orderBooks = getAllProgramOrderBooks();
    expect(orderBooks.length).toBeGreaterThanOrEqual(10);
    expect(ALL_PROGRAM_ORDER_BOOKS.length).toBe(orderBooks.length);

    for (const ob of orderBooks) {
      // Rule 4 / Goal Driven: Verify mathematical invariant
      expect(
        ob.sanctionedUnits,
        `Order book for ${ob.programId} violates sanctionedUnits == deliveredUnits + pendingUnits`
      ).toBe(ob.deliveredUnits + ob.pendingUnits);

      expect(ob.deliveredUnits).toBeGreaterThanOrEqual(0);
      expect(ob.pendingUnits).toBeGreaterThanOrEqual(0);
      expect(ob.contractedUnits).toBeGreaterThanOrEqual(0);
      expect(ob.batches.length).toBeGreaterThan(0);
      expect(ob.latestDeliveryMilestone).toBeDefined();

      // Ensure every batch has valid required attributes
      for (const batch of ob.batches) {
        expect(batch.batchName).toBeTruthy();
        expect(batch.units).toBeGreaterThan(0);
        expect(batch.status).toBeDefined();
        expect(['delivered', 'in_production', 'pending', 'sanctioned']).toContain(batch.status);
      }
    }
  });

  it('should accurately retrieve order books for major procurement programs', () => {
    const tejasOrderBook = getOrderBookByProgramId('tejas-mk1a');
    expect(tejasOrderBook).toBeDefined();
    expect(tejasOrderBook?.sanctionedUnits).toBe(180);
    expect(tejasOrderBook?.batches).toHaveLength(2);
    expect(tejasOrderBook?.batches[0]?.units).toBe(83);
    expect(tejasOrderBook?.batches[1]?.units).toBe(97);

    const k9OrderBook = getOrderBookByProgramId('k9-vajra-t');
    expect(k9OrderBook).toBeDefined();
    expect(k9OrderBook?.sanctionedUnits).toBe(200);
    expect(k9OrderBook?.deliveredUnits).toBe(100);
    expect(k9OrderBook?.pendingUnits).toBe(100);

    const c295OrderBook = getOrderBookByProgramId('c295-transport');
    expect(c295OrderBook).toBeDefined();
    expect(c295OrderBook?.sanctionedUnits).toBe(56);
    expect(c295OrderBook?.batches[0]?.manufacturingFacility).toContain('Seville');
    expect(c295OrderBook?.batches[1]?.manufacturingFacility).toContain('TASL');

    const unknownOrderBook = getOrderBookByProgramId('unknown-platform');
    expect(unknownOrderBook).toBeUndefined();
  });
});

describe('Folded-in iDEX & ADITI Challenge Cross-Linking (Phase 1.2)', () => {
  it('should maintain valid mapping from all iDEX challenges to existing strategic programs', () => {
    const challenges = getAllIdexChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(12);
    expect(ALL_IDEX_CHALLENGES.length).toBe(challenges.length);

    const validProgramIds = new Set(ALL_STRATEGIC_PROGRAMS.map((p) => p.id));

    for (const challenge of challenges) {
      expect(challenge.id).toBeTruthy();
      expect(challenge.edition).toBeTruthy();
      expect(challenge.psNumber).toBeTruthy();
      expect(challenge.title).toBeTruthy();
      expect(challenge.nodalAgency).toBeTruthy();
      expect(challenge.grantAmount).toBeTruthy();
      expect(challenge.problemDescription).toBeTruthy();
      expect(challenge.targetCapability).toBeTruthy();
      expect(challenge.status).toBeTruthy();
      expect(challenge.officialPdfUrl).toContain('idex.gov.in');

      // Crucial relationship test: Every challenge mappedProgramId MUST be an authentic strategic program
      expect(
        validProgramIds.has(challenge.mappedProgramId),
        `Challenge ${challenge.id} mapped to non-existent program: ${challenge.mappedProgramId}`
      ).toBe(true);
    }
  });

  it('should correctly query iDEX challenges by program ID and challenge ID', () => {
    // Zorawar Light Tank challenge query
    const zorawarChallenges = getChallengesByProgramId('zorawar-light-tank');
    expect(zorawarChallenges.length).toBeGreaterThan(0);
    expect(zorawarChallenges[0]?.title).toContain('Microbolometer');

    // Project 75(I) AIP Submarine challenge query
    const p75iChallenges = getChallengesByProgramId('project-75i');
    expect(p75iChallenges.length).toBeGreaterThan(0);
    expect(p75iChallenges[0]?.title).toContain('Fuel Cell');

    // AMCA 5th-gen fighter challenge query
    const amcaChallenges = getChallengesByProgramId('amca');
    expect(amcaChallenges.length).toBeGreaterThan(0);
    expect(amcaChallenges[0]?.title).toContain('GaN');

    // ALFA-S Swarm challenge query
    const swarmChallenges = getChallengesByProgramId('alfa-s-swarms');
    expect(swarmChallenges.length).toBeGreaterThan(0);
    expect(swarmChallenges[0]?.title).toContain('Autonomous Distributed AI Brain');

    // Query challenge by ID
    const singleChallenge = getIdexChallengeById('disc14-army-ps01');
    expect(singleChallenge).toBeDefined();
    expect(singleChallenge?.psNumber).toBe('DISC-14/ARMY/01');

    // Query non-existent challenge
    expect(getIdexChallengeById('non-existent-id')).toBeUndefined();

    // Query challenges for program with no mapped iDEX problem statements
    const emptyChallenges = getChallengesByProgramId('unmapped-program-id');
    expect(emptyChallenges).toEqual([]);
  });
});
