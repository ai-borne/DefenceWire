/**
 * Unit Tests for the Stable ID Hash
 * The whole point: the same input must hash identically across separate
 * calls (and separate process invocations, e.g. crawler runs 20 minutes
 * apart) — that's what makes cluster/article identity survive a re-crawl.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { computeStableHash } from '../../src/utils/stableId.js';

describe('computeStableHash', () => {
  it('produces the same hash for the same input every time', () => {
    const url = 'https://pib.gov.in/news/tejas-mk1a-delivery';
    expect(computeStableHash(url)).toBe(computeStableHash(url));
  });

  it('produces different hashes for different inputs', () => {
    expect(computeStableHash('https://example.com/a')).not.toBe(computeStableHash('https://example.com/b'));
  });

  it('is case-insensitive and trims whitespace, matching how URLs are treated elsewhere', () => {
    expect(computeStableHash('  https://Example.com/Article  ')).toBe(computeStableHash('https://example.com/article'));
  });

  it('returns a fixed-length lowercase hex string', () => {
    const hash = computeStableHash('https://example.com/article');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles an empty string without throwing', () => {
    expect(() => computeStableHash('')).not.toThrow();
    expect(computeStableHash('')).toMatch(/^[0-9a-f]{8}$/);
  });
});
