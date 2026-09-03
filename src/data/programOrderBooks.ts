/**
 * Active Order Books, Procurement Batches & Delivery Milestone Trackers
 * Authoritative parliamentary & MoD sanctioned delivery schedules.
 * Hard limit: <= 300 LOC.
 */

import { ProgramOrderBook } from '../types/programs.js';

export const ALL_PROGRAM_ORDER_BOOKS: ReadonlyArray<ProgramOrderBook> = Object.freeze([
  {
    programId: 'tejas-mk1a',
    sanctionedUnits: 180,
    contractedUnits: 83,
    deliveredUnits: 2,
    pendingUnits: 178,
    latestDeliveryMilestone: 'First series production aircraft LA-5033 completed acceptance flight at HAL Bengaluru',
    batches: [
      {
        batchName: '83 Mk1A Series Order (73 Fighters + 10 Trainers)',
        orderDate: '2021-02', units: 83, contractValueCrores: 48000,
        manufacturingFacility: 'HAL Aircraft Division, Bengaluru', deliverySchedule: '2024–2028',
        recipientBasesOrSquadrons: ['No. 45 Flying Daggers (Sulur)', 'No. 3 Cobra Squadron (Nal)'],
        status: 'in_production'
      },
      {
        batchName: '97 Mk1A Additional Batch (DAC Cleared)',
        orderDate: '2024-04', units: 97, contractValueCrores: 65000,
        manufacturingFacility: 'HAL Nashik & Bengaluru Lines', deliverySchedule: '2027–2031',
        recipientBasesOrSquadrons: ['Northern & Western Sector Fighter Squadrons'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'prachand-lch',
    sanctionedUnits: 156,
    contractedUnits: 156,
    deliveredUnits: 15,
    pendingUnits: 141,
    latestDeliveryMilestone: '15 Limited Series Production (LSP) helicopters inducted into IAF and Army Aviation Corps',
    batches: [
      {
        batchName: '15 LSP Induction Batch (IAF: 10, Army: 5)',
        orderDate: '2022-03', units: 15, contractValueCrores: 3887,
        manufacturingFacility: 'HAL Helicopter Division, Bengaluru', deliverySchedule: '2022–2024',
        recipientBasesOrSquadrons: ['IAF 143 Helicopter Unit (Jodhpur)', 'Army 351 Aviation Sqn (Missamari)'],
        status: 'delivered'
      },
      {
        batchName: '156 Serial Production Order (IAF: 66, Army: 90)',
        orderDate: '2024-06', units: 141, contractValueCrores: 45000,
        manufacturingFacility: 'HAL Bengaluru & Tumakuru Helicopter Lines', deliverySchedule: '2025–2030',
        recipientBasesOrSquadrons: ['High-Altitude Strike Squadrons (Leh, Udhampur, Missamari)'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'c295-transport',
    sanctionedUnits: 56,
    contractedUnits: 56,
    deliveredUnits: 6,
    pendingUnits: 50,
    latestDeliveryMilestone: '6th flyaway transport aircraft delivered; Vadodara Final Assembly Line inaugurated',
    batches: [
      {
        batchName: '16 Flyaway Aircraft from San Pablo Facility',
        orderDate: '2021-09', units: 16, contractValueCrores: 8000,
        manufacturingFacility: 'Airbus Defence and Space, Seville, Spain', deliverySchedule: '2023–2025',
        recipientBasesOrSquadrons: ['No. 11 Squadron "The Rhinos" (Vadodara AFS)'],
        status: 'in_production'
      },
      {
        batchName: '40 Make-in-India Aircraft Assembly Line',
        orderDate: '2021-09', units: 40, contractValueCrores: 13935,
        manufacturingFacility: 'Tata Advanced Systems Limited (TASL) FAL, Vadodara', deliverySchedule: '2026–2031',
        recipientBasesOrSquadrons: ['IAF Transport Squadrons & Coast Guard Air Stations'],
        status: 'in_production'
      }
    ]
  },
  {
    programId: 'zorawar-light-tank',
    sanctionedUnits: 354,
    contractedUnits: 59,
    deliveredUnits: 1,
    pendingUnits: 353,
    latestDeliveryMilestone: 'First prototype rolled out at L&T Hazira; high-altitude trials commenced in Ladakh',
    batches: [
      {
        batchName: 'First Regimental Batch & Development Units',
        orderDate: '2023-04', units: 59, contractValueCrores: 3200,
        manufacturingFacility: 'L&T Armoured Systems Complex, Hazira', deliverySchedule: '2024–2026',
        recipientBasesOrSquadrons: ['14 Corps High-Altitude Armoured Regiments (Ladakh)'],
        status: 'in_production'
      },
      {
        batchName: 'Make-I Production Pipeline (Remaining 295 Tanks)',
        orderDate: '2024-09', units: 295, contractValueCrores: 12800,
        manufacturingFacility: 'L&T Hazira & Strategic Industry Partners', deliverySchedule: '2027–2031',
        recipientBasesOrSquadrons: ['Eastern Ladakh & Sikkim High-Altitude Formations'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'k9-vajra-t',
    sanctionedUnits: 200,
    contractedUnits: 200,
    deliveredUnits: 100,
    pendingUnits: 100,
    latestDeliveryMilestone: 'First 100 tracked howitzers deployed in Ladakh; AoN for second 100 guns cleared',
    batches: [
      {
        batchName: 'Batch 1 Initial 100 Tracked Howitzers',
        orderDate: '2017-05', units: 100, contractValueCrores: 4500,
        manufacturingFacility: 'L&T Armoured Systems Complex, Hazira', deliverySchedule: '2018–2021',
        recipientBasesOrSquadrons: ['Strike Corps Artillery & Eastern Ladakh Regiments'],
        status: 'delivered'
      },
      {
        batchName: 'Batch 2 100 High-Altitude Winterized Guns',
        orderDate: '2024-02', units: 100, contractValueCrores: 7000,
        manufacturingFacility: 'L&T Hazira Line', deliverySchedule: '2025–2028',
        recipientBasesOrSquadrons: ['Northern Command High-Altitude Artillery Brigades'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'atags',
    sanctionedUnits: 307,
    contractedUnits: 307,
    deliveredUnits: 0,
    pendingUnits: 307,
    latestDeliveryMilestone: 'Commercial negotiations concluded for 307 guns with Bharat Forge & TASL (60:40 workshare)',
    batches: [
      {
        batchName: 'Bharat Forge Allocation (184 Guns / 60% Workshare)',
        orderDate: '2024-11', units: 184, contractValueCrores: 3900,
        manufacturingFacility: 'Kalyani Strategic Systems, Pune', deliverySchedule: '2025–2028',
        recipientBasesOrSquadrons: ['Frontline Desert & Mountain Artillery Formations'],
        status: 'sanctioned'
      },
      {
        batchName: 'TASL Allocation (123 Guns / 40% Workshare)',
        orderDate: '2024-11', units: 123, contractValueCrores: 2600,
        manufacturingFacility: 'Tata Advanced Systems Limited, Bengaluru', deliverySchedule: '2025–2028',
        recipientBasesOrSquadrons: ['Western & Northern Artillery Divisions'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'project-75-kalvari',
    sanctionedUnits: 9,
    contractedUnits: 9,
    deliveredUnits: 6,
    pendingUnits: 3,
    latestDeliveryMilestone: '6th Scorpene submarine INS Vagsheer commissioned; contract cleared for 3 follow-ons with AIP',
    batches: [
      {
        batchName: 'Project 75 Batch 1 (INS Kalvari to INS Vagsheer)',
        orderDate: '2005-10', units: 6, contractValueCrores: 23000,
        manufacturingFacility: 'Mazagon Dock Shipbuilders Limited (MDL), Mumbai', deliverySchedule: '2017–2024',
        recipientBasesOrSquadrons: ['Submarine Squadron Western Naval Command (Mumbai/Karwar)'],
        status: 'delivered'
      },
      {
        batchName: 'Project 75 Batch 2 Follow-on with AIP',
        orderDate: '2024-12', units: 3, contractValueCrores: 20000,
        manufacturingFacility: 'Mazagon Dock Shipbuilders Limited (MDL), Mumbai', deliverySchedule: '2028–2031',
        recipientBasesOrSquadrons: ['Eastern Fleet Submarine Squadron (Visakhapatnam)'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 'arjun-mk1a',
    sanctionedUnits: 118,
    contractedUnits: 118,
    deliveredUnits: 16,
    pendingUnits: 102,
    latestDeliveryMilestone: '16 Arjun Mk-1A tanks handed over to Indian Army with indigenized transmission and optics',
    batches: [
      {
        batchName: '118 Hunter-Killer Production Order',
        orderDate: '2021-09', units: 118, contractValueCrores: 7523,
        manufacturingFacility: 'Heavy Vehicles Factory (AVNL), Avadi, Chennai', deliverySchedule: '2024–2028',
        recipientBasesOrSquadrons: ['43 & 75 Armoured Regiments (Desert Sector)'],
        status: 'in_production'
      }
    ]
  },
  {
    programId: 'mq9b-guardian',
    sanctionedUnits: 31,
    contractedUnits: 31,
    deliveredUnits: 0,
    pendingUnits: 31,
    latestDeliveryMilestone: 'Formal FMS agreement signed with US Government for 31 MQ-9B aircraft (Navy 15, IAF 8, Army 8)',
    batches: [
      {
        batchName: 'Tri-Service 31 HALE Drone Procurement (15 SeaGuardian + 16 SkyGuardian)',
        orderDate: '2024-10', units: 31, contractValueCrores: 32000,
        manufacturingFacility: 'General Atomics / Indian MRO Hub (TASL)', deliverySchedule: '2026–2029',
        recipientBasesOrSquadrons: ['INS Rajali (Arakkonam), Sarsawa AFS, Gorakhpur AFS'],
        status: 'in_production'
      }
    ]
  },
  {
    programId: 'su30mki-super-sukhoi',
    sanctionedUnits: 84,
    contractedUnits: 84,
    deliveredUnits: 0,
    pendingUnits: 84,
    latestDeliveryMilestone: 'DAC approval accorded for comprehensive indigenous upgrade of 84 fighters with Virupaksha AESA',
    batches: [
      {
        batchName: 'Phase-1 Upgrade of 84 Frontline Fighters',
        orderDate: '2023-11', units: 84, contractValueCrores: 65000,
        manufacturingFacility: 'HAL Nasik Division & Base Repair Depots (11 BRD)', deliverySchedule: '2026–2032',
        recipientBasesOrSquadrons: ['Frontline Su-30MKI Squadrons (Halwara, Bareilly, Tezpur, Thanjavur)'],
        status: 'sanctioned'
      }
    ]
  },
  {
    programId: 's400-triumf',
    sanctionedUnits: 5,
    contractedUnits: 5,
    deliveredUnits: 3,
    pendingUnits: 2,
    latestDeliveryMilestone: '3 regiments operational in northern and eastern sectors; remaining 2 scheduled for delivery by 2026',
    batches: [
      {
        batchName: 'Regiments 1 to 3 Deployed (Northern & Eastern Fronts)',
        orderDate: '2018-10', units: 3, contractValueCrores: 23400,
        manufacturingFacility: 'Almaz-Antey Facilities (Russia)', deliverySchedule: '2021–2023',
        recipientBasesOrSquadrons: ['Punjab & Eastern Sector Air Defence Regiments'],
        status: 'delivered'
      },
      {
        batchName: 'Regiments 4 and 5 Delivery Pipeline',
        orderDate: '2018-10', units: 2, contractValueCrores: 15600,
        manufacturingFacility: 'Almaz-Antey Facilities (Russia)', deliverySchedule: '2025–2026',
        recipientBasesOrSquadrons: ['Strategic Western & Southern Corridors'],
        status: 'in_production'
      }
    ]
  }
]);

const ORDER_BOOKS_BY_PROGRAM_ID = new Map<string, ProgramOrderBook>();

for (const ob of ALL_PROGRAM_ORDER_BOOKS) {
  ORDER_BOOKS_BY_PROGRAM_ID.set(ob.programId, ob);
}

/**
 * Retrieve active order book and batch schedules by program ID in O(1) time.
 */
export function getOrderBookByProgramId(programId: string): ProgramOrderBook | undefined {
  return ORDER_BOOKS_BY_PROGRAM_ID.get(programId);
}

/**
 * Return all registered program order books.
 */
export function getAllProgramOrderBooks(): ProgramOrderBook[] {
  return [...ALL_PROGRAM_ORDER_BOOKS];
}
