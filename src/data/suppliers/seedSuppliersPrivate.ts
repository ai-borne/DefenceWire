/**
 * Verified Indian Defence MSME & Supplier Directory — Seed Data: Private Primes / Tier-1
 * Every linkedPrograms[].programId is a real id from src/data/strategicPrograms.ts,
 * sourced directly from that program's keySubsystems[].supplier field.
 * Hard limit: <= 300 LOC.
 */

import type { SupplierProfile } from '../../types/suppliers.js';

const PRIVATE_SUPPLIERS: SupplierProfile[] = [
  {
    id: 'tasl',
    slug: 'tasl',
    name: 'Tata Advanced Systems Limited',
    aliases: ['Tata Advanced Systems'],
    tier: 'private_prime',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    website: 'https://www.tataadvancedsystems.com',
    description: 'Tata Group\'s defence and aerospace manufacturing arm, building airframes, weapon stations and MRO capability for Indian and global platforms.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'tasl', capabilityDomain: 'Composite Airframes', certifications: ['AS9100D'] }],
    linkedPrograms: [
      { programId: 'mq9b-guardian', subsystemName: 'Indigenous MRO & Subsystem Assembly Hub', supplierId: 'tasl', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'whap-kestrel', subsystemName: '30mm Remote Controlled Weapon Station (RCWS)', supplierId: 'tasl', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'lt-defence',
    slug: 'lt-defence',
    name: 'L&T Defence',
    aliases: ['L&T'],
    tier: 'private_prime',
    hqCity: 'Mumbai',
    hqState: 'Maharashtra',
    website: 'https://www.larsentoubro.com/defence',
    description: 'Larsen & Toubro\'s defence division, building submarine propulsion systems, reactors, missile launchers and armoured artillery.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'LT',
    capabilities: [{ supplierId: 'lt-defence', capabilityDomain: 'Naval & Undersea', certifications: [] }],
    linkedPrograms: [
      { programId: 'project-75-kalvari', subsystemName: 'DRDO Phosphoric Acid Fuel Cell AIP', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'project-75-alpha-ssn', subsystemName: '190 MW Compact Light Water Reactor', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 's4-s5-ssbn', subsystemName: 'Compact Nuclear Propulsion Plant', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'k9-vajra-t', subsystemName: 'High-Altitude Winterization Kit (-20°C)', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'k9-vajra-t', subsystemName: 'Digital Fire Control System & Automatic Sighting', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'brahmos-supersonic', subsystemName: 'Universal Vertical Launcher Module (UVLM)', supplierId: 'lt-defence', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'bharat-forge',
    slug: 'bharat-forge',
    name: 'Bharat Forge / Kalyani Strategic Systems',
    aliases: ['Bharat Forge', 'Kalyani Strategic Systems'],
    tier: 'private_prime',
    hqCity: 'Pune',
    hqState: 'Maharashtra',
    corridor: 'Pune',
    website: 'https://www.bharatforge.com',
    description: 'Kalyani Group\'s forging and defence systems arm, co-developing indigenous towed artillery guns with DRDO\'s ARDE.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'BHARATFORG',
    capabilities: [{ supplierId: 'bharat-forge', capabilityDomain: 'Precision Machining', certifications: ['AS9100D'] }],
    linkedPrograms: [
      { programId: 'atags', subsystemName: 'All-Electric Drive and Auto-Loader', supplierId: 'bharat-forge', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'atags', subsystemName: 'Shoot-and-Scoot Auxiliary Power Unit', supplierId: 'bharat-forge', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'zen-technologies',
    slug: 'zen-technologies',
    name: 'Zen Technologies',
    tier: 'private_prime',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    website: 'https://zentechnologies.com',
    description: 'Anti-drone and combat training systems manufacturer, supplying counter-UAS and active protection systems to the Indian Army.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'ZENTEC',
    capabilities: [{ supplierId: 'zen-technologies', capabilityDomain: 'Counter-UAS', certifications: [] }],
    linkedPrograms: [
      { programId: 'zorawar-light-tank', subsystemName: 'Active Protection System & Drone Pod', supplierId: 'zen-technologies', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'd4-anti-drone', subsystemName: 'Multi-Band RF Detector & Smart Jammer', supplierId: 'zen-technologies', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'godrej-aerospace',
    slug: 'godrej-aerospace',
    name: 'Godrej Aerospace',
    tier: 'private_prime',
    hqCity: 'Mumbai',
    hqState: 'Maharashtra',
    website: 'https://www.godrejaerospace.com',
    description: 'Godrej & Boyce\'s precision aerospace manufacturing division, building missile launcher structures and satellite subsystems.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'godrej-aerospace', capabilityDomain: 'Propulsion', certifications: ['AS9100D', 'CEMILAC'] }],
    linkedPrograms: [
      { programId: 'brahmos-supersonic', subsystemName: 'Universal Vertical Launcher Module (UVLM)', supplierId: 'godrej-aerospace', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'tata-motors-defence',
    slug: 'tata-motors-defence',
    name: 'Tata Motors Defence',
    tier: 'private_prime',
    hqCity: 'Pune',
    hqState: 'Maharashtra',
    corridor: 'Pune',
    website: 'https://defence.tatamotors.com',
    description: 'Tata Motors\' defence mobility division, producing blast-resistant armoured wheeled platforms for the Indian Army.',
    idexWinner: false,
    isListed: true,
    stockSymbol: 'TATAMOTORS',
    capabilities: [{ supplierId: 'tata-motors-defence', capabilityDomain: 'Precision Machining', certifications: [] }],
    linkedPrograms: [
      { programId: 'whap-kestrel', subsystemName: 'Blast-Resistant V-Shaped Hull (STANAG 4569)', supplierId: 'tata-motors-defence', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'brahmos-aerospace',
    slug: 'brahmos-aerospace',
    name: 'BrahMos Aerospace',
    aliases: ['BrahMos Aerospace Pvt Ltd'],
    tier: 'private_prime',
    hqCity: 'New Delhi',
    hqState: 'Delhi',
    website: 'https://brahmos.com',
    description: 'India-Russia joint venture developing and manufacturing the BrahMos family of supersonic cruise missiles.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'brahmos-aerospace', capabilityDomain: 'Energetic Materials', certifications: [] }],
    linkedPrograms: [
      { programId: 'brahmos-supersonic', subsystemName: 'Indigenous Ramjet Propulsion & Seeker', supplierId: 'brahmos-aerospace', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'ngc-ngmv', subsystemName: 'BrahMos Anti-Ship VLS Cells', supplierId: 'brahmos-aerospace', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'astra-microwave',
    slug: 'astra-microwave',
    name: 'Astra Microwave Products',
    aliases: ['Astra Microwave'],
    tier: 'private_prime',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    isListed: true,
    stockSymbol: 'ASTRAMICRO',
    description: 'RF/microwave subsystems and T/R-module manufacturer supplying DRDO\'s AESA radar and missile-seeker programs.',
    idexWinner: false,
    capabilities: [{ supplierId: 'astra-microwave', capabilityDomain: 'Radar & RF', certifications: ['AS9100D'] }],
    linkedPrograms: [
      { programId: 'tejas-mk1a', subsystemName: 'Uttam AESA T/R Modules', supplierId: 'astra-microwave', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'akash-ng', subsystemName: 'RF Seeker Subsystems', supplierId: 'astra-microwave', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'mtar-technologies',
    slug: 'mtar-technologies',
    name: 'MTAR Technologies',
    tier: 'private_prime',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    isListed: true,
    stockSymbol: 'MTARTECH',
    description: 'Precision-engineered missile assemblies and submarine fuel-cell AIP components manufacturer.',
    idexWinner: false,
    capabilities: [{ supplierId: 'mtar-technologies', capabilityDomain: 'Propulsion', certifications: ['AS9100D'] }],
    linkedPrograms: [
      { programId: 'brahmos-supersonic', subsystemName: 'Missile Airframe & Assembly Sections', supplierId: 'mtar-technologies', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'project-75-kalvari', subsystemName: 'Fuel Cell AIP Components', supplierId: 'mtar-technologies', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'data-patterns',
    slug: 'data-patterns',
    name: 'Data Patterns (India)',
    aliases: ['Data Patterns'],
    tier: 'private_prime',
    hqCity: 'Chennai',
    hqState: 'Tamil Nadu',
    corridor: 'Tamil Nadu',
    isListed: true,
    stockSymbol: 'DATAPATTNS',
    description: 'Defence electronics and avionics test-and-health-monitoring systems manufacturer for airborne and missile platforms.',
    idexWinner: false,
    capabilities: [{ supplierId: 'data-patterns', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'tejas-mk1a', subsystemName: 'Avionics Test & Health Monitoring Systems', supplierId: 'data-patterns', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'akash-ng', subsystemName: 'RF Test & Calibration Systems', supplierId: 'data-patterns', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'paras-defence',
    slug: 'paras-defence',
    name: 'Paras Defence and Space Technologies',
    aliases: ['Paras Defence'],
    tier: 'private_prime',
    hqCity: 'Ambernath',
    hqState: 'Maharashtra',
    isListed: true,
    stockSymbol: 'PARAS',
    description: 'Submarine periscopes and optronics-mast manufacturer for the Indian Navy.',
    idexWinner: false,
    capabilities: [{ supplierId: 'paras-defence', capabilityDomain: 'Naval & Undersea', certifications: [] }],
    linkedPrograms: [
      { programId: 'project-75-kalvari', subsystemName: 'Search & Attack Periscope / Optronics Mast', supplierId: 'paras-defence', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'centum-electronics',
    slug: 'centum-electronics',
    name: 'Centum Electronics',
    tier: 'private_prime',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    isListed: true,
    stockSymbol: 'CENTUM',
    description: 'Space-grade and defence electronics EMS provider supplying RF modules and satellite/missile guidance electronics.',
    idexWinner: false,
    capabilities: [{ supplierId: 'centum-electronics', capabilityDomain: 'Radar & RF', certifications: ['AS9100D'] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'Space-Grade RF & Payload Electronics', supplierId: 'centum-electronics', tier: 'private_prime', indigenisationStatus: 'in_house' },
      { programId: 'brahmos-supersonic', subsystemName: 'Guidance Electronics Assemblies', supplierId: 'centum-electronics', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'alpha-design-technologies',
    slug: 'alpha-design-technologies',
    name: 'Alpha Design Technologies',
    aliases: ['Alpha Design'],
    tier: 'private_prime',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    isListed: false,
    description: 'Defence electronics manufacturer and IAI joint-venture partner for MRSAM missile-system production in India.',
    idexWinner: false,
    capabilities: [{ supplierId: 'alpha-design-technologies', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'project-17b', subsystemName: '32-cell Vertical Launch MRSAM System', supplierId: 'alpha-design-technologies', tier: 'private_prime', indigenisationStatus: 'licensed_production' }
    ]
  },
  {
    id: 'ananth-technologies',
    slug: 'ananth-technologies',
    name: 'Ananth Technologies',
    tier: 'private_prime',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    isListed: false,
    description: 'Satellite subsystem integrator for ISRO and defence space payloads.',
    idexWinner: false,
    capabilities: [{ supplierId: 'ananth-technologies', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'Satellite Subsystem Integration & AIT', supplierId: 'ananth-technologies', tier: 'private_prime', indigenisationStatus: 'in_house' }
    ]
  }
];

export default PRIVATE_SUPPLIERS;
