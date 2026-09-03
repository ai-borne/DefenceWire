/**
 * Folded-in iDEX & ADITI Challenge Statements Mapped to Strategic Programs
 * Parsed directly from official DISC 11–14 & ADITI 1–2 publications.
 * Hard limit: <= 300 LOC.
 */

import { IdexChallenge } from '../types/programs.js';

export const ALL_IDEX_CHALLENGES: ReadonlyArray<IdexChallenge> = Object.freeze([
  {
    id: 'disc14-army-ps01',
    edition: 'DISC 14',
    psNumber: 'DISC-14/ARMY/01',
    title: 'Indigenous Microbolometer Focal Plane Arrays for High-Altitude Armour',
    nodalAgency: 'Indian Army (DG Infantry / CVRDE)',
    grantAmount: '₹1.50 Crore',
    problemDescription: 'Development of 640x512 uncooled thermal imaging microbolometer arrays (12-micron pitch) operating in LWIR band for driver and commander night vision in high-altitude sub-zero terrain.',
    targetCapability: 'Indigenous high-altitude thermal optic sight for light tanks and ICVs',
    mappedProgramId: 'zorawar-light-tank',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'disc14-navy-ps04',
    edition: 'DISC 14',
    psNumber: 'DISC-14/NAVY/04',
    title: 'Proton Exchange Membrane (PEM) Fuel Cell Stacks for AIP Submarines',
    nodalAgency: 'Indian Navy (Directorate of Submarine Acquisition)',
    grantAmount: '₹2.50 Crore',
    problemDescription: 'Design and fabrication of high-power density PEM fuel cell stacks operating on pure hydrogen/oxygen closed loop for silent underwater propulsion and two-week submerged endurance.',
    targetCapability: 'Air-Independent Propulsion (AIP) system indigenisation',
    mappedProgramId: 'project-75i',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'disc14-iaf-ps02',
    edition: 'DISC 14',
    psNumber: 'DISC-14/IAF/02',
    title: 'Gallium Nitride (GaN) T/R Modules for 5th Generation Fighter AESA Radars',
    nodalAgency: 'Indian Air Force (Dte of Offensive Ops / LRDE)',
    grantAmount: '₹2.00 Crore',
    problemDescription: 'Monolithic Microwave Integrated Circuit (MMIC) based GaN transmit/receive modules delivering >25W output with >45% power-added efficiency in X-band for stealth conformal apertures.',
    targetCapability: 'Miniaturized high-power AESA radar modules for stealth fighter',
    mappedProgramId: 'amca',
    status: 'evaluating',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'disc14-iaf-ps09',
    edition: 'DISC 14',
    psNumber: 'DISC-14/IAF/09',
    title: 'Autonomous Distributed AI Brain for Heterogeneous Drone Swarms',
    nodalAgency: 'Indian Air Force (Air HQ)',
    grantAmount: '₹2.50 Crore',
    problemDescription: 'Decentralized AI swarm algorithms enabling autonomous peer-to-peer collision avoidance, target allocation, electronic jamming, and dynamic reassignment without reliance on satellite navigation.',
    targetCapability: 'Air-launched autonomous swarm tactical teaming',
    mappedProgramId: 'alfa-s-swarms',
    status: 'awarded',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'aditi2-deeptech-ps01',
    edition: 'ADITI 2.0',
    psNumber: 'ADITI-02/DSA/01',
    title: 'Quantum Key Distribution (QKD) Satellite Transceiver Payload',
    nodalAgency: 'Defence Space Agency (DSA) / Tri-Services',
    grantAmount: '₹25.00 Crore',
    problemDescription: 'Development of space-to-ground optical Quantum Key Distribution terminal operating at 1550nm to secure tactical command networks against quantum computing decryption threats.',
    targetCapability: 'Unconditionally secure spaceborne military communications',
    mappedProgramId: 'defspace-satellites',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/aditi-2'
  },
  {
    id: 'disc14-army-ps08',
    edition: 'DISC 14',
    psNumber: 'DISC-14/ARMY/08',
    title: 'High-Power Microwave (HPM) Counter-UAS Directed Energy Emitter',
    nodalAgency: 'Indian Army (ADG Army Air Defence)',
    grantAmount: '₹1.50 Crore',
    problemDescription: 'Compact pulsed high-power microwave system capable of emitting gigawatt-level bursts to fry the onboard electronics and flight controllers of incoming micro and mini drone swarms simultaneously.',
    targetCapability: 'Area-defense soft-kill neutralization against drone swarms',
    mappedProgramId: 'd4-anti-drone',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'disc13-iaf-ps05',
    edition: 'DISC 13',
    psNumber: 'DISC-13/IAF/05',
    title: 'Wideband Digital Radio Frequency Memory (DRFM) Electronic Jammer Pod',
    nodalAgency: 'Indian Air Force / DARE',
    grantAmount: '₹2.00 Crore',
    problemDescription: 'Ultra-wideband digital RF memory jammer architecture for instantaneous multi-emitter deception jamming against modern phased array airborne interceptors and SAM batteries.',
    targetCapability: 'Advanced airborne electronic self-protection suite',
    mappedProgramId: 'tejas-mk1a',
    status: 'prototype_fielded',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-13'
  },
  {
    id: 'aditi1-mod-ps03',
    edition: 'ADITI 1.0',
    psNumber: 'ADITI-01/DRDO/03',
    title: 'High-Altitude Heavy Autonomous Logistics UAS for Extreme Cold Terrain',
    nodalAgency: 'DRDO (ADE) / Indian Army',
    grantAmount: '₹25.00 Crore',
    problemDescription: 'Unmanned vertical take-off and landing or short-runway aerial platform with 150 kg payload capacity capable of operating up to 5,500 meters altitude in Siachen and eastern Ladakh.',
    targetCapability: 'High-altitude armed and logistics unmanned aircraft',
    mappedProgramId: 'tapas-archer-uav',
    status: 'awarded',
    officialPdfUrl: 'https://idex.gov.in/challenges/aditi-1'
  },
  {
    id: 'disc12-navy-ps06',
    edition: 'DISC 12',
    psNumber: 'DISC-12/NAVY/06',
    title: 'Integrated Electric Propulsion (IEP) High-Torque Marine Motors',
    nodalAgency: 'Indian Navy (Warship Design Bureau)',
    grantAmount: '₹2.00 Crore',
    problemDescription: 'High-power density permanent magnet synchronous electric propulsion motors and variable frequency drives for next-generation 10,000-tonne destroyers with reduced underwater acoustics.',
    targetCapability: 'Warship electric propulsion and low-acoustic signature drive',
    mappedProgramId: 'project-18',
    status: 'evaluating',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-12'
  },
  {
    id: 'disc14-army-ps12',
    edition: 'DISC 14',
    psNumber: 'DISC-14/ARMY/12',
    title: 'Millimeter-Wave Hard-Kill Active Protection System for Main Battle Tanks',
    nodalAgency: 'Indian Army (DG Mechanised Forces / CVRDE)',
    grantAmount: '₹2.00 Crore',
    problemDescription: 'Automated 360-degree radar sensor array detecting incoming hypersonic kinetic rounds, top-attack ATGMs, and FPV loitering munitions with high-speed explosive counter-fragmentation launch.',
    targetCapability: 'Hard-kill survivability for future combat vehicles',
    mappedProgramId: 'frcv',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  },
  {
    id: 'disc11-tri-ps02',
    edition: 'DISC 11',
    psNumber: 'DISC-11/TRI/02',
    title: 'High-Altitude Solid Fuel Ducted Ramjet (SFDR) Combustion Chambers',
    nodalAgency: 'DRDO (DRDL Hyderabad)',
    grantAmount: '₹1.50 Crore',
    problemDescription: 'Development of boron-loaded propellant grain and high-altitude air-inlet combustion stability systems for BVR missiles operating at speeds above Mach 3.5 at 25,000 meters.',
    targetCapability: 'Long-range air-to-air missile propulsion indigenisation',
    mappedProgramId: 'astra-bvr',
    status: 'completed',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-11'
  },
  {
    id: 'aditi2-navy-ps04',
    edition: 'ADITI 2.0',
    psNumber: 'ADITI-02/NAVY/04',
    title: 'Submarine-Grade Lithium Iron Phosphate (LFP) Battery Modules',
    nodalAgency: 'Indian Navy (Submarine Design Group)',
    grantAmount: '₹20.00 Crore',
    problemDescription: 'Thermal runaway suppression and high-rate discharge submarine-grade battery modules to double underwater sprint endurance and replace lead-acid batteries on conventional submarines.',
    targetCapability: 'High-capacity energy storage for indigenous SSKs',
    mappedProgramId: 'project-76',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/aditi-2'
  },
  {
    id: 'disc13-navy-ps08',
    edition: 'DISC 13',
    psNumber: 'DISC-13/NAVY/08',
    title: 'Advanced Heavy Arresting Gear Hook & Energy Absorber for Carrier Aircraft',
    nodalAgency: 'Indian Navy / ADA',
    grantAmount: '₹2.00 Crore',
    problemDescription: 'High-tensile forged titanium arresting hook and hydraulic dampener system capable of safely decelerating 26-tonne deck-based fighters under high sink rate STOBAR landings.',
    targetCapability: 'Twin-engine deck fighter landing system',
    mappedProgramId: 'tedbf',
    status: 'evaluating',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-13'
  },
  {
    id: 'disc14-drdo-ps10',
    edition: 'DISC 14',
    psNumber: 'DISC-14/DRDO/10',
    title: 'Serpentine Intake Radar Absorbent Material (RAM) Liners for Stealth UCAVs',
    nodalAgency: 'DRDO (ADE / GTRE)',
    grantAmount: '₹1.50 Crore',
    problemDescription: 'Ultra-thin, lightweight radar absorbent coatings for S-duct engine intakes to conceal engine turbine face from enemy radar reflection in high-temperature subsonic airflow.',
    targetCapability: 'Stealth airframe signature reduction for flying-wing UCAV',
    mappedProgramId: 'ghatak-ucav',
    status: 'open',
    officialPdfUrl: 'https://idex.gov.in/challenges/disc-14'
  }
]);
