/**
 * Unit Tests for Tender Scope Filter SSOT (MOAT3 Phase 2)
 * Table-driven, fixture org-chains/titles — no live network.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  isEprocureOrgAllowed,
  isExcludedByCategory,
  isExcludedByKeyword,
  isExcludedByOrgChain,
  isTenderInScope
} from '../../crawler/tenderFilterConfig.js';

describe('Tender Scope Filter SSOT', () => {
  describe('isExcludedByOrgChain', () => {
    it('excludes the civic/estate org-chain fixture captured during source verification', () => {
      expect(isExcludedByOrgChain('Ministry Of Defence | DGDE Cantonment Board | Estate Office')).toBe(true);
    });

    it('excludes MES org chains', () => {
      expect(isExcludedByOrgChain('Ministry Of Defence | MES | Garrison Engineer')).toBe(true);
    });

    it('does not exclude an acquisition org chain', () => {
      expect(isExcludedByOrgChain('Ministry Of Defence | Indian Air Force | Air Headquarters')).toBe(false);
    });
  });

  describe('isExcludedByCategory', () => {
    it('excludes Works category only when the org chain is also civic/estate', () => {
      expect(isExcludedByCategory('Ministry Of Defence | MES | Garrison Engineer', 'Works')).toBe(true);
    });

    it('does not exclude Works category for a non-civic org chain', () => {
      expect(isExcludedByCategory('Ministry Of Defence | Indian Navy | Naval Dockyard', 'Works')).toBe(false);
    });

    it('does not exclude a civic org chain when category is Goods', () => {
      expect(isExcludedByCategory('Ministry Of Defence | DGDE Cantonment Board', 'Goods')).toBe(false);
    });
  });

  describe('isExcludedByKeyword', () => {
    it('excludes titles matching the civic/estate keyword backstop', () => {
      expect(isExcludedByKeyword('Annual maintenance contract for street light fittings')).toBe(true);
      expect(isExcludedByKeyword('Horticulture and Park maintenance work')).toBe(true);
    });

    it('does not exclude acquisition titles', () => {
      expect(isExcludedByKeyword('Procurement of Spare Parts for Su-30MKI Avionics Suite')).toBe(false);
    });
  });

  describe('isEprocureOrgAllowed', () => {
    it('allows named service/PSU org chains', () => {
      expect(isEprocureOrgAllowed('Ministry Of Defence | Indian Army | Northern Command')).toBe(true);
      expect(isEprocureOrgAllowed('Department of DRDO | DRDO HQ')).toBe(true);
    });

    it('rejects unrelated all-of-govt org chains', () => {
      expect(isEprocureOrgAllowed('Ministry Of Railways | Northern Railway')).toBe(false);
    });
  });

  describe('isTenderInScope (combined layers)', () => {
    it('keeps an in-scope defproc acquisition tender', () => {
      expect(
        isTenderInScope({
          source: 'defproc',
          organisationChain: 'Ministry Of Defence | Indian Air Force | Air Headquarters',
          title: 'Procurement of Spare Parts for Su-30MKI Avionics Suite',
          category: 'Goods'
        })
      ).toBe(true);
    });

    it('drops the civic/estate fixture tender regardless of source', () => {
      expect(
        isTenderInScope({
          source: 'defproc',
          organisationChain: 'Ministry Of Defence | DGDE Cantonment Board',
          title: 'Repair of internal roads in Cantonment area',
          category: 'Works'
        })
      ).toBe(false);
    });

    it('drops an eprocure tender whose org chain is not on the allowlist', () => {
      expect(
        isTenderInScope({
          source: 'eprocure',
          organisationChain: 'Ministry Of Railways | Northern Railway',
          title: 'Supply of signalling equipment',
          category: 'Goods'
        })
      ).toBe(false);
    });

    it('keeps an eprocure tender whose org chain is on the allowlist', () => {
      expect(
        isTenderInScope({
          source: 'eprocure',
          organisationChain: 'Ministry Of Defence | Indian Navy | Naval Dockyard',
          title: 'Supply of sonar sub-assemblies',
          category: 'Goods'
        })
      ).toBe(true);
    });

    it('drops a tender matching the keyword backstop even from an allowed source', () => {
      expect(
        isTenderInScope({
          source: 'defproc',
          organisationChain: 'Ministry Of Defence | Indian Army | Station HQ',
          title: 'Catering services for officers mess',
          category: 'Services'
        })
      ).toBe(false);
    });
  });
});
