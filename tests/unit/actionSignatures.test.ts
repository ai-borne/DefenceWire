/**
 * Unit Tests for Defense Action Signatures
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { extractActionSignatures, hasSharedActionSignature } from '../../src/engine/actionSignatures.js';

describe('Defense Action Signatures Classifier', () => {
  it('extracts TRIAL_TEST action signature from missile and weapon trials', () => {
    const text1 = 'DRDO successfully flight tests indigenous long range glide bomb';
    const text2 = 'Indian Navy conducts sea trials of second indigenous aircraft carrier';

    expect(extractActionSignatures(text1)).toContain('TRIAL_TEST');
    expect(extractActionSignatures(text2)).toContain('TRIAL_TEST');
  });

  it('extracts DAC_PROCUREMENT and CONTRACT_DEAL from procurement news', () => {
    const dacText = 'DAC gives AoN for procurement of 97 additional Tejas Mk1A fighter jets';
    const dealText = 'MoD signs Rs 26000 crore contract with HAL for Su-30MKI engines';

    expect(extractActionSignatures(dacText)).toContain('DAC_PROCUREMENT');
    expect(extractActionSignatures(dealText)).toContain('CONTRACT_DEAL');
  });

  it('extracts INDUCTION_COMMISSION and BORDER_SECURITY signatures', () => {
    const indText = 'Indian Army inducts first batch of Zorawar light tanks in Ladakh';
    const borderText = 'Corps Commanders meet for 22nd round of border talks along LAC in Ladakh';

    expect(extractActionSignatures(indText)).toContain('INDUCTION_COMMISSION');
    expect(extractActionSignatures(borderText)).toContain('BORDER_SECURITY');
  });

  it('determines shared action signatures across diverse reporting styles', () => {
    const reportA = 'DRDO tests new Astra Mk2 missile from Su-30MKI';
    const reportB = 'Successful flight test of Astra BVR missile validated by IAF';
    const reportC = 'DAC grants approval for Astra missile procurement';

    expect(hasSharedActionSignature(reportA, reportB)).toBe(true);
    expect(hasSharedActionSignature(reportA, reportC)).toBe(false);
  });

  it('returns empty array when text has no defense action signatures', () => {
    expect(extractActionSignatures('')).toEqual([]);
    expect(extractActionSignatures('General routine statement with no actions')).toEqual([]);
  });
});
