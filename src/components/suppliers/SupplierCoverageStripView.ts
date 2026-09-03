/**
 * Supplier Ecosystem Coverage Strip (Phase 2.4)
 * "X of 43 programs have verified supply chains mapped" plus per-capability
 * domain supplier/program tallies and a static freshness marker. Rendered
 * second in the Ecosystem Explorer, after the featured link and before any
 * card list.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import {
  getProgramCoverageStats,
  getCapabilityDomainStats
} from '../../data/suppliers/programSupplierMapper.js';
import { fetchSupplierGrowth } from '../../services/supplierGrowthService.js';

export function renderSupplierCoverageStripView(): HTMLElement {
  const strip = document.createElement('div');
  strip.className = 'dw-supplier-coverage-strip';

  const coverage = getProgramCoverageStats();
  const summary = document.createElement('div');
  summary.className = 'dw-supplier-coverage-summary';
  summary.innerHTML = `<strong>${coverage.mappedProgramCount}</strong> ${sanitizePlainText(
    STRINGS.suppliers.coverageStripPrefix
  )} <strong>${coverage.totalPrograms}</strong> ${sanitizePlainText(STRINGS.suppliers.coverageStripSuffix)}`;
  strip.appendChild(summary);

  const domainStats = getCapabilityDomainStats();
  const domainList = document.createElement('div');
  domainList.className = 'dw-supplier-coverage-domains';

  domainStats.forEach((stat) => {
    const chip = document.createElement('span');
    chip.className = 'dw-supplier-coverage-domain-chip';
    chip.textContent = `${sanitizePlainText(stat.domain)} — ${stat.supplierCount} ${
      STRINGS.suppliers.capabilityStripSuppliersSuffix
    } · ${stat.linkedProgramCount} ${STRINGS.suppliers.capabilityStripProgramsSuffix}`;
    domainList.appendChild(chip);
  });
  strip.appendChild(domainList);

  const freshness = document.createElement('div');
  freshness.className = 'dw-supplier-coverage-freshness';
  freshness.textContent = `${STRINGS.suppliers.lastVerifiedPrefix}: ${STRINGS.suppliers.lastVerifiedDate}`;
  strip.appendChild(freshness);

  // Fire-and-forget: patches in only once (and if) a human has approved at
  // least one growth-pipeline candidate — nothing to show before that.
  if (typeof window !== 'undefined') {
    fetchSupplierGrowth().then((growth) => {
      if (!growth || growth.newLinksCount <= 0) return;
      const signal = document.createElement('div');
      signal.className = 'dw-supplier-coverage-growth-signal';
      signal.textContent = `🌱 ${growth.newLinksCount} ${STRINGS.suppliers.growthSignalSuffix}`;
      strip.appendChild(signal);
    });
  }

  return strip;
}
