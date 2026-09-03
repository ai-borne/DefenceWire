/**
 * Verified Indian Defence MSME & Supplier Directory — Seed Data: Deep-Tech / iDEX Startups
 * Every linkedPrograms[].programId is a real id from src/data/strategicPrograms.ts,
 * sourced directly from that program's keySubsystems[].supplier field.
 * Hard limit: <= 300 LOC.
 */

import type { SupplierProfile } from '../../types/suppliers.js';

const STARTUP_SUPPLIERS: SupplierProfile[] = [
  {
    id: 'newspace-research',
    slug: 'newspace-research',
    name: 'NewSpace Research & Technologies',
    tier: 'deep_tech_startup',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    website: 'https://newspaceresearch.com',
    description: 'Bengaluru-based deep-tech startup building autonomous swarm-drone mesh networking and AI mission-control software for the Indian Army.',
    idexWinner: true,
    isListed: false,
    capabilities: [{ supplierId: 'newspace-research', capabilityDomain: 'Counter-UAS', certifications: [] }],
    linkedPrograms: [
      { programId: 'alfa-s-swarms', subsystemName: 'Autonomous Distributed Mesh AI Brain', supplierId: 'newspace-research', tier: 'deep_tech_startup', indigenisationStatus: 'idex_winner' }
    ]
  },
  {
    id: 'qnu-labs',
    slug: 'qnu-labs',
    name: 'QNu Labs',
    tier: 'deep_tech_startup',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    website: 'https://qnulabs.com',
    description: 'India\'s first quantum-safe cybersecurity company, developing quantum key distribution terminals for secure satellite communications.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'qnu-labs', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'Quantum Key Distribution (QKD) Satellite Terminal', supplierId: 'qnu-labs', tier: 'deep_tech_startup', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'galaxeye',
    slug: 'galaxeye',
    name: 'GalaxEye Space',
    tier: 'deep_tech_startup',
    hqCity: 'Chennai',
    hqState: 'Tamil Nadu',
    corridor: 'Tamil Nadu',
    website: 'https://galaxeye.space',
    description: 'IIT Madras-incubated space-tech startup building multi-sensor (SAR + optical) Earth observation satellites for defence and dual-use surveillance.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'galaxeye', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'Sub-Metre Synthetic Aperture Radar (SAR) Space Payload', supplierId: 'galaxeye', tier: 'deep_tech_startup', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'piersight-space',
    slug: 'piersight-space',
    name: 'PierSight Space',
    tier: 'deep_tech_startup',
    hqCity: 'Ahmedabad',
    hqState: 'Gujarat',
    description: 'iDEX/ADITI-backed startup building SAR satellite constellations for maritime domain awareness.',
    idexWinner: true,
    isListed: false,
    capabilities: [{ supplierId: 'piersight-space', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'SAR Maritime Domain Awareness Payload', supplierId: 'piersight-space', tier: 'deep_tech_startup', indigenisationStatus: 'idex_winner' }
    ]
  },
  {
    id: 'big-bang-boom-solutions',
    slug: 'big-bang-boom-solutions',
    name: 'Big Bang Boom Solutions',
    tier: 'deep_tech_startup',
    hqCity: 'Pune',
    hqState: 'Maharashtra',
    corridor: 'Pune',
    description: 'Counter-drone and explosive-ordnance-disposal robotics startup.',
    idexWinner: true,
    isListed: false,
    capabilities: [{ supplierId: 'big-bang-boom-solutions', capabilityDomain: 'Counter-UAS', certifications: [] }],
    linkedPrograms: [
      { programId: 'd4-anti-drone', subsystemName: 'EOD & Counter-Drone Robotics Systems', supplierId: 'big-bang-boom-solutions', tier: 'deep_tech_startup', indigenisationStatus: 'idex_winner' }
    ]
  },
  {
    id: 'lekha-wireless',
    slug: 'lekha-wireless',
    name: 'Lekha Wireless Solutions',
    tier: 'tier2_msme',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    description: 'Defence tactical communications and SATCOM systems manufacturer.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'lekha-wireless', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'tapas-archer-uav', subsystemName: 'Tactical SATCOM & Radio Systems', supplierId: 'lekha-wireless', tier: 'tier2_msme', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'tonbo-imaging',
    slug: 'tonbo-imaging',
    name: 'Tonbo Imaging',
    tier: 'deep_tech_startup',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    corridor: 'Bengaluru',
    description: 'Stabilized electro-optic and infrared imaging systems manufacturer supplying gimbal-mounted reconnaissance payloads for unmanned platforms.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'tonbo-imaging', capabilityDomain: 'Seeker Optics & EO/IR', certifications: [] }],
    linkedPrograms: [
      { programId: 'tapas-archer-uav', subsystemName: 'EO/IR Reconnaissance Payload', supplierId: 'tonbo-imaging', tier: 'deep_tech_startup', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'dhruva-space',
    slug: 'dhruva-space',
    name: 'Dhruva Space',
    tier: 'deep_tech_startup',
    hqCity: 'Hyderabad',
    hqState: 'Telangana',
    corridor: 'Hyderabad',
    description: 'Full-stack space engineering startup building modular satellite bus platforms and ground station infrastructure.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'dhruva-space', capabilityDomain: 'Radar & RF', certifications: [] }],
    linkedPrograms: [
      { programId: 'defspace-satellites', subsystemName: 'Modular Satellite Bus Platform', supplierId: 'dhruva-space', tier: 'deep_tech_startup', indigenisationStatus: 'in_house' }
    ]
  },
  {
    id: 'optimized-electrotech',
    slug: 'optimized-electrotech',
    name: 'Optimized Electrotech',
    tier: 'tier2_msme',
    hqCity: 'Pune',
    hqState: 'Maharashtra',
    corridor: 'Pune',
    description: 'Electronic warfare manufacturer building RF jamming and drone-neutralization systems for counter-UAS defence.',
    idexWinner: false,
    isListed: false,
    capabilities: [{ supplierId: 'optimized-electrotech', capabilityDomain: 'Counter-UAS', certifications: [] }],
    linkedPrograms: [
      { programId: 'd4-anti-drone', subsystemName: 'RF Jamming & Neutralization Systems', supplierId: 'optimized-electrotech', tier: 'tier2_msme', indigenisationStatus: 'in_house' }
    ]
  }
];

export default STARTUP_SUPPLIERS;
