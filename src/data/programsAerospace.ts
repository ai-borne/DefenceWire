/**
 * 11 Strategic Aerospace & Combat Aviation Programs
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';

export const AEROSPACE_PROGRAMS: StrategicProgram[] = [
  {
    id: 'tejas-mk1a',
    name: 'LCA Tejas Mk1A (4.5 Gen Fighter)',
    shortName: 'Tejas Mk1A',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'ADA / HAL',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 115000,
    indigenousPercentage: 65,
    targetInductionYear: '2024-2029',
    plannedUnits: 180,
    summary: 'Single-engine 4.5-generation multirole supersonic fighter featuring AESA radar, BVR missiles, and advanced electronic warfare suite.',
    searchAliases: ['tejas mk1a', 'tejas mk-1a', 'lca tejas', 'tejas mark 1a'],
    specifications: { 'Speed': 'Mach 1.8', 'Combat Range': '500 km', 'Hardpoints': '8', 'Max Payload': '5300 kg' },
    keySubsystems: [
      { name: 'Uttam AESA Radar', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Induction' },
      { name: 'GE F404-IN20 Engine', type: 'Propulsion / Engine', indigenous: false, supplier: 'GE Aerospace', status: 'Serial Delivery' },
      { name: 'Angad EW Suite', type: 'Avionics / EW', indigenous: true, supplier: 'DARE / BEL', status: 'Integrated' },
      { name: 'Astra Mk1 BVR', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO / BDL', status: 'Certified' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2021-02', title: 'CCS Contract for 83 Jets', status: 'completed' },
      { id: 'm2', date: '2024-03', title: 'First Production Aircraft Flight (LA-5033)', status: 'completed' },
      { id: 'm3', date: '2024-11', title: 'DAC Clearance for 97 Additional Jets', status: 'completed' }
    ]
  },
  {
    id: 'tejas-mk2',
    name: 'LCA Tejas Mk2 / MWF (Medium Weight Fighter)',
    shortName: 'Tejas Mk2',
    domain: 'aerospace',
    stage: 'development',
    leadAgency: 'ADA / DRDO / HAL',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 9000,
    indigenousPercentage: 70,
    targetInductionYear: '2028-2030',
    plannedUnits: 120,
    summary: '17.5-tonne medium weight fighter with close-coupled canards, increased internal fuel capacity, and GE F414-INS6 98kN engine.',
    searchAliases: ['tejas mk2', 'tejas mk-2', 'medium weight fighter', 'mwf'],
    specifications: { 'MTOW': '17500 kg', 'Payload': '6500 kg', 'Hardpoints': '11', 'Speed': 'Mach 1.8' },
    keySubsystems: [
      { name: 'GE F414-INS6 (100% ToT)', type: 'Propulsion / Engine', indigenous: false, supplier: 'GE Aerospace / HAL FAL', status: 'Agreement Signed' },
      { name: 'Uttam Mk2 AESA', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Fabrication' },
      { name: 'Astra Mk2 & Scalp / Crystal Maze', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO / BDL', status: 'Design Integration' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-09', title: 'CCS Sanction for Mk2 Development', status: 'completed' },
      { id: 'm2', date: '2026', title: 'Prototype Metal Cutting & Rollout', status: 'in_progress' },
      { id: 'm3', date: '2027', title: 'First Test Flight', status: 'upcoming' }
    ]
  },
  {
    id: 'amca',
    name: 'AMCA (5th Gen Stealth Multi-Role Fighter)',
    shortName: 'AMCA',
    domain: 'aerospace',
    stage: 'development',
    leadAgency: 'ADA / DRDO / IAF',
    serviceBranch: ['Indian Air Force', 'Indian Navy'],
    sanctionedBudgetCrores: 15000,
    indigenousPercentage: 75,
    targetInductionYear: '2032-2035',
    plannedUnits: 140,
    summary: 'Twin-engine 5th-generation stealth multirole fighter with internal weapons bays, supercruise, and sensor fusion.',
    searchAliases: ['amca', 'advanced medium combat aircraft', 'amca mk1', 'amca mk2'],
    specifications: { 'Stealth': 'VLO (Very Low Observable)', 'Engines': 'Twin 90kN / 110kN', 'Internal Bay': '4x Astra BVR', 'Speed': 'Mach 2.15' },
    keySubsystems: [
      { name: 'Internal Weapons Bay', type: 'Armament / Payload', indigenous: true, supplier: 'ADA / Private SPV', status: 'CAD Design Complete' },
      { name: '110kN Indigenous Engine', type: 'Propulsion / Engine', indigenous: true, supplier: 'GTRE / Safran Co-Dev', status: 'Feasibility Finalized' },
      { name: 'Uttam Gallium Nitride AESA', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Sub-array Testing' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-03', title: 'CCS Sanction for AMCA Prototypes (₹15,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2028', title: 'First Prototype Rollout', status: 'upcoming' },
      { id: 'm3', date: '2029', title: 'Maiden Test Flight', status: 'upcoming' }
    ]
  },
  {
    id: 'tedbf',
    name: 'TEDBF (Twin Engine Deck Based Fighter)',
    shortName: 'TEDBF',
    domain: 'aerospace',
    stage: 'development',
    leadAgency: 'ADA / Indian Navy',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 14000,
    indigenousPercentage: 70,
    targetInductionYear: '2031-2034',
    plannedUnits: 45,
    summary: 'Twin-engine carrier-borne omni-role fighter designed for ski-jump STOBAR operations on INS Vikrant and future carriers.',
    searchAliases: ['tedbf', 'twin engine deck based fighter', 'naval lca'],
    specifications: { 'Role': 'Carrier STOBAR', 'Max Speed': 'Mach 1.6', 'Wings': 'Folding Wingtips' },
    keySubsystems: [
      { name: 'Twin GE F414 Engines', type: 'Propulsion / Engine', indigenous: false, supplier: 'GE Aerospace', status: 'Selected' },
      { name: 'Arrested Recovery Gear Hook', type: 'Hull / Airframe', indigenous: true, supplier: 'ADA / HAL', status: 'Design' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2020-04', title: 'Naval Staff Qualitative Requirements Formulated', status: 'completed' },
      { id: 'm2', date: '2029', title: 'First Prototype Flight', status: 'upcoming' }
    ]
  },
  {
    id: 'ghatak-ucav',
    name: 'Ghatak / SWiFT (Autonomous Stealth Flying-Wing UCAV)',
    shortName: 'Ghatak UCAV',
    domain: 'aerospace',
    stage: 'development',
    leadAgency: 'DRDO (ADE / GTRE)',
    serviceBranch: ['Indian Air Force', 'Indian Navy'],
    indigenousPercentage: 80,
    targetInductionYear: '2027-2029',
    summary: 'Autonomous flying-wing stealth combat drone powered by dry Kaveri engine for deep penetrating precision strike.',
    searchAliases: ['ghatak', 'swift', 'aura', 'stealth ucav', 'ghatak ucav'],
    keySubsystems: [
      { name: 'Dry Kaveri Turbofan (46kN)', type: 'Propulsion / Engine', indigenous: true, supplier: 'GTRE', status: 'High Altitude Test Complete' },
      { name: 'Autonomous Flight Control Computer', type: 'Avionics / EW', indigenous: true, supplier: 'ADE', status: 'Flight Validated on SWiFT' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-07', title: 'SWiFT Technology Demonstrator Maiden Flight', status: 'completed' },
      { id: 'm2', date: '2023-12', title: 'Autonomous Landing in Tail-less Configuration', status: 'completed' }
    ]
  },
  {
    id: 'netra-aewc',
    name: 'Netra AEW&C (Mk1 / Mk1A / Mk2 Airborne Early Warning)',
    shortName: 'Netra AEW&C',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'DRDO (CABS) / IAF',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 20000,
    indigenousPercentage: 80,
    targetInductionYear: '2026-2030',
    plannedUnits: 12,
    summary: 'Airborne surveillance and battle management system mounted on Airbus A321 (Mk2) and Embraer ERJ-145 (Mk1A).',
    searchAliases: ['netra', 'netra aew&c', 'netra mk2', 'netra mk1a', 'airborne early warning'],
    keySubsystems: [
      { name: 'Active Antenna Array Unit (AAAU)', type: 'Radar / Sensor', indigenous: true, supplier: 'CABS / LRDE', status: 'Production' },
      { name: 'Indigenous IFF Mk XII', type: 'Avionics / EW', indigenous: true, supplier: 'BEL', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2021-09', title: 'CCS Approval for 6 Netra Mk2 on Airbus A321', status: 'completed' },
      { id: 'm2', date: '2024', title: 'Airframe Modification at HAL/Airbus', status: 'in_progress' }
    ]
  },
  {
    id: 'prachand-lch',
    name: 'Prachand LCH (Dedicated Light Combat Helicopter)',
    shortName: 'Prachand LCH',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'HAL',
    serviceBranch: ['Indian Air Force', 'Indian Army'],
    sanctionedBudgetCrores: 45000,
    indigenousPercentage: 55,
    targetInductionYear: '2024-2028',
    plannedUnits: 156,
    summary: 'High-altitude 5.8-tonne attack helicopter capable of operating at 5,000m elevation in Siachen and eastern Ladakh.',
    searchAliases: ['prachand', 'lch', 'light combat helicopter', 'prachand lch'],
    specifications: { 'Ceiling': '6500 m', 'Max Speed': '268 km/h', 'Gun': '20mm THL20 Turret' },
    keySubsystems: [
      { name: 'Twin Shakti Engines', type: 'Propulsion / Engine', indigenous: true, supplier: 'HAL / Safran Joint Venture', status: 'Production' },
      { name: 'Helina / Dhruvastra ATGM', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO / BDL', status: 'User Trials' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-10', title: 'Formal Fleet Induction into IAF 143 HU', status: 'completed' },
      { id: 'm2', date: '2024-06', title: 'AoN for 156 Serial Helicopters (₹45,000 Cr)', status: 'completed' }
    ]
  },
  {
    id: 'luh',
    name: 'LUH (Light Utility Helicopter - 3 Tonne Class)',
    shortName: 'LUH',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'HAL',
    serviceBranch: ['Indian Army', 'Indian Air Force'],
    sanctionedBudgetCrores: 6000,
    indigenousPercentage: 60,
    targetInductionYear: '2025-2028',
    plannedUnits: 187,
    summary: 'Single-engine utility helicopter replacing Cheetah and Chetak fleets with high-altitude Siachen payload capability.',
    searchAliases: ['luh', 'light utility helicopter', 'hal luh'],
    keySubsystems: [
      { name: 'Ardiden 1U Engine', type: 'Propulsion / Engine', indigenous: true, supplier: 'HAL / Safran Joint Venture', status: 'Production' },
      { name: 'Smart Glass Cockpit', type: 'Avionics / EW', indigenous: true, supplier: 'HAL Tumakuru', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-02', title: 'Tumakuru Helicopter Factory Inauguration', status: 'completed' },
      { id: 'm2', date: '2024-08', title: 'Initial Operational Clearance (IOC) Fleet Delivery', status: 'completed' }
    ]
  },
  {
    id: 'imrh',
    name: 'IMRH / DBMRH (Indian Multi-Role Helicopter - 13 Tonne)',
    shortName: 'IMRH',
    domain: 'aerospace',
    stage: 'development',
    leadAgency: 'HAL / Safran',
    serviceBranch: ['Indian Army', 'Indian Air Force', 'Indian Navy'],
    sanctionedBudgetCrores: 12000,
    indigenousPercentage: 65,
    targetInductionYear: '2029-2032',
    plannedUnits: 250,
    summary: 'Heavy multirole helicopter to replace Russian Mi-17 and naval Sea King helicopters with indigenous high-capacity platform.',
    searchAliases: ['imrh', 'dbmrh', 'indian multi role helicopter'],
    keySubsystems: [
      { name: 'Safran-HAL Joint Turboshaft Engine', type: 'Propulsion / Engine', indigenous: true, supplier: 'Safran / HAL JV', status: 'Workshare Finalized' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-02', title: 'Engine Development Workshare Signed with Safran', status: 'completed' },
      { id: 'm2', date: '2027', title: 'First Prototype Rollout', status: 'upcoming' }
    ]
  },
  {
    id: 'c295-transport',
    name: 'C-295 Tactical Transport (Make-in-India)',
    shortName: 'C-295 Transport',
    domain: 'aerospace',
    stage: 'production',
    leadAgency: 'TASL / Airbus Defence',
    serviceBranch: ['Indian Air Force', 'Indian Navy'],
    sanctionedBudgetCrores: 21935,
    indigenousPercentage: 48,
    targetInductionYear: '2023-2031',
    plannedUnits: 71,
    summary: 'Tactical transport aircraft replacing vintage HS-748 Avro fleet, with 40 units manufactured at TASL Vadodara Final Assembly Line.',
    searchAliases: ['c-295', 'c295', 'c 295', 'tasl c295', 'airbus c295'],
    specifications: { 'Troop Capacity': '71 Troops / 48 Paratroopers', 'Payload': '9250 kg', 'Range': '4500 km' },
    keySubsystems: [
      { name: 'Pratt & Whitney PW127G Engines', type: 'Propulsion / Engine', indigenous: false, supplier: 'P&WC', status: 'Production' },
      { name: 'Indigenous EW Suite', type: 'Avionics / EW', indigenous: true, supplier: 'BEL', status: 'Integration' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-09', title: 'First Flyaway Aircraft Handed to IAF in Spain', status: 'completed' },
      { id: 'm2', date: '2024-10', title: 'Vadodara Final Assembly Line Inaugurated', status: 'completed' }
    ]
  },
  {
    id: 'su30mki-super-sukhoi',
    name: 'Su-30MKI "Super Sukhoi" Modernization',
    shortName: 'Super Sukhoi',
    domain: 'aerospace',
    stage: 'sanctioned',
    leadAgency: 'IAF / HAL / DRDO',
    serviceBranch: ['Indian Air Force'],
    sanctionedBudgetCrores: 65000,
    indigenousPercentage: 78,
    targetInductionYear: '2026-2032',
    plannedUnits: 84,
    summary: 'Comprehensive indigenous upgrade of 84 frontline Su-30MKI fighters with Virupaksha AESA radar, mission computers, and long-range BVRs.',
    searchAliases: ['super sukhoi', 'su-30mki', 'su-30', 'su-30mki upgrade', 'su30 upgrade', 'virupaksha radar'],
    keySubsystems: [
      { name: 'Virupaksha AESA Radar', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / BEL', status: 'Prototyping' },
      { name: 'High-Power Mission Computer', type: 'Avionics / EW', indigenous: true, supplier: 'DARE / HAL', status: 'Lab Trials' },
      { name: 'BrahMos & Astra Integration', type: 'Armament / Payload', indigenous: true, supplier: 'BrahMos / BDL', status: 'Active' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-11', title: 'DAC Clearance for 84 Fighter Upgrades (₹65,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2025', title: 'First Upgraded Prototype Test Flight', status: 'in_progress' }
    ]
  }
];
