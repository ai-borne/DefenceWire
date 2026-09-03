/**
 * Program Technical Specifications View Component for DefenceWire.in
 * Categorized Jane's-grade technical specification matrices.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram, ProgramTechnicalSpecs } from '../../types/programs.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { getSpecsByProgramId } from '../../data/specs/programSpecsAggregator.js';

interface SpecRow {
  label: string;
  val: string | number | boolean | string[] | undefined;
  unit?: string;
}

function formatSpecValue(val: string | number | boolean | string[], unit?: string): string {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  const str = String(val);
  return unit && !str.includes(unit) ? `${str} ${unit}` : str;
}

function renderSection(title: string, rows: SpecRow[]): HTMLElement | null {
  const activeRows = rows.filter((r) => r.val !== undefined && r.val !== null && r.val !== '');
  if (activeRows.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'dw-specs-category';

  const heading = document.createElement('h4');
  heading.className = 'dw-specs-category-title';
  heading.textContent = title;
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'dw-program-specs-grid';

  for (const row of activeRows) {
    const item = document.createElement('div');
    item.className = 'dw-program-spec-item';
    const formatted = formatSpecValue(row.val!, row.unit);
    item.innerHTML = `<span class="dw-spec-key">${sanitizePlainText(row.label)}</span><span class="dw-spec-val">${sanitizePlainText(formatted)}</span>`;
    grid.appendChild(item);
  }

  section.appendChild(grid);
  return section;
}

export function renderProgramSpecsView(program: StrategicProgram): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-program-specs-view';

  const heading = document.createElement('h3');
  heading.className = 'dw-timeline-heading';
  heading.textContent = STRINGS.programs.specificationsHeading;
  container.appendChild(heading);

  const specs: ProgramTechnicalSpecs | undefined = program.specs ?? getSpecsByProgramId(program.id);

  if (!specs && (!program.specifications || Object.keys(program.specifications).length === 0)) {
    const empty = document.createElement('div');
    empty.className = 'dw-specs-empty';
    empty.textContent = STRINGS.programs.specsNoData;
    container.appendChild(empty);
    return container;
  }

  if (specs) {
    const dimSec = specs.dimensions && renderSection(STRINGS.programs.specsDimensionsHeading, [
      { label: 'Length', val: specs.dimensions.length },
      { label: 'Wingspan', val: specs.dimensions.wingspan },
      { label: 'Beam', val: specs.dimensions.beam },
      { label: 'Height', val: specs.dimensions.height },
      { label: 'Diameter', val: specs.dimensions.diameter },
      { label: 'Displacement', val: specs.dimensions.displacementTons, unit: STRINGS.programs.specsUnitTons },
      { label: 'Empty Weight', val: specs.dimensions.emptyWeightKg, unit: STRINGS.programs.specsUnitKg },
      { label: 'MTOW', val: specs.dimensions.mtowKg, unit: STRINGS.programs.specsUnitKg }
    ]);
    if (dimSec) container.appendChild(dimSec);

    const perfSec = specs.performance && renderSection(STRINGS.programs.specsPerformanceHeading, [
      { label: 'Max Speed', val: specs.performance.maxSpeed },
      { label: 'Combat Radius', val: specs.performance.combatRadiusKm, unit: STRINGS.programs.specsUnitKm },
      { label: 'Ferry Range', val: specs.performance.ferryRangeKm, unit: STRINGS.programs.specsUnitKm },
      { label: 'Service Ceiling', val: specs.performance.serviceCeilingMeters, unit: STRINGS.programs.specsUnitMeters },
      { label: 'RCS Estimate', val: specs.performance.rcsEstimate },
      { label: 'Endurance', val: specs.performance.enduranceHours, unit: STRINGS.programs.specsUnitHours }
    ]);
    if (perfSec) container.appendChild(perfSec);

    const propSec = specs.propulsion && renderSection(STRINGS.programs.specsPropulsionHeading, [
      { label: 'Engine Model', val: specs.propulsion.engineModel },
      { label: 'Engine Type', val: specs.propulsion.engineType },
      { label: 'Dry Thrust', val: specs.propulsion.dryThrustKn, unit: STRINGS.programs.specsUnitKn },
      { label: 'Wet Thrust', val: specs.propulsion.wetThrustKn, unit: STRINGS.programs.specsUnitKn },
      { label: 'Power Output', val: specs.propulsion.powerOutput }
    ]);
    if (propSec) container.appendChild(propSec);

    const avSec = specs.avionics && renderSection(STRINGS.programs.specsAvionicsHeading, [
      { label: 'Radar Suite', val: specs.avionics.radarSuite },
      { label: 'EW Suite', val: specs.avionics.ewSuite },
      { label: 'Tactical Datalink', val: specs.avionics.datalink },
      { label: 'Target Tracking', val: specs.avionics.targetTrackingCapacity }
    ]);
    if (avSec) container.appendChild(avSec);

    const armSec = specs.armament && renderSection(STRINGS.programs.specsArmamentHeading, [
      { label: 'Hardpoints', val: specs.armament.hardpointsCount },
      { label: 'Payload Capacity', val: specs.armament.payloadCapacityKg, unit: STRINGS.programs.specsUnitKg },
      { label: 'Internal Bays', val: specs.armament.internalBays },
      { label: 'Gun System', val: specs.armament.gunSystem },
      { label: 'Compatible Weapons', val: specs.armament.compatibleWeapons }
    ]);
    if (armSec) container.appendChild(armSec);
  }

  if (program.specifications && Object.keys(program.specifications).length > 0 && !specs) {
    const legacyGrid = document.createElement('div');
    legacyGrid.className = 'dw-program-specs-grid';
    for (const [key, val] of Object.entries(program.specifications)) {
      const item = document.createElement('div');
      item.className = 'dw-program-spec-item';
      item.innerHTML = `<span class="dw-spec-key">${sanitizePlainText(key)}</span><span class="dw-spec-val">${sanitizePlainText(val)}</span>`;
      legacyGrid.appendChild(item);
    }
    container.appendChild(legacyGrid);
  }

  return container;
}
