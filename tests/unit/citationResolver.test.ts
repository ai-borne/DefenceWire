/**
 * Unit Tests for Government Citation Deep-Link Resolver
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { resolveCitationLink, resolveCitationUrl } from '../../src/utils/citationResolver.js';
import { OrbatCitation } from '../../src/types/orbat.js';

describe('Government Citation Deep-Link Resolver', () => {
  it('resolves PIB document IDs directly to the PIB PressReleasePage PRID permalink', () => {
    const citation: OrbatCitation = {
      sourceTitle: 'IAF Operationalizes Second Tejas Squadron No. 18 Flying Bullets',
      sourceType: 'pib_release',
      documentNumber: 'PIB ID 1627042',
      date: '2020-05-27'
    };

    const url = resolveCitationUrl(citation);
    expect(url).toBe('https://pib.gov.in/PressReleasePage.aspx?PRID=1627042');

    const link = resolveCitationLink(citation);
    expect(link.url).toBe('https://pib.gov.in/PressReleasePage.aspx?PRID=1627042');
    expect(link.sourceLabel).toBe('PIB Press Release');
    expect(link.isDirectDocument).toBe(true);
  });

  it('resolves parliamentary question citations to Sansad Q&A search portal', () => {
    const citation: OrbatCitation = {
      sourceTitle: 'MoD: MiG-21 Phase-out & Tejas Mk1A Induction Bases',
      sourceType: 'parliamentary_report',
      documentNumber: 'Lok Sabha Unstarred Q. No. 1420',
      date: '2024-02-09'
    };

    const link = resolveCitationLink(citation);
    expect(link.url).toBe('https://sansad.in/ls/questions/questions-search');
    expect(link.sourceLabel).toBe('Sansad Q&A Portal');
    expect(link.isDirectDocument).toBe(false);
  });

  it('resolves standing committee reports to Sansad committee reports portal', () => {
    const citation: OrbatCitation = {
      sourceTitle: 'Standing Committee on Defence: 42nd Report on Demands for Grants',
      sourceType: 'parliamentary_report',
      documentNumber: '17th Lok Sabha, Report No. 42',
      date: '2023-03-21'
    };

    const link = resolveCitationLink(citation);
    expect(link.url).toBe('https://sansad.in/ls/committees/reports');
    expect(link.sourceLabel).toBe('Parliamentary Committee Report');
  });

  it('resolves Defence Acquisition Council (DAC) clearances to MoD DAC portal', () => {
    const citation: OrbatCitation = {
      sourceTitle: 'DAC In-Principle Acceptance of Necessity for 3 Additional Scorpene Submarines',
      sourceType: 'dac_decision',
      documentNumber: 'DAC/2023/07/P75-FOLLOWON',
      date: '2023-07-13'
    };

    const link = resolveCitationLink(citation);
    expect(link.url).toBe('https://mod.gov.in/dod/defence-acquisition-council');
    expect(link.sourceLabel).toBe('DAC Decision Portal');
  });

  it('resolves DRDO test communiques to the official DRDO portal', () => {
    const citation: OrbatCitation = {
      sourceTitle: 'DRDO Year End Review: SWiFT Flying Wing Validation',
      sourceType: 'mod_annual_report',
      documentNumber: 'DRDO/2023/YE-SWIFT',
      date: '2023-12-28'
    };

    const link = resolveCitationLink(citation);
    expect(link.url).toBe('https://www.drdo.gov.in/');
    expect(link.sourceLabel).toBe('DRDO Official Portal');
  });

  it('preserves and honors explicitly provided external URLs', () => {
    const explicitUrl = 'https://sansad.in/getFile/loksabhaquestions/annex/1714/AU1420.pdf';
    const citation: OrbatCitation = {
      sourceTitle: 'Official Lok Sabha Unstarred Question PDF',
      sourceType: 'parliamentary_report',
      date: '2024-02-09',
      url: explicitUrl
    };

    const url = resolveCitationUrl(citation);
    expect(url).toBe(explicitUrl);
  });
});
