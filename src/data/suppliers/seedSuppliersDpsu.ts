/**
 * Verified Indian Defence MSME & Supplier Directory — Seed Data: DPSUs
 * Every linkedPrograms[].programId is a real id from src/data/strategicPrograms.ts,
 * sourced directly from that program's keySubsystems[].supplier field.
 * Hard limit: <= 300 LOC.
 */

import type { SupplierProfile } from '../../types/suppliers.js';

const DPSU_SUPPLIERS: SupplierProfile[] = [
  {
    id: 'bel',
    slug: 'bel',
    name: 'Bharat Electronics Limited',
    tier: 'dpsu',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    website: 'https://bel-india.in',
    description:
      'India\'s premier defence electronics DPSU, building radars, EW suites, communications and combat management systems for the armed forces.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'BEL',
    capabilities: [{ supplierId: 'bel', capabilityDomain: 'Radar & RF', certifications: ['CEMILAC', 'DGAQA'] }],
    linkedPrograms: [
      { programId: 'tejas-mk1a', subsystemName: 'Uttam AESA Radar', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'tejas-mk2', subsystemName: 'Uttam Mk2 AESA', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'amca', subsystemName: 'Uttam Gallium Nitride AESA', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'netra-aewc', subsystemName: 'Indigenous IFF Mk XII', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'c295-transport', subsystemName: 'Indigenous EW Suite', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'su30mki-super-sukhoi', subsystemName: 'Virupaksha AESA Radar', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'project-75i', subsystemName: 'Submarine Combat Management System', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'project-17b', subsystemName: 'MF-STAR / Indigenous Multi-Function Radar', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'iac-2-vishal', subsystemName: 'Indigenous Combat Management System (CMS)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'project-kusha', subsystemName: 'Multi-Function Active Phased Array Radar (MFAR)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'qrsam', subsystemName: 'Active Array Battery Surveillance Radar (BSR)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'phase-2-bmd', subsystemName: 'Long Range Tracking Radar (Phase-II LRTR / Swordfish)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'tapas-archer-uav', subsystemName: 'Indigenous SATCOM Datalink', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'd4-anti-drone', subsystemName: 'Multi-Band RF Detector & Smart Jammer', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'arjun-mk1a', subsystemName: 'Advanced Laser Warning & Countermeasure System (ALWCS)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'frcv', subsystemName: 'Hard-Kill Active Protection System (APS)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'whap-kestrel', subsystemName: '30mm Remote Controlled Weapon Station (RCWS)', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'k9-vajra-t', subsystemName: 'Digital Fire Control System & Automatic Sighting', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'mgs-155', subsystemName: 'Automated Gun Laying & Inertial Navigation System', supplierId: 'bel', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'bdl',
    slug: 'bdl',
    name: 'Bharat Dynamics Limited',
    tier: 'dpsu',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    website: 'https://www.bdl-india.in',
    description: 'India\'s guided-missile DPSU, manufacturing air-to-air, surface-to-air and anti-tank missile systems and torpedoes.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'bdl', capabilityDomain: 'Energetic Materials', certifications: [] }],
    linkedPrograms: [
      { programId: 'tejas-mk1a', subsystemName: 'Astra Mk1 BVR', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'tejas-mk2', subsystemName: 'Astra Mk2 & Scalp / Crystal Maze', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'prachand-lch', subsystemName: 'Helina / Dhruvastra ATGM', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'project-75-kalvari', subsystemName: 'Varunastra Heavyweight Torpedoes', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'project-17b', subsystemName: '32-cell Vertical Launch MRSAM System', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 's4-s5-ssbn', subsystemName: 'K-4 / K-5 SLBM VLS Tubes', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'ngc-ngmv', subsystemName: 'VL-SRSAM Vertical Launch Air Defense', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'astra-bvr', subsystemName: 'Indigenous Ku-Band Active Radar Seeker', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'akash-ng', subsystemName: 'Active RF Seeker', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'ficv', subsystemName: '30mm Auto-Cannon & Fire-and-Forget ATGM Pod', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'su30mki-super-sukhoi', subsystemName: 'BrahMos & Astra Integration', supplierId: 'bdl', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'hal',
    slug: 'hal',
    name: 'Hindustan Aeronautics Limited',
    tier: 'dpsu',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    website: 'https://hal-india.co.in',
    description: 'India\'s largest aerospace DPSU, designing and building fighter jets, helicopters and engines under license and indigenously.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'HAL',
    capabilities: [{ supplierId: 'hal', capabilityDomain: 'Propulsion', certifications: ['CEMILAC', 'AS9100D'] }],
    linkedPrograms: [
      { programId: 'tedbf', subsystemName: 'Arrested Recovery Gear Hook', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'prachand-lch', subsystemName: 'Twin Shakti Engines', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'licensed_production' },
      { programId: 'luh', subsystemName: 'Ardiden 1U Engine', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'licensed_production' },
      { programId: 'luh', subsystemName: 'Smart Glass Cockpit', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'imrh', subsystemName: 'Safran-HAL Joint Turboshaft Engine', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'licensed_production' },
      { programId: 'alfa-s-swarms', subsystemName: 'Mother Pod Dispenser for Su-30MKI / C-130J', supplierId: 'hal', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'mdl',
    slug: 'mdl',
    name: 'Mazagon Dock Shipbuilders Limited',
    tier: 'dpsu',
    hqCity: 'Mumbai',
    hqState: 'Maharashtra',
    website: 'https://www.mazagondock.in',
    description: 'India\'s leading warship and submarine building yard, constructing frontline submarines and destroyers for the Indian Navy.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'MAZDOCK',
    capabilities: [{ supplierId: 'mdl', capabilityDomain: 'Naval & Undersea', certifications: [] }],
    linkedPrograms: [
      { programId: 'project-75i', subsystemName: 'Submarine Combat Management System', supplierId: 'mdl', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'beml',
    slug: 'beml',
    name: 'BEML Limited',
    tier: 'dpsu',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    website: 'https://www.bemlindia.in',
    description: 'Heavy engineering DPSU manufacturing tracked powerpacks, high-mobility chassis and specialist vehicles for the Indian Army.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'BEML',
    capabilities: [{ supplierId: 'beml', capabilityDomain: 'Precision Machining', certifications: [] }],
    linkedPrograms: [
      { programId: 'frcv', subsystemName: '1500 HP Indigenous Powerpack', supplierId: 'beml', tier: 'dpsu', indigenisationStatus: 'in_house' },
      { programId: 'mgs-155', subsystemName: 'High Mobility 8x8 Heavy Truck Chassis', supplierId: 'beml', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'avnl',
    slug: 'avnl',
    name: 'Armoured Vehicles Nigam Limited',
    tier: 'dpsu',
    hqCity: 'New Delhi',
    hqState: 'Delhi',
    description: 'DPSU spun off from the erstwhile Ordnance Factory Board, responsible for armoured and infantry combat vehicle production.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'avnl', capabilityDomain: 'Precision Machining', certifications: [] }],
    linkedPrograms: [
      { programId: 'ficv', subsystemName: 'Amphibious Hydro-Jet Thrusters', supplierId: 'avnl', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'midhani',
    slug: 'midhani',
    name: 'Mishra Dhatu Nigam Limited',
    tier: 'dpsu',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    website: 'https://www.midhani-india.in',
    description: 'Special metals and alloys DPSU, supplying high-grade armour and shipbuilding steel to Indian defence platforms.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'MIDHANI',
    capabilities: [{ supplierId: 'midhani', capabilityDomain: 'Precision Machining', certifications: [] }],
    linkedPrograms: [
      { programId: 'iac-2-vishal', subsystemName: 'DMR 249A Special Steel Hull', supplierId: 'midhani', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'grse',
    slug: 'grse',
    name: 'Garden Reach Shipbuilders & Engineers',
    tier: 'dpsu',
    hqCity: 'Kolkata',
    hqState: 'West Bengal',
    website: 'https://www.grse.in',
    description: 'India\'s principal frigate and corvette building yard, delivering stealth frigates and next-generation missile vessels to the Indian Navy.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'GRSE',
    capabilities: [{ supplierId: 'grse', capabilityDomain: 'Naval & Undersea', certifications: [] }],
    linkedPrograms: [
      { programId: 'project-17b', subsystemName: 'Hull & Superstructure Construction', supplierId: 'grse', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]
  }
];

export default DPSU_SUPPLIERS;
