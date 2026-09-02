/**
 * 8 Strategic Land Combat & Armoured / Artillery Programs
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';

export const LAND_PROGRAMS: StrategicProgram[] = [
  {
    id: 'zorawar-light-tank',
    name: 'Zorawar 25-Tonne Light Tank (High Altitude Combat)',
    shortName: 'Zorawar Light Tank',
    domain: 'land',
    stage: 'trials',
    leadAgency: 'DRDO (CVRDE) / L&T',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 16000,
    indigenousPercentage: 70,
    targetInductionYear: '2025-2027',
    plannedUnits: 354,
    summary: '25-tonne light tank designed in record time for high-altitude deployment in Ladakh and Sikkim with amphibious capability and loitering munitions.',
    searchAliases: ['zorawar', 'zorawar light tank', 'light tank', 'cvrde zorawar'],
    specifications: { 'Weight': '25 Tonnes', 'Main Gun': '105mm High Pressure', 'Features': 'Amphibious + Loitering Munitions' },
    keySubsystems: [
      { name: '105mm Cockerill High-Pressure Turret', type: 'Armament / Payload', indigenous: false, supplier: 'John Cockerill / Bharat Forge', status: 'Integrated' },
      { name: 'Cummins 750hp VTA903E Engine', type: 'Propulsion / Engine', indigenous: false, supplier: 'Cummins Inc.', status: 'Testing' },
      { name: 'Active Protection System & Drone Pod', type: 'Avionics / EW', indigenous: true, supplier: 'DRDO / Zen Tech', status: 'User Trials' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-07', title: 'First Prototype Unveiled at L&T Hazira Facility', status: 'completed' },
      { id: 'm2', date: '2024-09', title: 'High Altitude Desert & Mountain Track Trials Commenced', status: 'completed' }
    ]
  },
  {
    id: 'arjun-mk1a',
    name: 'Arjun Mk-1A Main Battle Tank (Hunter-Killer)',
    shortName: 'Arjun Mk-1A',
    domain: 'land',
    stage: 'production',
    leadAgency: 'DRDO (CVRDE) / AVNL (HVF Avadi)',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 7523,
    indigenousPercentage: 68,
    targetInductionYear: '2024-2028',
    plannedUnits: 118,
    summary: '68-tonne main battle tank featuring 89 major upgrades including commander panoramic sight with thermal imaging, ALWCS, and containerized ammunition.',
    searchAliases: ['arjun mk1a', 'arjun mk-1a', 'arjun mark 1a', 'arjun tank'],
    keySubsystems: [
      { name: '120mm Rifled Tank Gun with FSAPDS / PCB / TBX', type: 'Armament / Payload', indigenous: true, supplier: 'ARDE / OFB', status: 'Operational' },
      { name: 'Advanced Laser Warning & Countermeasure System (ALWCS)', type: 'Avionics / EW', indigenous: true, supplier: 'BEL / DRDO', status: 'Production' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2021-09', title: 'MoD Order Placed with HVF Avadi for 118 Tanks (₹7,523 Cr)', status: 'completed' },
      { id: 'm2', date: '2024', title: 'Indigenized Transmission & Sight Integration Batch Delivery', status: 'in_progress' }
    ]
  },
  {
    id: 'frcv',
    name: 'FRCV (Future Ready Combat Vehicle - 55-Tonne MBT)',
    shortName: 'FRCV Next-Gen MBT',
    domain: 'land',
    stage: 'sanctioned',
    leadAgency: 'Indian Army / DRDO / Private Consortia',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 57000,
    indigenousPercentage: 75,
    targetInductionYear: '2030-2036',
    plannedUnits: 1770,
    summary: 'Next-generation 55-tonne main battle tank program to replace aging T-72 fleet with AI-enabled fire control, hard-kill APS, and drone integration.',
    searchAliases: ['frcv', 'future ready combat vehicle', 'next gen mbt', 't-72 replacement'],
    keySubsystems: [
      { name: '1500 HP Indigenous Powerpack', type: 'Propulsion / Engine', indigenous: true, supplier: 'CVRDE / BEML', status: 'Prototyping' },
      { name: 'Hard-Kill Active Protection System (APS)', type: 'Avionics / EW', indigenous: true, supplier: 'DRDO / BEL', status: 'R&D' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-09', title: 'DAC Clearance for AoN for 1,770 FRCV Tanks (₹57,000 Cr)', status: 'completed' },
      { id: 'm2', date: '2025', title: 'RFP Issuance to Strategic Defence Partners', status: 'upcoming' }
    ]
  },
  {
    id: 'ficv',
    name: 'FICV (Futuristic Infantry Combat Vehicle)',
    shortName: 'FICV Combat Vehicle',
    domain: 'land',
    stage: 'sanctioned',
    leadAgency: 'Indian Army / AVNL / Private Industry',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 50000,
    indigenousPercentage: 70,
    targetInductionYear: '2028-2034',
    plannedUnits: 1750,
    summary: 'Tracked amphibious mechanized combat platform with 30mm auto-cannon and 5th-gen fire-and-forget ATGMs to replace BMP-2 Sarath vehicles.',
    searchAliases: ['ficv', 'futuristic infantry combat vehicle', 'bmp-2 replacement'],
    keySubsystems: [
      { name: '30mm Auto-Cannon & Fire-and-Forget ATGM Pod', type: 'Armament / Payload', indigenous: true, supplier: 'ARDE / BDL', status: 'Design' },
      { name: 'Amphibious Hydro-Jet Thrusters', type: 'Propulsion / Engine', indigenous: true, supplier: 'AVNL / Tata / L&T', status: 'Validation' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-02', title: 'AoN Accorded by DAC for 1,750 FICVs (Tracked & Wheeled)', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Prototype Development Contracts Awarded', status: 'in_progress' }
    ]
  },
  {
    id: 'whap-kestrel',
    name: 'WhAP / Kestrel (8x8 Wheeled Armoured Platform)',
    shortName: 'WhAP 8x8 Kestrel',
    domain: 'land',
    stage: 'production',
    leadAgency: 'DRDO (VRDE) / TASL / Mahindra',
    serviceBranch: ['Indian Army', 'Paramilitary'],
    sanctionedBudgetCrores: 3500,
    indigenousPercentage: 75,
    targetInductionYear: '2024-2028',
    plannedUnits: 400,
    summary: '8x8 modular wheeled amphibious combat vehicle with blast protection against IEDs, operational in high-altitude Ladakh and UN missions.',
    searchAliases: ['whap', 'kestrel', 'wheeled armoured platform', 'tata kestrel'],
    keySubsystems: [
      { name: 'Blast-Resistant V-Shaped Hull (STANAG 4569)', type: 'Hull / Airframe', indigenous: true, supplier: 'VRDE / Tata Motors', status: 'Production' },
      { name: '30mm Remote Controlled Weapon Station (RCWS)', type: 'Armament / Payload', indigenous: true, supplier: 'BEL / TASL', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2022-04', title: 'First Batch Inducted by Indian Army in Eastern Ladakh', status: 'completed' },
      { id: 'm2', date: '2024-05', title: 'Export Order Secured for Moroccan Armed Forces', status: 'completed' }
    ]
  },
  {
    id: 'atags',
    name: 'ATAGS (Advanced Towed Artillery Gun System - 155mm/52 Cal)',
    shortName: 'ATAGS 155mm',
    domain: 'land',
    stage: 'production',
    leadAgency: 'DRDO (ARDE) / Bharat Forge / TASL',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 6500,
    indigenousPercentage: 85,
    targetInductionYear: '2025-2028',
    plannedUnits: 307,
    summary: 'World-leading 155mm/52-calibre towed howitzer with 25-litre chamber volume achieving unmatched 48 km range and rapid 3-round burst.',
    searchAliases: ['atags', 'advanced towed artillery', 'atags howitzer', 'kalyani atags'],
    specifications: { 'Calibre': '155mm / 52 Cal', 'Max Range': '48 km (ERFB-BB)', 'Chamber': '25 Litre (World First)' },
    keySubsystems: [
      { name: 'All-Electric Drive and Auto-Loader', type: 'Armament / Payload', indigenous: true, supplier: 'ARDE / Bharat Forge', status: 'Production' },
      { name: 'Shoot-and-Scoot Auxiliary Power Unit', type: 'Propulsion / Engine', indigenous: true, supplier: 'Tata / Bharat Forge', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2024-03', title: 'Commercial Negotiations Concluded for 307 Guns (₹6,500 Cr)', status: 'completed' },
      { id: 'm2', date: '2024-11', title: 'Final Contract Award to Bharat Forge & TASL (60:40 workshare)', status: 'completed' }
    ]
  },
  {
    id: 'mgs-155',
    name: 'Mounted Gun System (MGS 155mm/52 Cal 8x8 Howitzer)',
    shortName: 'MGS 155mm Truck Gun',
    domain: 'land',
    stage: 'trials',
    leadAgency: 'DRDO / Bharat Forge / TASL / BEML',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 8500,
    indigenousPercentage: 75,
    targetInductionYear: '2026-2029',
    plannedUnits: 300,
    summary: 'Truck-mounted 155mm/52-calibre artillery system on high-mobility 8x8 chassis providing rapid shoot-and-scoot for desert and mountain borders.',
    searchAliases: ['mgs 155', 'mounted gun system', 'truck gun 155mm', 'kalyani tc-20'],
    keySubsystems: [
      { name: 'High Mobility 8x8 Heavy Truck Chassis', type: 'Hull / Airframe', indigenous: true, supplier: 'BEML / Tatra', status: 'Field Tested' },
      { name: 'Automated Gun Laying & Inertial Navigation System', type: 'Avionics / EW', indigenous: true, supplier: 'ARDE / BEL', status: 'Trials' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2023-08', title: 'High-Altitude & Summer Firing Trials in Pokhran & Sikkim', status: 'completed' },
      { id: 'm2', date: '2025', title: 'Price Negotiation Committee (PNC) Stage', status: 'in_progress' }
    ]
  },
  {
    id: 'k9-vajra-t',
    name: 'K9 Vajra-T (155mm/52 Cal Tracked Howitzer Batch 2)',
    shortName: 'K9 Vajra-T (Batch 2)',
    domain: 'land',
    stage: 'production',
    leadAgency: 'L&T Defence / Hanwha Aerospace',
    serviceBranch: ['Indian Army'],
    sanctionedBudgetCrores: 7000,
    indigenousPercentage: 65,
    targetInductionYear: '2025-2028',
    plannedUnits: 100,
    summary: 'Tracked self-propelled 155mm howitzer equipped with indigenous winterization kits and high-altitude kits for deployment across Ladakh.',
    searchAliases: ['k9 vajra', 'k9 vajra-t', 'k9 tracked howitzer', 'l&t k9 vajra'],
    keySubsystems: [
      { name: 'High-Altitude Winterization Kit (-20°C)', type: 'Propulsion / Engine', indigenous: true, supplier: 'L&T Hazira', status: 'Production' },
      { name: 'Digital Fire Control System & Automatic Sighting', type: 'Avionics / EW', indigenous: true, supplier: 'BEL / L&T', status: 'Operational' }
    ],
    keyMilestones: [
      { id: 'm1', date: '2021-02', title: '100th K9 Vajra Delivered Ahead of Schedule from Hazira', status: 'completed' },
      { id: 'm2', date: '2024-02', title: 'AoN Clearance for 100 Additional High-Altitude Vajras (₹7,000 Cr)', status: 'completed' }
    ]
  }
];
