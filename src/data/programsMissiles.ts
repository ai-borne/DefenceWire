/**
 * 10 Strategic Air Defense, Deterrence & Missile Programs
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';

export const MISSILE_PROGRAMS: StrategicProgram[] = [
  {
    id: 'project-kusha',
    name: 'Project Kusha / ERADS (Indigenous Long-Range SAM)',
    shortName: 'Project Kusha (ERADS)',
    domain: 'missiles',
    stage: 'development',
    leadAgency: 'DRDO (DRDL / RCI) / IAF',
    serviceBranch: ['Indian Air Force', 'Indian Army'],
    sanctionedBudgetCrores: 21700,
    indigenousPercentage: 80,
    targetInductionYear: '2028-2030',
    plannedUnits: 5,
    summary: 'India’s sovereign long-range surface-to-air missile system with 3 interceptors (150 km, 250 km, 350 km) against stealth jets, cruise missiles, and ballistic targets.',
    searchAliases: ['project kusha', 'erads', 'kusha missile', 'indigenous s-400', 'drdo erads'],
    specifications: { 'Max Range': '350 km', 'Interceptors': '3-Tier (150km / 250km / 350km)', 'Radar': 'Multi-Function GaN AESA' },
    keySubsystems: [
      { name: 'Multi-Function Active Phased Array Radar (MFAR)', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Fabrication' },
      { name: 'Dual-Pulse Solid Interceptor Rocket Motor', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDL / HEMRL', status: 'Static Firing Complete' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-09', title: 'CCS Approval for Project Kusha Development (₹21,700 Cr)', status: 'completed' },
      { id: 'm2', date: '2025', title: 'First Subsystem Integration Flight Test', status: 'in_progress' }
    ]
  },
  {
    id: 's400-triumf',
    name: 'S-400 Triumf (Long-Range Air Defence Regiments)',
    shortName: 'S-400 Triumf',
    domain: 'missiles',
    stage: 'induction',
    leadAgency: 'IAF / Almaz-Antey (Imported + Local Support)',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 39000,
    indigenousPercentage: 20,
    targetInductionYear: '2021-2026',
    plannedUnits: 5,
    summary: 'Tier-1 strategic multi-layered air defense shield operational across northern and eastern sectors with 400 km interception envelope.',
    searchAliases: ['s-400', 's400', 's-400 triumf', 's400 squadron', 'sudarshan'],
    keySubsystems: [
      { name: '40N6E Long-Range Interceptor (400 km)', type: 'Armament / Payload', indigenous: false, supplier: 'Almaz-Antey', status: 'Operational' },
      { name: '91N6E Panoramic Radar (600 km detection)', type: 'Radar / Sensor', indigenous: false, supplier: 'Almaz-Antey', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2021-12', title: 'First S-400 Squadron Inducted in Punjab Sector', status: 'completed' },
      { id: 'm2', date: '2024-08', title: '3 Squadrons Deployed; Final 2 Delivery Schedule Finalized', status: 'completed' }
    ]
  },
  {
    id: 'akash-ng',
    name: 'Akash-NG (New Generation Surface-to-Air Missile)',
    shortName: 'Akash-NG SAM',
    domain: 'missiles',
    stage: 'trials',
    leadAgency: 'DRDO (DRDL) / BDL / BEL',
    serviceBranch: ['Indian Air Force', 'Indian Army'],
    sanctionedBudgetCrores: 10000,
    indigenousPercentage: 85,
    targetInductionYear: '2025-2027',
    plannedUnits: 20,
    summary: 'Canisterized quick-reaction SAM with dual-pulse motor and active RF seeker intercepting agile high-speed threats at 70-80 km.',
    searchAliases: ['akash-ng', 'akash ng', 'akash new generation', 'akash missile'],
    keySubsystems: [
      { name: 'Active RF Seeker', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI / BDL', status: 'Flight Validated' },
      { name: 'Dual-Pulse Solid Rocket Motor', type: 'Propulsion / Engine', indigenous: true, supplier: 'HEMRL', status: 'Production' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-01', title: 'Successful Flight Interception Against High-Speed Target Drone at ITR', status: 'completed' },
      { id: 'm2', date: '2024-09', title: 'User Evaluation Trials for Induction Clearance', status: 'completed' }
    ]
  },
  {
    id: 'qrsam',
    name: 'QRSAM (Quick Reaction Surface-to-Air Missile)',
    shortName: 'QRSAM Air Defense',
    domain: 'missiles',
    stage: 'trials',
    leadAgency: 'DRDO / BEL / BDL',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 12000,
    indigenousPercentage: 85,
    targetInductionYear: '2025-2027',
    plannedUnits: 15,
    summary: 'Armoured mobile all-weather air defense system capable of searching and tracking on the move to protect tank columns.',
    searchAliases: ['qrsam', 'quick reaction sam', 'qrsam army'],
    keySubsystems: [
      { name: 'Active Array Battery Surveillance Radar (BSR)', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Field Validated' },
      { name: 'Single-Stage Solid Propellant with Thrust Vectoring', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDL', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-09', title: 'Successful Salvo Firing Validation against Multiple Threats', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Commercial RFP Processing by Army HQ', status: 'in_progress' }
    ]
  },
  {
    id: 'vshorads',
    name: 'VSHORADS (Very Short Range Air Defense System)',
    shortName: 'VSHORADS MANPADS',
    domain: 'missiles',
    stage: 'production',
    leadAgency: 'DRDO (RCI) / Adani Defence / ICOMM',
    serviceBranch: ['Indian Army', 'Indian Navy', 'Indian Air Force'],
    sanctionedBudgetCrores: 4800,
    indigenousPercentage: 90,
    targetInductionYear: '2025-2028',
    plannedUnits: 4800,
    summary: '4th-generation man-portable air defense missile equipped with uncooled dual-band IIR seeker and Reaction Control System (RCS).',
    searchAliases: ['vshorads', 'vshorad', 'manpads', 'drdo vshorads'],
    keySubsystems: [
      { name: 'Dual-Band Uncooled IIR Seeker', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI', status: 'Serial Production' },
      { name: 'Miniature Reaction Control System (RCS)', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDO / Private Industry', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-02', title: 'Consecutive Successful Flight Tests from Tripod Launchers', status: 'completed' },
      { id: 'm2', date: '2024-08', title: 'Development-cum-Production Partner (DcPP) Contracts Awarded', status: 'completed' }
    ]
  },
  {
    id: 'astra-bvr',
    name: 'Astra BVR (Beyond Visual Range Air-to-Air: Mk1 / Mk2 / Mk3)',
    shortName: 'Astra BVR Suite',
    domain: 'missiles',
    stage: 'production',
    leadAgency: 'DRDO (DRDL / RCI) / BDL / IAF',
    serviceBranch: ['Indian Air Force', 'Indian Navy'],
    sanctionedBudgetCrores: 7000,
    indigenousPercentage: 85,
    targetInductionYear: '2024-2028',
    plannedUnits: 1000,
    summary: 'All-weather air-to-air missile family: Mk1 (110 km inducted), Mk2 (160 km dual-pulse trials), and Mk3 (340 km SFDR ramjet).',
    searchAliases: ['astra', 'astra mk1', 'astra mk2', 'astra mk3', 'astra bvr', 'sfdr'],
    specifications: { 'Astra Mk1': '110 km Range', 'Astra Mk2': '160 km (Dual-Pulse)', 'Astra Mk3': '340 km (SFDR Ramjet)', 'Speed': 'Mach 4.5+' },
    keySubsystems: [
      { name: 'Solid Fuel Ducted Ramjet (SFDR) Engine', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDL', status: 'Flight Validated' },
      { name: 'Indigenous Ku-Band Active Radar Seeker', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI / BDL', status: 'Production' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-08', title: 'Astra Mk1 Successfully Fired from LCA Tejas Prototype', status: 'completed' },
      { id: 'm2', date: '2024-04', title: 'Astra Mk2 Captive Flight Trials on Su-30MKI', status: 'completed' }
    ]
  },
  {
    id: 'brahmos-supersonic',
    name: 'BrahMos Supersonic Cruise Missile Suite (ER / NG / II)',
    shortName: 'BrahMos Missile Suite',
    domain: 'missiles',
    stage: 'production',
    leadAgency: 'BrahMos Aerospace (DRDO / NPOM Joint Venture)',
    serviceBranch: ['Indian Army', 'Indian Navy', 'Indian Air Force'],
    sanctionedBudgetCrores: 35000,
    indigenousPercentage: 75,
    targetInductionYear: 'Active Production',
    plannedUnits: 2000,
    summary: 'World’s fastest supersonic operational cruise missile (Mach 3) with extended 450-800 km range and upcoming miniaturized BrahMos-NG for fighters.',
    searchAliases: ['brahmos', 'brahmos-er', 'brahmos-ng', 'brahmos missile', 'brahmos ii'],
    keySubsystems: [
      { name: 'Indigenous Ramjet Propulsion & Seeker', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDL / BrahMos', status: 'Production' },
      { name: 'Universal Vertical Launcher Module (UVLM)', type: 'Armament / Payload', indigenous: true, supplier: 'L&T / Godrej Aerospace', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-02', title: '₹19,518 Cr Contract for 200+ BrahMos-ER Missiles for Indian Navy', status: 'completed' },
      { id: 'm2', date: '2024-04', title: 'First Overseas Delivery of BrahMos Batteries to Philippines', status: 'completed' }
    ]
  },
  {
    id: 'rudram-anti-radiation',
    name: 'Rudram NGARM (Next-Gen Anti-Radiation Missiles: I / II / III)',
    shortName: 'Rudram NGARM',
    domain: 'missiles',
    stage: 'trials',
    leadAgency: 'DRDO (DRDL / RCI) / IAF',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 3000,
    indigenousPercentage: 85,
    targetInductionYear: '2025-2028',
    plannedUnits: 400,
    summary: 'Air-launched supersonic anti-radiation missile to neutralize enemy radar installations, SAM batteries, and air defense command posts.',
    searchAliases: ['rudram', 'rudram-1', 'rudram-2', 'rudram-3', 'ngarm', 'anti-radiation missile'],
    keySubsystems: [
      { name: 'Passive Homing Head with Wideband Radar Detection', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI', status: 'Flight Proven' },
      { name: 'Dual-Pulse Rocket Propulsion', type: 'Propulsion / Engine', indigenous: true, supplier: 'HEMRL', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-05', title: 'Successful Flight Test of Rudram-II Air-to-Surface Missile from Su-30MKI', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Induction Flight Clearances for IAF Fighter Fleets', status: 'in_progress' }
    ]
  },
  {
    id: 'pralay-missile',
    name: 'Pralay (Quasi-Ballistic Tactical Surface-to-Surface Missile)',
    shortName: 'Pralay Quasi-Ballistic',
    domain: 'missiles',
    stage: 'production',
    leadAgency: 'DRDO / BDL',
    serviceBranch: ['Indian Army', 'Indian Air Force'],
    sanctionedBudgetCrores: 4000,
    indigenousPercentage: 90,
    targetInductionYear: '2024-2027',
    plannedUnits: 250,
    summary: 'Solid-fuel quasi-ballistic missile with 150-500 km range capable of high-speed terminal maneuvers to defeat anti-ballistic interceptors along LAC/LoC.',
    searchAliases: ['pralay', 'pralay missile', 'quasi-ballistic', 'rocket force missile'],
    keySubsystems: [
      { name: 'Jet Vane Thrust Vectoring Control', type: 'Propulsion / Engine', indigenous: true, supplier: 'DRDL', status: 'Production' },
      { name: 'Fused Inertial-GNSS Navigation Unit', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-09', title: 'DAC Clearance for Induction of 250+ Pralay Missiles', status: 'completed' },
      { id: 'm2', date: '2024', title: 'Serial Assembly at BDL Hyderabad for Rocket Force units', status: 'in_progress' }
    ]
  },
  {
    id: 'phase-2-bmd',
    name: 'Phase-II BMD (Ballistic Missile Defence: AD-1 & AD-2)',
    shortName: 'Phase-II BMD Interceptor',
    domain: 'missiles',
    stage: 'trials',
    leadAgency: 'DRDO (RCI / DRDL) / Strategic Forces Command',
    serviceBranch: ['Tri-Services'],
    sanctionedBudgetCrores: 18000,
    indigenousPercentage: 88,
    targetInductionYear: '2026-2030',
    plannedUnits: 10,
    summary: 'Two-stage long-range interceptor missile system capable of neutralizing 5,000 km class intermediate-range ballistic missiles in endo/exo-atmospheric regimes.',
    searchAliases: ['bmd', 'phase-ii bmd', 'ad-1', 'ad-2', 'ballistic missile defence'],
    keySubsystems: [
      { name: 'Long Range Tracking Radar (Phase-II LRTR / Swordfish)', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Operational' },
      { name: 'Exo-Atmospheric Hit-to-Kill Vehicle', type: 'Guidance / Navigation', indigenous: true, supplier: 'RCI / DRDL', status: 'Flight Tested' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-07', title: 'Successful Maiden Flight Test of Phase-II AD-1 Interceptor against 5,000km Target', status: 'completed' },
      { id: 'm2', date: '2026', title: 'Operational Network Deployment around Strategic Enclaves', status: 'upcoming' }
    ]
  }
];
