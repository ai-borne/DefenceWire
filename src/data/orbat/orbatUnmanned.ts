/**
 * ORBAT Deployment Data for 5 Strategic Unmanned & Space Programs
 * Authoritative units backed by Parliamentary Reports & Official Communiques.
 * Hard limit: <= 300 LOC. Target: < 200 LOC.
 */

import { OrbatUnit } from '../../types/orbat.js';

export const UNMANNED_ORBAT_UNITS: OrbatUnit[] = [
  // 1. Tapas / Archer UAV
  {
    id: 'orbat-tapas-surveillance-flight',
    programId: 'tapas-archer-uav',
    unitDesignation: 'Tri-Services MALE UAV Evaluation Flights',
    nickname: 'Tapas / Archer Recon Detachment',
    unitType: 'squadron',
    serviceBranch: 'Tri-Services',
    baseLocation: 'Aeronautical Test Range Chitradurga / Forward Air Bases',
    command: 'Tri-Services Joint Surveillance Command',
    status: 'evaluating',
    allocatedUnits: 'Prototype Evaluation Batch (Target 76 Systems for Armed Forces)',
    operationalRole: 'Medium-Altitude Long-Endurance (MALE) ISR & Border Reconnaissance',
    citation: { sourceTitle: 'MoD Annual Report 2023-24: Tactical & MALE UAV Program Review', sourceType: 'mod_annual_report', documentNumber: 'MoD-AR-2024-UAV', date: '2024-03-28', relevantExcerpt: 'Tapas demonstrated 200+ test flights with SATCOM datalink and multi-sensor payload.' }
  },

  // 2. MQ-9B SeaGuardian / SkyGuardian
  {
    id: 'orbat-mq9b-ins-rajali',
    programId: 'mq9b-guardian',
    unitDesignation: 'Long-Range Maritime Reconnaissance Squadron (Navy)',
    nickname: 'SeaGuardian Fleet (INS Rajali)',
    unitType: 'squadron',
    serviceBranch: 'Indian Navy',
    baseLocation: 'INS Rajali (Arakkonam, Tamil Nadu)',
    command: 'Eastern Naval Command / Naval Aviation',
    status: 'slated',
    allocatedUnits: '15 SeaGuardian Drones for Navy (out of 31 Total Tri-Services)',
    operationalRole: 'Persistent 35+ Hour Maritime Domain Awareness across Indian Ocean',
    citation: { sourceTitle: 'PIB: India Signs Formal Agreement with US for 31 MQ-9B High Altitude Drones', sourceType: 'pib_release', documentNumber: 'PIB ID 2065123', date: '2024-10-15', relevantExcerpt: 'Contract signed for procurement of 31 MQ-9B Remotely Piloted Aircraft Systems.' }
  },
  {
    id: 'orbat-mq9b-army-iaf',
    programId: 'mq9b-guardian',
    unitDesignation: 'High-Altitude Border Surveillance Flights (Army & IAF)',
    nickname: 'SkyGuardian Detachments',
    unitType: 'wing',
    serviceBranch: 'Tri-Services',
    baseLocation: 'Gorakhpur / Sarsawa / Forward Himalayan Bases',
    command: 'Northern & Eastern Air Commands',
    status: 'slated',
    allocatedUnits: '8 SkyGuardians for Army + 8 SkyGuardians for IAF',
    operationalRole: 'High-Altitude 40,000+ ft Standoff Reconnaissance & Precision Strike along LAC',
    citation: { sourceTitle: 'Standing Committee on Defence: Remotely Piloted Aircraft Systems Acquisition', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 42', date: '2023-03-21', relevantExcerpt: 'Tri-Services procurement of MQ-9B allocated 15 for Navy and 8 each for Army and Air Force.' }
  },

  // 3. ALFA-S Swarm Drones
  {
    id: 'orbat-alfa-s-swarm-units',
    programId: 'alfa-s-swarms',
    unitDesignation: 'Autonomous Air Combat Swarm Flights',
    nickname: 'ALFA-S Swarm Pod Detachment',
    unitType: 'special_unit',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'Forward Strike Airbases (Pokhran & Central Sectors)',
    command: 'IAF Centre of Excellence for Artificial Intelligence',
    status: 'evaluating',
    allocatedUnits: 'Air-Launched Swarm Pods for Jaguar & Su-30MKI Platforms',
    operationalRole: 'Mass Collaborative Autonomous Attack on Air Defence Nodes & High-Value Assets',
    citation: { sourceTitle: 'MoD Communique: IAF Swarm Drone Demonstration and Operational Testing', sourceType: 'mod_annual_report', documentNumber: 'MoD/2023/01/SWARM', date: '2023-01-15', relevantExcerpt: 'Autonomous swarm drone integration demonstrated air-launched swarm capabilities.' }
  },

  // 4. D4 Anti-Drone System
  {
    id: 'orbat-d4-counter-drone',
    programId: 'd4-anti-drone',
    unitDesignation: 'Air Force & Naval Base Protection Units',
    nickname: 'D4 Counter-UAS Batteries (DRDO / BEL)',
    unitType: 'battery',
    serviceBranch: 'Tri-Services',
    baseLocation: 'Frontline Airfields, Naval Harbors & Strategic Government Enclaves',
    command: 'Tri-Services Base Defence Directorate',
    status: 'operational',
    inductionDate: '2021-08',
    allocatedUnits: '100+ Static and Vehicle-Mounted Systems Deployed',
    operationalRole: 'Soft-Kill RF Jamming & Hard-Kill Laser Neutralization of Micro/Mini Drones',
    citation: { sourceTitle: 'PIB: Indigenous Counter-Drone Systems Deployed for Armed Forces Protection', sourceType: 'pib_release', documentNumber: 'PIB ID 1748231', date: '2021-08-25', relevantExcerpt: 'DRDO-developed anti-drone system inducted by Navy and Air Force for perimeter air defense.' }
  },

  // 5. Mission DefSpace Satellites
  {
    id: 'orbat-defspace-space-command',
    programId: 'defspace-satellites',
    unitDesignation: 'Defence Space Agency (DSA) Orbit Constellation',
    nickname: 'Mission DefSpace & Spy Satellites (TSAT-1A, GSAT-7 Series)',
    unitType: 'special_unit',
    serviceBranch: 'Tri-Services',
    baseLocation: 'DSA Headquarters, Bengaluru / Earth Stations across India',
    command: 'Defence Space Agency (DSA) / Integrated Defence Staff',
    status: 'operational',
    inductionDate: '2022-10',
    allocatedUnits: '75 Challenges Underway + Military LEO/GEO Constellations',
    operationalRole: 'Space-Based Reconnaissance, Secure High-Bandwidth Datalink & Geointelligence',
    citation: { sourceTitle: 'PIB: Prime Minister Launches Mission DefSpace with 75 Space Defence Challenges', sourceType: 'pib_release', documentNumber: 'PIB ID 1869201', date: '2022-10-19', relevantExcerpt: 'Mission DefSpace launched to establish sovereign dual-use space defense infrastructure.' }
  }
];
