/**
 * 5 Strategic Unmanned, EW, Swarm & Space Programs
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';

export const UNMANNED_PROGRAMS: StrategicProgram[] = [
  {
    id: 'tapas-archer-uav',
    name: 'Tapas-BH-201 & Archer-NG (MALE Armed Reconnaissance UAV)',
    shortName: 'Tapas / Archer-NG UAV',
    domain: 'unmanned',
    stage: 'trials',
    leadAgency: 'DRDO (ADE) / HAL / BEL / Private Consortium',
    serviceBranch: ['Indian Air Force', 'Indian Army', 'Indian Navy'],
    sanctionedBudgetCrores: 1500,
    indigenousPercentage: 75,
    targetInductionYear: '2025-2028',
    plannedUnits: 50,
    summary: 'Medium Altitude Long Endurance (MALE) surveillance and weaponized drone capable of 28,000 ft operations with SATCOM datalink and anti-tank missiles.',
    searchAliases: ['tapas', 'tapas-bh-201', 'archer-ng', 'archer uav', 'rustom', 'rustom-2'],
    specifications: { 'Endurance': '24+ Hours', 'Altitude': '28,000 Feet', 'Payload': '350 kg', 'Datalink': 'SATCOM + C-Band LOS' },
    keySubsystems: [
      { name: 'Synthetic Aperture Radar (SAR) & EO/IR Pod', type: 'Radar / Sensor', indigenous: true, supplier: 'LRDE / ADE', status: 'Flight Validated' },
      { name: 'Indigenous SATCOM Datalink', type: 'SATCOM / Network', indigenous: true, supplier: 'DEAL / BEL', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-06', title: '200th Flight Milestone Achieved with Full Mission Payload', status: 'completed' },
      { id: 'm2', date: '2024-05', title: 'Archer-NG Weaponized Flight Trials Commenced', status: 'completed' }
    ]
  },
  {
    id: 'mq9b-guardian',
    name: 'MQ-9B SkyGuardian & SeaGuardian (Tri-Service HALE Drones)',
    shortName: 'MQ-9B Guardian Drones',
    domain: 'unmanned',
    stage: 'sanctioned',
    leadAgency: 'Ministry of Defence / General Atomics',
    serviceBranch: ['Indian Navy', 'Indian Air Force', 'Indian Army'],
    sanctionedBudgetCrores: 32000,
    indigenousPercentage: 20,
    targetInductionYear: '2026-2029',
    plannedUnits: 31,
    summary: 'High Altitude Long Endurance (HALE) drones with 40+ hour endurance, anti-submarine warfare suite, and Hellfire precision strike missiles.',
    searchAliases: ['mq-9b', 'mq9b', 'skyguardian', 'seaguardian', 'predator drone'],
    specifications: { 'Endurance': '40+ Hours', 'Ceiling': '40,000+ Feet', 'Payload': '2155 kg', 'Strike Weapons': 'Hellfire Missiles & JDAM' },
    keySubsystems: [
      { name: '360° Multi-Mode Maritime Radar & Sonobuoy Dispenser', type: 'Radar / Sensor', indigenous: false, supplier: 'General Atomics', status: 'Selected' },
      { name: 'Indigenous MRO & Subsystem Assembly Hub', type: 'Hull / Airframe', indigenous: true, supplier: 'TASL / Bharat Forge Partner', status: 'Framework Approved' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-10', title: 'Formal FMS Contract Signed between India & US for 31 Drones (₹32,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2026', title: 'First Batch Delivery to Indian Navy INS Rajali Base', status: 'upcoming' }
    ]
  },
  {
    id: 'alfa-s-swarms',
    name: 'ALFA-S & Autonomous Swarm Drone Systems',
    shortName: 'ALFA-S Swarm Drones',
    domain: 'unmanned',
    stage: 'trials',
    leadAgency: 'DRDO / NewSpace Research & Tech / HAL / IAF',
    serviceBranch: ['Indian Air Force', 'Indian Army'],
    sanctionedBudgetCrores: 1200,
    indigenousPercentage: 80,
    targetInductionYear: '2025-2027',
    plannedUnits: 1000,
    summary: 'Air-Launched Flexible Asset (ALFA-S) swarm drones deployed in swarms of 50+ from mother aircraft or ground canisters with AI mesh networking.',
    searchAliases: ['alfa-s', 'swarm drone', 'drone swarm', 'newspace swarm', 'mehar baba'],
    keySubsystems: [
      { name: 'Autonomous Distributed Mesh AI Brain', type: 'Guidance / Navigation', indigenous: true, supplier: 'NewSpace Research / ADE', status: 'Field Proven' },
      { name: 'Mother Pod Dispenser for Su-30MKI / C-130J', type: 'Hull / Airframe', indigenous: true, supplier: 'HAL / DRDO', status: 'Captive Trials' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-01', title: '75-Drone Swarm Live Demonstration at Army Day Parade', status: 'completed' },
      { id: 'm2', date: '2024-03', title: 'Air-Launched Pod Separation Trials over Pokhran Range', status: 'completed' }
    ]
  },
  {
    id: 'd4-anti-drone',
    name: 'D-4 Anti-Drone System (Drone Detect, Deter & Destroy)',
    shortName: 'D-4 Anti-Drone System',
    domain: 'unmanned',
    stage: 'production',
    leadAgency: 'DRDO (DLRL / LASTEC) / BEL / Zen Tech',
    serviceBranch: ['Indian Army', 'Indian Navy', 'Indian Air Force'],
    sanctionedBudgetCrores: 2500,
    indigenousPercentage: 85,
    targetInductionYear: '2024-2027',
    plannedUnits: 200,
    summary: 'Comprehensive counter-UAS system featuring 360° radar detection, RF jamming, GNSS spoofing (soft-kill), and 10kW laser weapon (hard-kill).',
    searchAliases: ['d-4 anti-drone', 'd4 anti drone', 'anti drone system', 'counter uas', 'drdo laser'],
    keySubsystems: [
      { name: '10kW Laser Directed Energy Weapon (DEW)', type: 'Armament / Payload', indigenous: true, supplier: 'LASTEC / DRDO', status: 'Operational' },
      { name: 'Multi-Band RF Detector & Smart Jammer', type: 'Avionics / EW', indigenous: true, supplier: 'DLRL / BEL / Zen Tech', status: 'Serial Production' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-08', title: 'First Units Deployed for VVIP Border Protection & PM Security', status: 'completed' },
      { id: 'm2', date: '2024-06', title: 'Large Induction Orders Placed for Air Bases and Naval Ports', status: 'completed' }
    ]
  },
  {
    id: 'defspace-satellites',
    name: 'DefSpace & SSA (Dedicated Military Satellite Constellation)',
    shortName: 'DefSpace Satellites',
    domain: 'unmanned',
    stage: 'development',
    leadAgency: 'Defence Space Agency (DSA) / ISRO / DRDO / Startups',
    serviceBranch: ['Tri-Services'],
    sanctionedBudgetCrores: 25000,
    indigenousPercentage: 80,
    targetInductionYear: '2025-2030',
    plannedUnits: 52,
    summary: 'Constellation of 52 dedicated military satellites (optical, SAR, ELINT) providing 24/7 high-cadence revisit over Indian Ocean and disputed borders.',
    searchAliases: ['defspace', 'mission defspace', 'defence space agency', 'military satellite', 'gsat-7c', 'gsat-7r'],
    keySubsystems: [
      { name: 'Sub-Metre Synthetic Aperture Radar (SAR) Space Payload', type: 'Radar / Sensor', indigenous: true, supplier: 'SAC / ISRO / GalaxEye', status: 'Integration' },
      { name: 'Quantum Key Distribution (QKD) Satellite Terminal', type: 'SATCOM / Network', indigenous: true, supplier: 'DRDO / QNu Labs', status: 'Space Testing' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-10', title: 'Mission DefSpace Launched with 75 Space Defence Challenges', status: 'completed' },
      { id: 'm2', date: '2024-04', title: 'First Private Military Spy Satellite Launched (TSAT-1A)', status: 'completed' }
    ]
  }
];
