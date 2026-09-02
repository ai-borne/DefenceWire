/**
 * Unit Tests for Tender-to-Strategic-Program Linker (MOAT3 Phase 2)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { linkTenderToPrograms } from '../../crawler/tenderProgramLinker.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';

describe('Tender-to-Strategic-Program Linker', () => {
  it('links a tender title mentioning a known strategic program', () => {
    const program = ALL_STRATEGIC_PROGRAMS[0]!;
    const ids = linkTenderToPrograms({ title: `Procurement in support of ${program.name}` });
    expect(ids).toContain(program.id);
  });

  it('returns an empty array when no program is mentioned', () => {
    const ids = linkTenderToPrograms({
      title: 'Procurement of Office Stationery',
      organisationChain: 'Ministry Of Defence | Indian Army'
    });
    expect(ids).toEqual([]);
  });

  it('deduplicates program ids across title and organisation chain', () => {
    const program = ALL_STRATEGIC_PROGRAMS[0]!;
    const ids = linkTenderToPrograms({
      title: `Spares for ${program.name}`,
      organisationChain: `Project office for ${program.name}`
    });
    expect(ids.filter((id) => id === program.id)).toHaveLength(1);
  });
});
