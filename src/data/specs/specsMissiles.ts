/**
 * 10 Strategic Air Defense, Deterrence & Missile Technical Specifications
 * Jane's-grade specifications for SAMs, BVR missiles, cruise missiles, quasi-ballistic & BMD interceptors.
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';

export const MISSILE_SPECS: ProgramTechnicalSpecs[] = [
  {
    programId: 'project-kusha',
    dimensions: { length: '6.5 m - 7.5 m', diameter: '0.45 m', emptyWeightKg: 1400, mtowKg: 1800 },
    performance: { maxSpeed: 'Mach 5.5 (Hypersonic Breakout)', combatRadiusKm: 350, serviceCeilingMeters: 30000 },
    propulsion: { engineModel: 'Dual-Pulse Solid Rocket Motor with Thrust Vector Control', engineType: 'Two-stage solid propellant with thrust vectoring' },
    avionics: {
      radarSuite: 'Multi-Function Active Phased Array Radar (MFAR) with GaN TR Modules (400 km tracking)',
      ewSuite: 'Electronic Counter-Countermeasures (ECCM) and anti-jam uplink',
      datalink: 'Encrypted dual-channel uplink with airborne AEW&C handoff'
    },
    armament: {
      payloadCapacityKg: 180, compatibleWeapons: ['150 km interceptor', '250 km interceptor', '350 km interceptor'],
      gunSystem: 'Directional pre-fragmented blast warhead with active radio proximity fuse'
    }
  },
  {
    programId: 's400-triumf',
    dimensions: { length: '7.5 m (48N6DM) / 8.5 m (40N6E)', diameter: '0.52 m', emptyWeightKg: 1900, mtowKg: 2600 },
    performance: { maxSpeed: 'Mach 6.0 to Mach 14.0 (40N6E)', combatRadiusKm: 400, serviceCeilingMeters: 35000 },
    propulsion: { engineModel: 'Single/Two-Stage Solid Fuel Rocket Motors', engineType: 'Solid rocket motor with gas-dynamic maneuver thrusters' },
    avionics: {
      radarSuite: '91N6E Big Bird 600km acquisition radar + 92N6E Grave Stone multi-function radar',
      ewSuite: 'All-azimuth electronic protection against heavy radar jamming',
      datalink: 'Secure UHF command link with automatic battery target distribution'
    },
    armament: {
      payloadCapacityKg: 180, compatibleWeapons: ['40N6E (400 km)', '48N6DM (250 km)', '9M96E2 (120 km)'],
      gunSystem: 'Controlled fragmentation warhead with active radar terminal homing'
    }
  },
  {
    programId: 'akash-ng',
    dimensions: { length: '5.2 m', diameter: '0.35 m', emptyWeightKg: 450, mtowKg: 650 },
    performance: { maxSpeed: 'Mach 2.5', combatRadiusKm: 80, serviceCeilingMeters: 20000 },
    propulsion: { engineModel: 'Dual-Pulse Solid Rocket Motor', engineType: 'Two-pulse solid propellant with composite casing' },
    avionics: {
      radarSuite: 'Active Array Battery Surveillance Radar (BSR) & BMFR',
      ewSuite: 'Indigenous Ku-band Active RF Seeker (RCI/BDL)',
      datalink: 'Command-to-Line-of-Sight with mid-course encrypted update'
    },
    armament: { payloadCapacityKg: 60, compatibleWeapons: ['Canisterized pre-fragmented warhead with digital proximity fuse'] }
  },
  {
    programId: 'qrsam',
    dimensions: { length: '4.4 m', diameter: '0.28 m', emptyWeightKg: 280, mtowKg: 350 },
    performance: { maxSpeed: 'Mach 4.7', combatRadiusKm: 30, serviceCeilingMeters: 14000 },
    propulsion: { engineModel: 'Single-Stage Solid Propellant with Thrust Vector Control (TVC)', engineType: 'Solid rocket motor with composite casing' },
    avionics: {
      radarSuite: 'Active Array Battery Surveillance Radar (BSR) + Battery Multi-Function Radar',
      ewSuite: 'Active RF seeker with high jam resistance',
      datalink: 'Two-way tactical datalink mounted on high-mobility 8x8 chassis'
    },
    armament: { payloadCapacityKg: 30, compatibleWeapons: ['Pre-fragmented warhead with active laser proximity fuse'] }
  },
  {
    programId: 'vshorads',
    dimensions: { length: '1.85 m', diameter: '0.09 m', emptyWeightKg: 18, mtowKg: 22 },
    performance: { maxSpeed: 'Mach 2.0', combatRadiusKm: 7, serviceCeilingMeters: 4500 },
    propulsion: { engineModel: 'Dual-Thrust Solid Propellant Motor with Reaction Control System (RCS)', engineType: 'Solid booster and sustainer motor' },
    avionics: {
      radarSuite: 'Helmet-mounted sight / Tripod optical director',
      ewSuite: 'Uncooled Dual-Band Imaging Infrared (IIR) Seeker with flare rejection',
      datalink: 'Fire-and-forget autonomous guidance'
    },
    armament: { payloadCapacityKg: 3.5, compatibleWeapons: ['High-explosive pre-fragmented warhead with optical proximity sensor'] }
  },
  {
    programId: 'astra-bvr',
    dimensions: { length: '3.84 m (Mk1) / 4.1 m (Mk2)', diameter: '0.178 m', emptyWeightKg: 154, mtowKg: 165 },
    performance: { maxSpeed: 'Mach 4.5+', combatRadiusKm: 160, serviceCeilingMeters: 20000 },
    propulsion: { engineModel: 'Solid Propellant (Mk1) / Dual-Pulse (Mk2) / SFDR Ramjet (Mk3)', engineType: 'Dual-pulse solid motor / Solid fuel ducted ramjet', dryThrustKn: 25.0 },
    avionics: {
      radarSuite: 'Indigenous Ku-Band Active Radar Seeker (RCI/BDL)',
      ewSuite: 'Anti-jam monopulse electronics and digital signal processor',
      datalink: 'Fibre-optic gyro inertial guidance with two-way mid-course datalink'
    },
    armament: { payloadCapacityKg: 15, compatibleWeapons: ['High-explosive pre-fragmented directional warhead with laser proximity fuse'] }
  },
  {
    programId: 'brahmos-supersonic',
    dimensions: { length: '8.4 m', diameter: '0.67 m', emptyWeightKg: 2500, mtowKg: 3000 },
    performance: { maxSpeed: 'Mach 3.0 (3,700 km/h)', combatRadiusKm: 500, serviceCeilingMeters: 15000 },
    propulsion: { engineModel: 'Solid Propellant Booster Stage + Liquid-Fuel Ramjet Sustainer', engineType: 'Two-stage solid booster / liquid ramjet', dryThrustKn: 40.0 },
    avionics: {
      radarSuite: 'Active Radar Homing Seeker with target discrimination suite',
      ewSuite: 'Stealth radar-absorbent coatings & 10m sea-skimming flight profile',
      datalink: 'Mid-course satellite update (NavIC / GLONASS) and terminal seeker guidance'
    },
    armament: { payloadCapacityKg: 300, compatibleWeapons: ['Semi-armor-piercing warhead / High-explosive penetrator / Submunitions'] }
  },
  {
    programId: 'rudram-anti-radiation',
    dimensions: { length: '5.5 m', diameter: '0.3 m', emptyWeightKg: 600, mtowKg: 700 },
    performance: { maxSpeed: 'Mach 2.0 to Mach 5.5', combatRadiusKm: 200, serviceCeilingMeters: 15000 },
    propulsion: { engineModel: 'Dual-Pulse Solid Rocket Motor', engineType: 'Solid rocket motor with pulse-separation delay' },
    avionics: {
      radarSuite: 'Passive Homing Head (PHH) detecting enemy radar signals over broad frequency band',
      ewSuite: 'Millimeter-wave active seeker + electro-optical homing terminal mode',
      datalink: 'INS/GPS NavIC guidance with passive radiation lock-on before/after launch'
    },
    armament: { payloadCapacityKg: 100, compatibleWeapons: ['Pre-fragmented blast-fragmentation warhead with proximity burst fuse'] }
  },
  {
    programId: 'pralay-missile',
    dimensions: { length: '8.9 m', diameter: '0.74 m', emptyWeightKg: 3800, mtowKg: 5000 },
    performance: { maxSpeed: 'Mach 6.1 (Terminal Hypersonic)', combatRadiusKm: 500, serviceCeilingMeters: 40000 },
    propulsion: { engineModel: 'Single-Stage Solid Rocket Motor with Composite Casing', engineType: 'Solid rocket propellant with jet vane thrust vector control' },
    avionics: {
      radarSuite: 'Fused Inertial Navigation System + Indian NavIC / GPS satellite guidance',
      ewSuite: 'Terminal aerodynamic fin maneuvering to defeat ballistic missile interceptors',
      datalink: 'Hardened real-time tactical command link'
    },
    armament: { payloadCapacityKg: 700, compatibleWeapons: ['High-explosive pre-fragmented blast (PCB)', 'Penetration blast warhead', 'Runway-cratering submunitions'] }
  },
  {
    programId: 'phase-2-bmd',
    dimensions: { length: '11.0 m (AD-1) / 13.5 m (AD-2)', diameter: '0.85 m', emptyWeightKg: 5500, mtowKg: 7500 },
    performance: { maxSpeed: 'Mach 7.5+ (Hypersonic Exo/Endo Interceptor)', combatRadiusKm: 2500, serviceCeilingMeters: 100000 },
    propulsion: { engineModel: 'Two-Stage Solid Rocket Motor with Secondary Reaction Thrusters', engineType: 'Two-stage solid with composite motor casings' },
    avionics: {
      radarSuite: 'Swordfish Long-Range Tracking Radar (Active Phased Array, 1500 km detection)',
      ewSuite: 'Kinetic kill vehicle with optical seeker and cold-gas attitude control thrusters',
      datalink: 'Mil-STD ground-to-interceptor secure fiber/RF datalink'
    },
    armament: { payloadCapacityKg: 120, compatibleWeapons: ['Direct Kinetic Impact Hit-to-Kill Vehicle (HTK) with directional fragmentation backup'] }
  }
];
