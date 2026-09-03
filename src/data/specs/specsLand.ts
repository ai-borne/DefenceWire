/**
 * 8 Strategic Land Combat & Artillery Technical Specifications
 * Jane's-grade specifications for tanks, IFVs, wheeled armour, and howitzers.
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';

export const LAND_SPECS: ProgramTechnicalSpecs[] = [
  {
    programId: 'zorawar-light-tank',
    dimensions: {
      length: '7.8 m',
      beam: '3.1 m',
      height: '2.4 m',
      emptyWeightKg: 23000,
      mtowKg: 25000
    },
    performance: {
      maxSpeed: '70 km/h (road) / 10 km/h (amphibious)',
      combatRadiusKm: 450,
      serviceCeilingMeters: 5500,
      enduranceHours: 12
    },
    propulsion: {
      engineModel: 'Cummins VTA903E-series Diesel Engine',
      engineType: 'Turbocharged 4-stroke V8 high-altitude diesel',
      powerOutput: '750 hp (560 kW)'
    },
    avionics: {
      radarSuite: 'Millimeter-Wave Battlefield Surveillance Radar & Integrated Drone Pod',
      ewSuite: 'Laser Warning Receiver & Multispectral Smoke Screen System',
      datalink: 'Battlefield Management System (BMS) with SDR'
    },
    armament: {
      hardpointsCount: 3,
      payloadCapacityKg: 2500,
      compatibleWeapons: ['105mm Cockerill High-Pressure Gun', 'Nag / Spike ATGM Pod', 'Swarm Loitering Munitions'],
      gunSystem: '105 mm rifled gun + 7.62 mm coaxial machine gun'
    }
  },
  {
    programId: 'arjun-mk1a',
    dimensions: {
      length: '10.64 m',
      beam: '3.86 m',
      height: '2.32 m',
      emptyWeightKg: 65000,
      mtowKg: 68500
    },
    performance: {
      maxSpeed: '58 km/h (road) / 40 km/h (cross-country)',
      combatRadiusKm: 450,
      serviceCeilingMeters: 3000
    },
    propulsion: {
      engineModel: 'MTU MB 838 Ka-501 liquid-cooled diesel engine',
      engineType: '10-cylinder multi-fuel diesel with epicyclic transmission',
      powerOutput: '1,400 hp (1,044 kW)'
    },
    avionics: {
      radarSuite: 'Commander Panoramic Sight Mk-II (CPS) with day/night thermal imaging',
      ewSuite: 'Advanced Laser Warning & Countermeasure System (ALWCS)',
      datalink: 'BEL Battle Management System & GPS/NavIC receiver'
    },
    armament: {
      hardpointsCount: 2,
      payloadCapacityKg: 5000,
      compatibleWeapons: ['FSAPDS (Fin-Stabilized Armor-Piercing)', 'PCB (Penetration-cum-Blast)', 'TBX (Thermobaric)', 'SAMHO ATGM'],
      gunSystem: '120 mm rifled gun + 12.7 mm remote anti-aircraft gun + 7.62 mm coaxial'
    }
  },
  {
    programId: 'frcv',
    dimensions: {
      length: '10.2 m',
      beam: '3.6 m',
      height: '2.2 m',
      emptyWeightKg: 50000,
      mtowKg: 55000
    },
    performance: {
      maxSpeed: '70 km/h (road) / 45 km/h (cross-country)',
      combatRadiusKm: 500,
      serviceCeilingMeters: 4500
    },
    propulsion: {
      engineModel: 'CVRDE / BEML 1500 HP Indigenous Powerpack',
      engineType: 'Compact electronically-governed multi-fuel diesel',
      powerOutput: '1,500 hp (1,119 kW)'
    },
    avionics: {
      radarSuite: '360-degree situational awareness radar with AI threat recognition',
      ewSuite: 'Hard-kill Active Protection System (APS) against ATGMs and APFSDS rounds',
      datalink: 'Army Tactical Combat Cloud with unmanned ground vehicle (UGV) interface'
    },
    armament: {
      hardpointsCount: 4,
      payloadCapacityKg: 6000,
      compatibleWeapons: ['120mm / 130mm smoothbore gun with programmable ammunition', 'Top-attack ATGM pod', 'Tethered surveillance drone'],
      gunSystem: '120mm / 130mm main gun + 12.7mm RCWS turret'
    }
  },
  {
    programId: 'ficv',
    dimensions: {
      length: '7.4 m',
      beam: '3.2 m',
      height: '2.5 m',
      emptyWeightKg: 20000,
      mtowKg: 24000
    },
    performance: {
      maxSpeed: '70 km/h (road) / 8 km/h (amphibious water)',
      combatRadiusKm: 500,
      serviceCeilingMeters: 4000
    },
    propulsion: {
      engineModel: 'High-Output Turbocharged Diesel with automatic transmission',
      engineType: 'Water-cooled diesel with twin hydrojets',
      powerOutput: '650-700 hp'
    },
    avionics: {
      radarSuite: 'Electro-Optical Fire Control System (EOFCS) with thermal vision',
      ewSuite: 'Laser warning receiver & grenade smoke dischargers',
      datalink: 'Integrated BMS with Blue-Force Tracking'
    },
    armament: {
      hardpointsCount: 3,
      payloadCapacityKg: 3500,
      compatibleWeapons: ['30mm automatic cannon', '5th Gen Fire-and-Forget Anti-Tank Guided Missiles', 'Loitering munitions'],
      gunSystem: '30 mm 2A42 auto-cannon + 7.62 mm PKT machine gun'
    }
  },
  {
    programId: 'whap-kestrel',
    dimensions: {
      length: '7.8 m',
      beam: '3.0 m',
      height: '2.8 m',
      emptyWeightKg: 22000,
      mtowKg: 26000
    },
    performance: {
      maxSpeed: '100 km/h (highway) / 10 km/h (amphibious)',
      combatRadiusKm: 500,
      serviceCeilingMeters: 4500
    },
    propulsion: {
      engineModel: 'Cummins ISX 600 hp diesel engine',
      engineType: 'In-line 6-cylinder turbocharged diesel',
      powerOutput: '600 hp (447 kW)'
    },
    avionics: {
      radarSuite: 'Integrated panoramic driver & gunner thermal vision with day/night cameras',
      ewSuite: 'STANAG 4569 Level 4 blast-resistant V-shaped hull with NBC protection',
      datalink: 'Tactical VHF/UHF radio and digital navigation'
    },
    armament: {
      hardpointsCount: 2,
      payloadCapacityKg: 3000,
      compatibleWeapons: ['30mm RCWS Turret (BMP-2 compatible)', 'Nag / Javelin ATGM launcher', '40mm Automatic Grenade Launcher'],
      gunSystem: '30 mm auto-cannon + 7.62 mm coaxial machine gun'
    }
  },
  {
    programId: 'atags',
    dimensions: {
      length: '12.0 m (towed) / 19.0 m (firing)',
      beam: '2.8 m',
      height: '3.2 m',
      emptyWeightKg: 18000,
      mtowKg: 18000
    },
    performance: {
      maxSpeed: 'Towed 80 km/h / Self-propelled 18 km/h',
      combatRadiusKm: 500,
      serviceCeilingMeters: 5000
    },
    propulsion: {
      engineModel: 'Shoot-and-scoot Auxiliary Power Unit (APU)',
      engineType: 'Turbocharged diesel APU for self-mobility and steering',
      powerOutput: '110 hp'
    },
    avionics: {
      radarSuite: 'Muzzle Velocity Radar (MVR) & Inertial Navigation System',
      ewSuite: 'All-electric drive sighting & remote digital gun control',
      datalink: 'Artillery Combat Command and Control System (ACCCS)'
    },
    armament: {
      hardpointsCount: 1,
      payloadCapacityKg: 50,
      compatibleWeapons: ['155mm ERFB-BB Ammunition (48 km)', '155mm High Explosive (38 km)', 'Terminally Guided Munitions'],
      gunSystem: '155 mm / 52 calibre ordnance with 25-litre chamber volume'
    }
  },
  {
    programId: 'mgs-155',
    dimensions: {
      length: '11.5 m',
      beam: '2.8 m',
      height: '3.6 m',
      emptyWeightKg: 28000,
      mtowKg: 30000
    },
    performance: {
      maxSpeed: '85 km/h (road) / 35 km/h (cross country)',
      combatRadiusKm: 600,
      serviceCeilingMeters: 4500
    },
    propulsion: {
      engineModel: 'BEML-Tatra 8x8 Heavy Mobility Diesel Engine',
      engineType: 'Turbocharged multi-fuel V8',
      powerOutput: '400-500 hp'
    },
    avionics: {
      radarSuite: 'On-board Muzzle Velocity Radar and GPS/NavIC targeting suite',
      ewSuite: 'Automatic gun laying system with electro-hydraulic elevation/traverse',
      datalink: 'ACCCS real-time fire coordination link'
    },
    armament: {
      hardpointsCount: 1,
      payloadCapacityKg: 1500,
      compatibleWeapons: ['155mm standard NATO & ERFB ammunition', 'Precision strike artillery shells'],
      gunSystem: '155 mm / 52 calibre howitzer with 24-round ready-use onboard magazine'
    }
  },
  {
    programId: 'k9-vajra-t',
    dimensions: {
      length: '12.0 m',
      beam: '3.4 m',
      height: '2.73 m',
      emptyWeightKg: 47000,
      mtowKg: 47000
    },
    performance: {
      maxSpeed: '67 km/h (road)',
      combatRadiusKm: 480,
      serviceCeilingMeters: 4800
    },
    propulsion: {
      engineModel: 'MTU MT 881 Ka-500 V8 water-cooled diesel',
      engineType: '8-cylinder diesel with Allison X1100-5A3 transmission',
      powerOutput: '1,000 hp (735 kW)'
    },
    avionics: {
      radarSuite: 'Automatic Fire Control System with POS-4 Inertial Navigation',
      ewSuite: 'All-welded steel armor protecting against 14.5mm armor-piercing rounds and 152mm shell fragments',
      datalink: 'ACCCS integrated digital tactical link'
    },
    armament: {
      hardpointsCount: 1,
      payloadCapacityKg: 2000,
      compatibleWeapons: ['155mm K307 base-bleed shells (40 km)', 'K315 rocket-assisted projectiles (54 km)'],
      gunSystem: '155 mm / 52 calibre tracked howitzer (48 rounds on-board) + 12.7 mm HMG'
    }
  }
];
