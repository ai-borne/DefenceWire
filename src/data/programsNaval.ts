/**
 * 9 Strategic Naval Warfare & Submarine Programs
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';

export const NAVAL_PROGRAMS: StrategicProgram[] = [
  {
    id: 'project-75i',
    name: 'Project 75(I) AIP Submarines',
    shortName: 'Project 75(I)',
    domain: 'naval',
    stage: 'trials',
    leadAgency: 'Indian Navy / MDL / L&T',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 43000,
    indigenousPercentage: 60,
    targetInductionYear: '2030-2036',
    plannedUnits: 6,
    summary: 'Procurement of 6 advanced diesel-electric attack submarines featuring fuel-cell Air Independent Propulsion (AIP) and land-attack cruise missiles.',
    searchAliases: ['project 75i', 'p-75i', 'project 75(i)', 'p75i', 'aip submarine'],
    specifications: { 'Displacement': '3000+ Tonnes', 'Propulsion': 'Fuel Cell AIP + Li-ion', 'Weapons': 'Heavy Torpedoes & BrahMos VLS' },
    keySubsystems: [
      { name: 'Fuel Cell AIP Module', type: 'Propulsion / Engine', indigenous: false, supplier: 'Navantia / TKMS Strategic Partner', status: 'Field Evaluation Complete' },
      { name: 'Submarine Combat Management System', type: 'Avionics / EW', indigenous: true, supplier: 'BEL / MDL', status: 'Design' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-07', title: 'Field Evaluation Trials (FET) Completed in Germany & Spain', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Commercial Price Bid Opening & Contract Award', status: 'in_progress' }
    ]
  },
  {
    id: 'project-75-kalvari',
    name: 'Project 75 (Kalvari / Scorpene Follow-on)',
    shortName: 'P-75 Scorpene (Batch 2)',
    domain: 'naval',
    stage: 'production',
    leadAgency: 'MDL / Naval Group',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 20000,
    indigenousPercentage: 65,
    targetInductionYear: '2028-2031',
    plannedUnits: 3,
    summary: 'Construction of 3 additional Kalvari-class diesel-electric submarines at Mazagon Dock Shipbuilders with DRDO AIP retrofit capability.',
    searchAliases: ['kalvari follow-on', 'scorpene batch 2', 'p75 follow-on', 'ins vagsheer'],
    keySubsystems: [
      { name: 'DRDO Phosphoric Acid Fuel Cell AIP', type: 'Propulsion / Engine', indigenous: true, supplier: 'NMRL / L&T', status: 'Plug Integration Phase' },
      { name: 'Varunastra Heavyweight Torpedoes', type: 'Armament / Payload', indigenous: true, supplier: 'BDL / NSTL', status: 'Production' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-07', title: 'DAC Clearance for 3 Additional Scorpene Submarines', status: 'completed' },
      { id: 'm2', date: '2024-12', title: 'Commercial Contract Finalization with Naval Group', status: 'completed' }
    ]
  },
  {
    id: 'project-76',
    name: 'Project 76 (Indigenous Conventional SSK)',
    shortName: 'Project 76 SSK',
    domain: 'naval',
    stage: 'concept',
    leadAgency: 'Submarine Design Group (SDG) / DRDO',
    serviceBranch: ['Indian Navy'],
    indigenousPercentage: 80,
    targetInductionYear: '2033-2038',
    plannedUnits: 6,
    summary: 'First 100% indigenously designed conventional diesel-electric attack submarine class incorporating DRDO AIP and lithium-ion battery banks.',
    searchAliases: ['project 76', 'p-76', 'project 76 submarine', 'indigenous ssk'],
    keySubsystems: [
      { name: 'Indigenous Submarine Hydrodynamic Hull', type: 'Hull / Airframe', indigenous: true, supplier: 'SDG / NSTL', status: 'CFD Hydrodynamics' },
      { name: 'High-Density Lithium-Ion Battery Bank', type: 'Propulsion / Engine', indigenous: true, supplier: 'NMRL / BHEL', status: 'Cell Testing' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-10', title: 'Preliminary Design Review Sanctioned', status: 'completed' },
      { id: 'm2', date: '2027', title: 'Detailed Design Clearance & Steel Cutting', status: 'upcoming' }
    ]
  },
  {
    id: 'project-17b',
    name: 'Project 17B (Next-Gen Guided Missile Stealth Frigates)',
    shortName: 'Project 17B Frigates',
    domain: 'naval',
    stage: 'sanctioned',
    leadAgency: 'Indian Navy / MDL / GRSE',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 70000,
    indigenousPercentage: 75,
    targetInductionYear: '2028-2035',
    plannedUnits: 8,
    summary: 'Follow-on class to Project 17A Nilgiri frigates, featuring enhanced stealth topside design, long-range SAMs, and BrahMos supersonic anti-ship missiles.',
    searchAliases: ['project 17b', 'p-17b', 'p17b frigate', 'nilgiri follow-on'],
    keySubsystems: [
      { name: 'MF-STAR / Indigenous Multi-Function Radar', type: 'Radar / Sensor', indigenous: true, supplier: 'BEL / DRDO', status: 'Production' },
      { name: '32-cell Vertical Launch MRSAM System', type: 'Armament / Payload', indigenous: true, supplier: 'BDL / IAI', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-09', title: 'DAC Clearance for 7-8 P-17B Stealth Frigates (₹70,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2026', title: 'Shipyard Contract Sign & First Hull Steel Cutting', status: 'upcoming' }
    ]
  },
  {
    id: 'project-18',
    name: 'Project 18 (Next-Gen Guided Missile Destroyer)',
    shortName: 'Project 18 Destroyer',
    domain: 'naval',
    stage: 'concept',
    leadAgency: 'Warship Design Bureau (WDB) / MDL',
    serviceBranch: ['Indian Navy'],
    indigenousPercentage: 75,
    targetInductionYear: '2030-2038',
    plannedUnits: 8,
    summary: '10,000+ tonne next-generation destroyer equipped with Integrated Electric Propulsion (IEP), directed energy weapons, and hypersonic anti-ship missiles.',
    searchAliases: ['project 18', 'p-18', 'project 18 destroyer', 'next gen destroyer'],
    specifications: { 'Displacement': '10000+ Tonnes', 'Propulsion': 'Integrated Electric Propulsion (IEP)', 'Armament': 'Universal Vertical Launch Systems' },
    keySubsystems: [
      { name: 'Integrated Electric Propulsion (IEP)', type: 'Propulsion / Engine', indigenous: true, supplier: 'BHEL / Rolls-Royce JV', status: 'R&D' },
      { name: 'Hypersonic BrahMos-II Launch Tubes', type: 'Armament / Payload', indigenous: true, supplier: 'BrahMos Aerospace', status: 'Concept' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-04', title: 'Warship Design Bureau Baseline Sizing Finalized', status: 'completed' },
      { id: 'm2', date: '2028', title: 'Detailed Design Contract Clearance', status: 'upcoming' }
    ]
  },
  {
    id: 'project-75-alpha-ssn',
    name: 'Project 75 Alpha (Nuclear Attack Submarines - SSN)',
    shortName: 'Project 75 Alpha SSN',
    domain: 'naval',
    stage: 'sanctioned',
    leadAgency: 'Indian Navy / BARC / DRDO / MDL / SBC',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 40000,
    indigenousPercentage: 90,
    targetInductionYear: '2032-2037',
    plannedUnits: 6,
    summary: 'Indigenous nuclear-powered attack submarines powered by BARC 190MW reactor, designed for unlimited underwater endurance and Indo-Pacific dominance.',
    searchAliases: ['project 75 alpha', 'p-75 alpha', 'ssn program', 'nuclear attack submarine'],
    keySubsystems: [
      { name: '190 MW Compact Light Water Reactor', type: 'Propulsion / Engine', indigenous: true, supplier: 'BARC / L&T', status: 'Detailed Design' },
      { name: 'Submarine-Launched Cruise Missile (SLCM)', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO / ADE', status: 'Flight Validated' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-10', title: 'CCS Approval for First 2 Nuclear Attack Submarines (₹40,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2026', title: 'Dry Dock Assembly at Shipbuilding Centre Visakhapatnam', status: 'in_progress' }
    ]
  },
  {
    id: 's4-s5-ssbn',
    name: 'S4 & S5 Strategic SSBN (Ballistic Missile Submarines)',
    shortName: 'S4 / S5 SSBN',
    domain: 'naval',
    stage: 'production',
    leadAgency: 'ATV Project / Indian Navy / DRDO / BARC',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 50000,
    indigenousPercentage: 85,
    targetInductionYear: '2025-2032',
    plannedUnits: 4,
    summary: 'Second-strike nuclear triad deterrent submarines capable of launching K-4 (3500 km) and K-5 (5000 km) submarine-launched ballistic missiles.',
    searchAliases: ['s4 ssbn', 's5 ssbn', 'ins arighat', 'ins aridhaman', 'arihant class follow-on'],
    keySubsystems: [
      { name: 'K-4 / K-5 SLBM VLS Tubes', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO (ASL) / BDL', status: 'Serial Induction' },
      { name: 'Compact Nuclear Propulsion Plant', type: 'Propulsion / Engine', indigenous: true, supplier: 'BARC / L&T', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-08', title: 'Commissioning of 2nd SSBN INS Arighat (S3)', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Sea Acceptance Trials for 3rd SSBN (S4 / Aridhaman)', status: 'in_progress' }
    ]
  },
  {
    id: 'iac-2-vishal',
    name: 'IAC-2 / INS Vishal (65,000-Tonne Aircraft Carrier)',
    shortName: 'IAC-2 Aircraft Carrier',
    domain: 'naval',
    stage: 'sanctioned',
    leadAgency: 'Indian Navy / CSL (Cochin Shipyard)',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 40000,
    indigenousPercentage: 80,
    targetInductionYear: '2032-2036',
    plannedUnits: 1,
    summary: 'Repeat 45,000-tonne indigenous aircraft carrier (IAC-2) with modifications to maintain 3-carrier operational readiness across both seaboards.',
    searchAliases: ['iac-2', 'iac 2', 'ins vishal', 'second indigenous aircraft carrier'],
    keySubsystems: [
      { name: 'DMR 249A Special Steel Hull', type: 'Hull / Airframe', indigenous: true, supplier: 'SAIL / Midhani', status: 'Standardized' },
      { name: 'Indigenous Combat Management System (CMS)', type: 'Avionics / EW', indigenous: true, supplier: 'BEL / WDB', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-11', title: 'DAC In-Principle Clearance for IAC-2 Repeat Order (₹40,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2026', title: 'Formal CCS Financial Sanction & Dry Dock Booking', status: 'in_progress' }
    ]
  },
  {
    id: 'ngc-ngmv',
    name: 'NGC & NGMV (Next Gen Corvettes & Missile Vessels)',
    shortName: 'NGC & NGMV Corvettes',
    domain: 'naval',
    stage: 'production',
    leadAgency: 'Indian Navy / GRSE / CSL / Goa Shipyard',
    serviceBranch: ['Indian Navy'],
    sanctionedBudgetCrores: 36000,
    indigenousPercentage: 70,
    targetInductionYear: '2026-2032',
    plannedUnits: 14,
    summary: 'High-speed stealth littoral combat vessels and next-generation corvettes armed with BrahMos anti-ship missiles and SR-SAM air defense.',
    searchAliases: ['ngc corvette', 'ngmv', 'next generation corvette', 'next gen missile vessel'],
    keySubsystems: [
      { name: 'BrahMos Anti-Ship VLS Cells', type: 'Armament / Payload', indigenous: true, supplier: 'BrahMos Aerospace', status: 'Production' },
      { name: 'VL-SRSAM Vertical Launch Air Defense', type: 'Armament / Payload', indigenous: true, supplier: 'DRDO / BDL', status: 'Sea Trial Validated' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-03', title: 'Contract Signed for 6 NGMV Vessels at Cochin Shipyard (₹9,805 Cr)', status: 'completed' },
      { id: 'm2', date: '2024-06', title: 'AoN Processed for 8 Next Generation Corvettes (₹36,000 Cr)', status: 'completed' }
    ]
  }
];
