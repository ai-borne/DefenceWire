/**
 * 5 Strategic Unmanned, EW, Swarm & Space Technical Specifications
 * Jane's-grade specifications for MALE UAVs, HALE drones, autonomous swarms, counter-UAS & military satellites.
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';

export const UNMANNED_SPECS: ProgramTechnicalSpecs[] = [
  {
    programId: 'tapas-archer-uav',
    dimensions: {
      length: '9.5 m',
      wingspan: '20.6 m',
      height: '3.1 m',
      emptyWeightKg: 1800,
      mtowKg: 2800
    },
    performance: {
      maxSpeed: '225 km/h',
      combatRadiusKm: 1000,
      ferryRangeKm: 2000,
      serviceCeilingMeters: 8534,
      enduranceHours: 24
    },
    propulsion: {
      engineModel: 'Twin Saturn 36MT Turboprop Engines / Indigenized 180hp engines',
      engineType: 'Twin turboprop with constant speed propellers',
      powerOutput: '2x 180 hp'
    },
    avionics: {
      radarSuite: 'Synthetic Aperture Radar (SAR) with Ground Moving Target Indication (GMTI) & EO/IR Pod',
      ewSuite: 'Radar Warning Receiver & integrated jammer',
      datalink: 'C-band Line-of-Sight (LOS) + Ku-band SATCOM datalink'
    },
    armament: {
      hardpointsCount: 4,
      payloadCapacityKg: 350,
      internalBays: false,
      compatibleWeapons: ['Helina / Dhruvastra ATGMs', 'Smart Anti-Airfield Weapon (SAAW)', 'Laser Guided Bombs']
    }
  },
  {
    programId: 'mq9b-guardian',
    dimensions: {
      length: '11.7 m',
      wingspan: '24.0 m',
      height: '3.8 m',
      emptyWeightKg: 2223,
      mtowKg: 5670
    },
    performance: {
      maxSpeed: '388 km/h',
      combatRadiusKm: 2200,
      ferryRangeKm: 9000,
      serviceCeilingMeters: 12200,
      enduranceHours: 40
    },
    propulsion: {
      engineModel: 'Honeywell TPE331-10GD Turboprop',
      engineType: 'Single turboprop engine',
      powerOutput: '900 hp (671 kW)'
    },
    avionics: {
      radarSuite: 'Raytheon SeaVue 360° Maritime Radar & L3Harris WESCAM MX-20 EO/IR Pod',
      ewSuite: 'Self-Protection Pod with chaff/flare dispensing and radar warning',
      datalink: 'Ultra-high bandwidth Ku/Ka-band SATCOM and Link-16 tactical datalink'
    },
    armament: {
      hardpointsCount: 9,
      payloadCapacityKg: 2155,
      internalBays: false,
      compatibleWeapons: ['AGM-114 Hellfire Missiles', 'GBU-12 Paveway II Laser-Guided Bombs', 'Sonobuoy Dispensing Pods (ASW)']
    }
  },
  {
    programId: 'alfa-s-swarms',
    dimensions: {
      length: '1.2 m',
      wingspan: '1.6 m (folding wings)',
      height: '0.3 m',
      emptyWeightKg: 15,
      mtowKg: 25
    },
    performance: {
      maxSpeed: '180 km/h',
      combatRadiusKm: 150,
      ferryRangeKm: 200,
      serviceCeilingMeters: 5000,
      enduranceHours: 2.0
    },
    propulsion: {
      engineModel: 'High-density brushless electric motor with Li-ion battery pack',
      engineType: 'Electric pusher-propeller drive',
      powerOutput: '2.5 kW'
    },
    avionics: {
      radarSuite: 'Optical flow and multi-spectral computer vision edge AI sensor',
      ewSuite: 'Frequency-hopping mesh network with anti-GNSS spoofing',
      datalink: 'Self-healing distributed AI mesh communication with peer-to-peer relay'
    },
    armament: {
      hardpointsCount: 0,
      payloadCapacityKg: 5,
      internalBays: 'Conformal warhead compartment',
      compatibleWeapons: ['5 kg shaped-charge anti-tank warhead', 'High-explosive pre-fragmented antipersonnel warhead']
    }
  },
  {
    programId: 'd4-anti-drone',
    dimensions: {
      length: 'Truck-mounted modular shelter (6.0m x 2.4m x 2.5m)',
      emptyWeightKg: 4500,
      mtowKg: 5000
    },
    performance: {
      maxSpeed: 'Stationary / Mobile 80 km/h truck transit',
      combatRadiusKm: 10,
      serviceCeilingMeters: 3000,
      enduranceHours: 24
    },
    propulsion: {
      engineModel: 'Auxiliary diesel generator / Direct electrical grid hookup',
      engineType: 'High-voltage power distribution unit for RF & Laser emitters',
      powerOutput: '40 kVA'
    },
    avionics: {
      radarSuite: 'X-Band 360° 3D Drone Detection Radar (up to 4 km against micro-UAVs)',
      ewSuite: 'Multi-band RF detector & smart directional jammer (covering GNSS, 2.4GHz, 5.8GHz)',
      datalink: 'Integrated C2 command console with thermal tracking camera'
    },
    armament: {
      hardpointsCount: 2,
      payloadCapacityKg: 200,
      compatibleWeapons: ['10 kW High-Energy Laser Directed Energy Weapon (1 km hard kill)', 'RF Smart Jammer (soft kill up to 3 km)']
    }
  },
  {
    programId: 'defspace-satellites',
    dimensions: {
      length: '3.5 m (deployed)',
      wingspan: '7.2 m (solar arrays)',
      height: '2.8 m',
      emptyWeightKg: 850,
      mtowKg: 1200
    },
    performance: {
      maxSpeed: 'Orbital velocity 7.6 km/s',
      combatRadiusKm: 40000,
      serviceCeilingMeters: 600000,
      enduranceHours: 61320
    },
    propulsion: {
      engineModel: 'High-efficiency Hall-effect Electric Propulsion Thruster (Xenon)',
      engineType: 'Electric ion / chemical mono-propellant orbital maintenance thrusters',
      powerOutput: '3.5 kW solar array'
    },
    avionics: {
      radarSuite: 'Spaceborne X-band Synthetic Aperture Radar (SAR) with 0.5m ground resolution',
      ewSuite: 'Anti-jamming spread spectrum transponders and laser space communications (LCT)',
      datalink: 'Quantum Key Distribution (QKD) terminal and secured Ka-band downlinks'
    },
    armament: {
      hardpointsCount: 0,
      payloadCapacityKg: 350,
      internalBays: false
    }
  }
];
