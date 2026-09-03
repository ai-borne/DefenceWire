/**
 * 11 Strategic Aerospace & Combat Aviation Technical Specifications
 * Jane's-grade specifications for fighters, helicopters, transports & AEW&C.
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';

export const AEROSPACE_SPECS: ProgramTechnicalSpecs[] = [
  {
    programId: 'tejas-mk1a',
    dimensions: { length: '13.2 m', wingspan: '8.2 m', height: '4.4 m', emptyWeightKg: 6560, mtowKg: 13500 },
    performance: { maxSpeed: 'Mach 1.8 (1,975 km/h)', combatRadiusKm: 500, ferryRangeKm: 3200, serviceCeilingMeters: 15240, rcsEstimate: '0.5 m²', enduranceHours: 2.5 },
    propulsion: { engineModel: 'General Electric F404-GE-IN20', engineType: 'Afterburning turbofan with FADEC', dryThrustKn: 53.9, wetThrustKn: 89.8 },
    avionics: {
      radarSuite: 'Uttam AESA Radar (BEL/LRDE)',
      ewSuite: 'Angad EW Suite with Advanced Self-Protection Jammer',
      datalink: 'Software Defined Radio (SDR) with BNET-AR',
      targetTrackingCapacity: '64 aerial targets simultaneously'
    },
    armament: {
      hardpointsCount: 8, payloadCapacityKg: 5300, internalBays: false,
      compatibleWeapons: ['Astra Mk1/Mk2 BVR', 'ASRAAM', 'BrahMos-NG', 'SAAW Glide Bomb', 'R-73'],
      gunSystem: '23 mm GSh-23 twin-barrel autocannon'
    }
  },
  {
    programId: 'tejas-mk2',
    dimensions: { length: '14.6 m', wingspan: '8.5 m', height: '4.86 m', emptyWeightKg: 7850, mtowKg: 17500 },
    performance: { maxSpeed: 'Mach 1.8 (2,100 km/h)', combatRadiusKm: 650, ferryRangeKm: 3500, serviceCeilingMeters: 16500, rcsEstimate: '0.4 m²', enduranceHours: 3.5 },
    propulsion: { engineModel: 'General Electric F414-INS6', engineType: 'Afterburning turbofan (100% ToT)', dryThrustKn: 57.8, wetThrustKn: 98.0 },
    avionics: {
      radarSuite: 'Uttam Mk2 GaN AESA Radar',
      ewSuite: 'Integrated Unified Electronic Warfare Suite (UEWS)',
      datalink: 'Tactical Data Link & Secure SDR',
      targetTrackingCapacity: '100+ targets'
    },
    armament: {
      hardpointsCount: 11, payloadCapacityKg: 6500, internalBays: false,
      compatibleWeapons: ['Astra Mk1/Mk2/Mk3', 'SCALP EG', 'Crystal Maze', 'BrahMos-NG', 'Rudram-I/II'],
      gunSystem: '23 mm GSh-23 autocannon'
    }
  },
  {
    programId: 'amca',
    dimensions: { length: '17.6 m', wingspan: '11.13 m', height: '4.5 m', emptyWeightKg: 12000, mtowKg: 25000 },
    performance: { maxSpeed: 'Mach 2.15 (2,600 km/h)', combatRadiusKm: 1200, ferryRangeKm: 3240, serviceCeilingMeters: 18000, rcsEstimate: '0.001 m² (VLO 5th-gen stealth)', enduranceHours: 4.0 },
    propulsion: { engineModel: 'Twin GE F414 (Mk1) / Indigenous 110kN (Mk2)', engineType: 'Twin low-bypass turbofans with serpentine intakes', dryThrustKn: 116.0, wetThrustKn: 196.0 },
    avionics: {
      radarSuite: 'Gallium Nitride (GaN) AESA with Distributed Aperture System (DAS)',
      ewSuite: 'Advanced Integrated EW Suite with laser warning & DIRCM',
      datalink: 'Low-probability-of-intercept (LPI) high-bandwidth datalink',
      targetTrackingCapacity: '128 aerial & ground targets'
    },
    armament: {
      hardpointsCount: 14, payloadCapacityKg: 6500, internalBays: 'Conformal internal weapon bay (4x Astra Mk2/Mk3)',
      compatibleWeapons: ['Astra Mk1/Mk2/Mk3', 'Rudram-II', 'Smart Anti-Airfield Weapon (SAAW)', 'BrahMos-NG'],
      gunSystem: '23 mm GSh-23 autocannon'
    }
  },
  {
    programId: 'tedbf',
    dimensions: { length: '16.3 m', wingspan: '11.2 m (7.6 m folded)', height: '4.7 m', emptyWeightKg: 10500, mtowKg: 26000 },
    performance: { maxSpeed: 'Mach 1.6', combatRadiusKm: 800, ferryRangeKm: 3000, serviceCeilingMeters: 15500, rcsEstimate: '0.5 m²', enduranceHours: 3.5 },
    propulsion: { engineModel: 'Twin GE F414-INS6', engineType: 'Twin afterburning carrier-optimized turbofans', dryThrustKn: 115.6, wetThrustKn: 196.0 },
    avionics: {
      radarSuite: 'Uttam Maritime AESA Radar with sea-search modes',
      ewSuite: 'Indigenous Naval Electronic Warfare Suite',
      datalink: 'Indian Navy Tactical Datalink (TNDL / Link-II)'
    },
    armament: {
      hardpointsCount: 11, payloadCapacityKg: 8000, internalBays: false,
      compatibleWeapons: ['Astra Mk1/Mk2', 'NASM-SR / NASM-MR Anti-Ship Missiles', 'BrahMos-NG', 'ASRAAM']
    }
  },
  {
    programId: 'ghatak-ucav',
    dimensions: { length: '10.5 m', wingspan: '12.0 m', height: '2.5 m', emptyWeightKg: 4000, mtowKg: 13000 },
    performance: { maxSpeed: 'Mach 0.85 (High Subsonic)', combatRadiusKm: 1000, ferryRangeKm: 2500, serviceCeilingMeters: 13000, rcsEstimate: '< 0.01 m² (Flying-Wing Stealth)', enduranceHours: 6.0 },
    propulsion: { engineModel: 'Dry Kaveri Turbofan without afterburner', engineType: 'Non-afterburning turbofan with serpentine intake', dryThrustKn: 46.0 },
    avionics: {
      radarSuite: 'Low Probability of Intercept Mini-AESA / EO-IR pod',
      ewSuite: 'Autonomous Radar Warning & ECM jamming module',
      datalink: 'Secured Ku/Ka-band SATCOM datalink'
    },
    armament: {
      hardpointsCount: 2, payloadCapacityKg: 2000, internalBays: 'Twin internal weapon bays',
      compatibleWeapons: ['Precision Guided Munitions (PGMs)', 'SAAW Glide Bombs', 'Anti-Radiation Missiles']
    }
  },
  {
    programId: 'netra-aewc',
    dimensions: { length: '29.9 m (ERJ-145) / 44.5 m (A321)', wingspan: '20.0 m / 35.8 m', height: '6.8 m / 11.8 m', emptyWeightKg: 12500, mtowKg: 24000 },
    performance: { maxSpeed: '830 km/h', combatRadiusKm: 1500, ferryRangeKm: 3500, serviceCeilingMeters: 11000, enduranceHours: 5.5 },
    propulsion: { engineModel: 'Rolls-Royce AE 3007A1P / CFM LEAP-1A (A321)', engineType: 'High-bypass turbofans', dryThrustKn: 72.0 },
    avionics: {
      radarSuite: 'Active Antenna Array Unit (AAAU) with 240°/360° GaN AESA',
      ewSuite: 'Integrated ESM & ELINT suite with RWR/MAWS',
      datalink: 'Air Force Net (AFNET) / IACCS & Link-16 compatible',
      targetTrackingCapacity: '500+ tracks over 400 km'
    },
    armament: { hardpointsCount: 0, internalBays: false, gunSystem: 'Self-protection Countermeasure Dispensing System (CMDS)' }
  },
  {
    programId: 'prachand-lch',
    dimensions: { length: '15.8 m', wingspan: 'Rotor dia: 13.3 m', height: '4.7 m', emptyWeightKg: 3350, mtowKg: 5800 },
    performance: { maxSpeed: '268 km/h', combatRadiusKm: 350, ferryRangeKm: 700, serviceCeilingMeters: 6500, rcsEstimate: 'Low acoustic & radar cross-section', enduranceHours: 3.2 },
    propulsion: { engineModel: 'Twin HAL/Safran Shakti (Ardiden 1H1)', engineType: 'Turboshaft with dual FADEC', powerOutput: '2x 1,032 kW (1,384 shp)' },
    avionics: {
      radarSuite: 'Electro-Optical Pod with Laser Rangefinder & Designator',
      ewSuite: 'Saab/BEL Integrated Defensive Aids Suite (IDAS-3)',
      datalink: 'Digital tactical datalink'
    },
    armament: {
      hardpointsCount: 4, payloadCapacityKg: 1750, internalBays: false,
      compatibleWeapons: ['Helina / Dhruvastra ATGM', 'Mistral-2 Air-to-Air Missiles', '70mm FZ Rocket Pods'],
      gunSystem: '20 mm Nexter THL20 chin-mounted turret cannon'
    }
  },
  {
    programId: 'luh',
    dimensions: { length: '11.49 m', wingspan: 'Rotor dia: 11.6 m', height: '3.4 m', emptyWeightKg: 1910, mtowKg: 3150 },
    performance: { maxSpeed: '250 km/h', combatRadiusKm: 350, ferryRangeKm: 500, serviceCeilingMeters: 6500, enduranceHours: 3.5 },
    propulsion: { engineModel: 'HAL/Safran Ardiden 1U', engineType: 'Single turboshaft with dual-channel FADEC', powerOutput: '750 kW (1,006 shp)' },
    avionics: {
      radarSuite: 'Weather radar & FLIR optical payload',
      ewSuite: 'Radar Warning Receiver & CMDS',
      datalink: 'Indigenous VHF/UHF tactical radio'
    },
    armament: { hardpointsCount: 0, payloadCapacityKg: 1240, internalBays: false }
  },
  {
    programId: 'imrh',
    dimensions: { length: '19.5 m', wingspan: 'Rotor dia: 17.5 m', height: '5.8 m', emptyWeightKg: 7500, mtowKg: 13000 },
    performance: { maxSpeed: '280 km/h', combatRadiusKm: 500, ferryRangeKm: 850, serviceCeilingMeters: 6500, enduranceHours: 4.5 },
    propulsion: { engineModel: 'Twin SAFHAL JV Turboshaft Engines', engineType: 'Twin turboshaft with full authority digital engine control', powerOutput: '2x 2,000 kW (2,680 shp)' },
    avionics: {
      radarSuite: 'Multi-mode search & weather radar',
      ewSuite: 'Missile Approach Warning System (MAWS) and RWR',
      datalink: 'Tri-service secure tactical datalink'
    },
    armament: {
      hardpointsCount: 4, payloadCapacityKg: 4000, internalBays: false,
      compatibleWeapons: ['NASM-MR Anti-Ship Missiles', 'Helina ATGMs', 'ASW Torpedoes (Naval variant)'],
      gunSystem: 'Cabin door-mounted 12.7mm machine guns'
    }
  },
  {
    programId: 'c295-transport',
    dimensions: { length: '24.45 m', wingspan: '25.81 m', height: '8.6 m', emptyWeightKg: 11000, mtowKg: 23200 },
    performance: { maxSpeed: '480 km/h', combatRadiusKm: 1300, ferryRangeKm: 4500, serviceCeilingMeters: 7620, enduranceHours: 11.0 },
    propulsion: { engineModel: 'Twin Pratt & Whitney PW127G', engineType: 'Turboprop with 6-bladed Hamilton Sundstrand propellers', powerOutput: '2x 1,972 kW (2,645 shp)' },
    avionics: {
      radarSuite: 'Collins Pro Line Fusion avionics suite',
      ewSuite: 'BEL Indigenous RWR & Missile Warning System',
      datalink: 'Secure SATCOM and tactical V/UHF'
    },
    armament: { hardpointsCount: 0, payloadCapacityKg: 9250, internalBays: 'Rear ramp bay for 71 soldiers / 48 paratroopers' }
  },
  {
    programId: 'su30mki-super-sukhoi',
    dimensions: { length: '21.9 m', wingspan: '14.7 m', height: '6.4 m', emptyWeightKg: 18400, mtowKg: 38800 },
    performance: { maxSpeed: 'Mach 2.0 (2,120 km/h)', combatRadiusKm: 1500, ferryRangeKm: 8000, serviceCeilingMeters: 17300, rcsEstimate: '4.0 m² (reduced with RAM coatings)', enduranceHours: 4.5 },
    propulsion: { engineModel: 'Twin AL-31FP with thrust-vectoring nozzles', engineType: 'Afterburning turbofans with 2D TVC', dryThrustKn: 150.0, wetThrustKn: 246.0 },
    avionics: {
      radarSuite: 'Virupaksha Indigenous GaN AESA Radar',
      ewSuite: 'Advanced DARE EW suite with GaN solid-state jammer pods',
      datalink: 'AFNET, SDR-Tac, and IACCS terminal',
      targetTrackingCapacity: '30 air targets simultaneously'
    },
    armament: {
      hardpointsCount: 12, payloadCapacityKg: 8130, internalBays: false,
      compatibleWeapons: ['BrahMos-A (Heavy)', 'Astra Mk1/Mk2/Mk3', 'Rudram-I/II/III', 'Crystal Maze', 'Spice 2000'],
      gunSystem: '30 mm Gryazev-Shipunov GSh-30-1 autocannon'
    }
  }
];
