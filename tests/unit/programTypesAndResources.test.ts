/**
 * Unit Tests for Strategic Program Types, Data Contracts & String Resources SSOT
 * Verifies Sub-Phase 1.1 contracts for Jane's-grade specs, order books, and iDEX challenges.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import type {
  StrategicProgram,
  ProgramTechnicalSpecs,
  ProgramOrderBook,
  OrderBatch,
  IdexChallenge
} from '../../src/types/programs.js';
import { STRINGS } from '../../src/resources/strings.js';
import { COLOR_PALETTE, CSS_VARS } from '../../src/resources/colors.js';

describe('Strategic Program Data Contracts (Phase 1.1)', () => {
  it('should instantiate a complete Jane-grade technical specification contract', () => {
    const specs: ProgramTechnicalSpecs = {
      programId: 'tejas-mk1a',
      dimensions: {
        length: '13.2 m',
        wingspan: '8.2 m',
        height: '4.4 m',
        emptyWeightKg: 6560,
        mtowKg: 13500
      },
      performance: {
        maxSpeed: 'Mach 1.8 (1,975 km/h)',
        combatRadiusKm: 500,
        ferryRangeKm: 3200,
        serviceCeilingMeters: 15240,
        rcsEstimate: '0.5 m²',
        enduranceHours: 2.5
      },
      propulsion: {
        engineModel: 'General Electric F404-GE-IN20',
        engineType: 'Afterburning turbofan',
        dryThrustKn: 53.9,
        wetThrustKn: 89.8
      },
      avionics: {
        radarSuite: 'Uttam AESA Radar (BEL/LRDE)',
        ewSuite: 'Angad EW Suite with Advanced Self-Protection Jammer',
        datalink: 'Software Defined Radio (SDR) with BNET-AR',
        targetTrackingCapacity: 'Multiple air & ground targets simultaneously'
      },
      armament: {
        hardpointsCount: 8,
        payloadCapacityKg: 5300,
        internalBays: false,
        compatibleWeapons: ['Astra Mk1/Mk2', 'ASRAAM', 'BrahMos-NG', 'Smart Anti-Airfield Weapon (SAAW)'],
        gunSystem: '23 mm GSh-23 twin-barrel autocannon'
      }
    };

    expect(specs.programId).toBe('tejas-mk1a');
    expect(specs.dimensions?.length).toBe('13.2 m');
    expect(specs.performance?.combatRadiusKm).toBe(500);
    expect(specs.propulsion?.wetThrustKn).toBe(89.8);
    expect(specs.avionics?.radarSuite).toContain('Uttam AESA');
    expect(specs.armament?.compatibleWeapons).toHaveLength(4);
  });

  it('should instantiate and validate mathematical consistency of order book and batch contracts', () => {
    const batch1: OrderBatch = {
      batchName: '83 Mk1A Series Order',
      orderDate: '2021-02',
      units: 83,
      contractValueCrores: 48000,
      manufacturingFacility: 'HAL Aircraft Division, Bengaluru',
      deliverySchedule: '2024–2028',
      recipientBasesOrSquadrons: ['No. 45 Flying Daggers (Sulur)', 'No. 3 Cobra Squadron (Nal)'],
      status: 'in_production'
    };

    const batch2: OrderBatch = {
      batchName: '97 Mk1A Additional Batch',
      orderDate: '2024-04',
      units: 97,
      contractValueCrores: 65000,
      manufacturingFacility: 'HAL Nashik & Bengaluru Lines',
      deliverySchedule: '2027–2031',
      recipientBasesOrSquadrons: ['Forward Fighter Bases'],
      status: 'sanctioned'
    };

    const orderBook: ProgramOrderBook = {
      programId: 'tejas-mk1a',
      sanctionedUnits: 180,
      contractedUnits: 83,
      deliveredUnits: 2,
      pendingUnits: 178,
      batches: [batch1, batch2],
      latestDeliveryMilestone: 'First production aircraft LA-5033 completed acceptance flight'
    };

    expect(orderBook.sanctionedUnits).toBe(orderBook.deliveredUnits + orderBook.pendingUnits);
    expect(orderBook.batches).toHaveLength(2);
    expect(orderBook.batches[0]?.status).toBe('in_production');
    expect(orderBook.batches[1]?.units).toBe(97);
  });

  it('should instantiate and validate iDEX/ADITI challenge statement contracts', () => {
    const challenge: IdexChallenge = {
      id: 'idex-disc14-avionics-01',
      edition: 'DISC 14',
      psNumber: 'DISC14-IAF-08',
      title: 'Gallium Nitride (GaN) Solid-State Transmit/Receive Modules for AESA Radars',
      nodalAgency: 'Indian Air Force (IAF)',
      grantAmount: '₹1.50 Cr',
      problemDescription: 'Development of indigenous high-efficiency X-band GaN T/R modules for airborne fire control radars.',
      targetCapability: 'Indigenous high-power solid-state radar transmitter frontend replacing imported GaAs modules.',
      mappedProgramId: 'tejas-mk1a',
      status: 'awarded',
      officialPdfUrl: 'https://idex.gov.in/sites/default/files/disc14_ps08.pdf'
    };

    expect(challenge.edition).toBe('DISC 14');
    expect(challenge.mappedProgramId).toBe('tejas-mk1a');
    expect(challenge.grantAmount).toContain('1.50');
    expect(challenge.officialPdfUrl).toMatch(/^https:\/\/idex\.gov\.in/);
  });

  it('should support folding specs, order book, and iDEX challenges into StrategicProgram', () => {
    const program: StrategicProgram = {
      id: 'amca',
      name: 'Advanced Medium Combat Aircraft (AMCA)',
      shortName: 'AMCA',
      domain: 'aerospace',
      stage: 'sanctioned',
      leadAgency: 'ADA / DRDO & HAL',
      serviceBranch: ['Indian Air Force'],
      sanctionedBudgetCrores: 15000,
      indigenousPercentage: 70,
      summary: '5th Generation stealth multirole air superiority and strike fighter.',
      keySubsystems: [],
      keyMilestones: [],
      searchAliases: ['AMCA', '5th Gen Fighter'],
      specs: {
        programId: 'amca',
        performance: { maxSpeed: 'Mach 2.15', rcsEstimate: '0.0001 m²' },
        armament: { internalBays: true, hardpointsCount: 8 }
      },
      orderBook: {
        programId: 'amca',
        sanctionedUnits: 140,
        contractedUnits: 0,
        deliveredUnits: 0,
        pendingUnits: 140,
        batches: []
      },
      idexChallenges: []
    };

    expect(program.specs?.armament?.internalBays).toBe(true);
    expect(program.orderBook?.sanctionedUnits).toBe(140);
    expect(program.idexChallenges).toEqual([]);
  });
});

describe('Strategic Program Strings SSOT (Phase 1.1)', () => {
  it('should define all modal navigation tab labels and ARIA descriptors', () => {
    expect(STRINGS.programs.tabOverview).toBe('Overview');
    expect(STRINGS.programs.tabSpecifications).toBe('Specifications');
    expect(STRINGS.programs.tabOrderBook).toBe('Order Book & Deliveries');
    expect(STRINGS.programs.tabIdex).toBe('iDEX Challenges');
    expect(STRINGS.programs.tabAriaLabel).toBeDefined();
  });

  it('should define all Jane-grade technical specification headings and metric units', () => {
    expect(STRINGS.programs.specsDimensionsHeading).toBeDefined();
    expect(STRINGS.programs.specsPerformanceHeading).toBeDefined();
    expect(STRINGS.programs.specsPropulsionHeading).toBeDefined();
    expect(STRINGS.programs.specsAvionicsHeading).toBeDefined();
    expect(STRINGS.programs.specsArmamentHeading).toBeDefined();
    expect(STRINGS.programs.specsNoData).toBeDefined();
    expect(STRINGS.programs.specsUnitMeters).toBe('m');
    expect(STRINGS.programs.specsUnitKg).toBe('kg');
    expect(STRINGS.programs.specsUnitKm).toBe('km');
    expect(STRINGS.programs.specsUnitKmh).toBe('km/h');
    expect(STRINGS.programs.specsUnitKn).toBe('kN');
    expect(STRINGS.programs.specsUnitTons).toBe('tons');
    expect(STRINGS.programs.specsUnitHours).toBe('hrs');
  });

  it('should define all order book badges, labels, and empty states', () => {
    expect(STRINGS.programs.orderBookHeading).toBeDefined();
    expect(STRINGS.programs.orderBookSanctioned).toBe('Sanctioned Units');
    expect(STRINGS.programs.orderBookContracted).toBe('Contracted Units');
    expect(STRINGS.programs.orderBookDelivered).toBe('Delivered');
    expect(STRINGS.programs.orderBookInProduction).toBe('In Production');
    expect(STRINGS.programs.orderBookPending).toBe('Backlog / Pending');
    expect(STRINGS.programs.orderBookContractValue).toBe('Contract Value');
    expect(STRINGS.programs.orderBookDeliverySchedule).toBe('Delivery Schedule');
    expect(STRINGS.programs.orderBookFacility).toBe('Manufacturing Facility');
    expect(STRINGS.programs.orderBookRecipients).toBe('Recipient Bases / Squadrons');
    expect(STRINGS.programs.orderBookProgressLabel).toBe('Production & Delivery Progress');
    expect(STRINGS.programs.orderBookUnitsSuffix).toBe('Units');
    expect(STRINGS.programs.orderBookEmpty).toBeDefined();
  });

  it('should define all iDEX and ADITI challenge card labels and empty states', () => {
    expect(STRINGS.programs.idexHeading).toBeDefined();
    expect(STRINGS.programs.idexSubheading).toBeDefined();
    expect(STRINGS.programs.idexNodalAgency).toBe('Nodal Agency');
    expect(STRINGS.programs.idexGrantCeiling).toBe('Grant Ceiling');
    expect(STRINGS.programs.idexTargetCapability).toBe('Target Capability');
    expect(STRINGS.programs.idexProblemStatement).toBe('Problem Statement');
    expect(STRINGS.programs.idexOfficialPdf).toBe('Official PDF');
    expect(STRINGS.programs.idexDownloadPdfAria).toBeDefined();
    expect(STRINGS.programs.idexStatusOpen).toBe('Challenge Open');
    expect(STRINGS.programs.idexStatusAwarded).toBe('Grant Awarded');
    expect(STRINGS.programs.idexEmpty).toBeDefined();
  });
});

describe('Strategic Program Color & Token Integration (Phase 1.1)', () => {
  it('should have valid hex colors for all 5 program domains', () => {
    const domains = ['aerospace', 'naval', 'land', 'missiles', 'unmanned'] as const;
    domains.forEach((domain) => {
      expect(COLOR_PALETTE.programDomain[domain]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('should map CSS variables correctly for program domains and stages', () => {
    expect(CSS_VARS.domainAerospace).toBe('var(--dw-domain-aerospace)');
    expect(CSS_VARS.domainNaval).toBe('var(--dw-domain-naval)');
    expect(CSS_VARS.domainLand).toBe('var(--dw-domain-land)');
    expect(CSS_VARS.domainMissiles).toBe('var(--dw-domain-missiles)');
    expect(CSS_VARS.domainUnmanned).toBe('var(--dw-domain-unmanned)');

    expect(CSS_VARS.stageConceptBg).toBe('var(--dw-stage-concept-bg)');
    expect(CSS_VARS.stageSanctionedBg).toBe('var(--dw-stage-sanctioned-bg)');
    expect(CSS_VARS.stageDevBg).toBe('var(--dw-stage-dev-bg)');
    expect(CSS_VARS.stageTrialsBg).toBe('var(--dw-stage-trials-bg)');
    expect(CSS_VARS.stageProdBg).toBe('var(--dw-stage-prod-bg)');
    expect(CSS_VARS.stageInductionBg).toBe('var(--dw-stage-induction-bg)');
  });
});
