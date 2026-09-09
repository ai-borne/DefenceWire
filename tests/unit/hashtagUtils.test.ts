/**
 * Unit Tests for Hashtag Utilities (Phase 2)
 * Tests hashtag cleaning, canonicalization, slug generation, and stop-tag suppression.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  cleanHashtag,
  canonicalizeTag,
  hashtagToSlug,
  isNoiseTag
} from '../../src/utils/hashtagUtils.js';

describe('isNoiseTag', () => {
  it('blocks generic news stop-tags and categories', () => {
    expect(isNoiseTag('News')).toBe(true);
    expect(isNoiseTag('#News')).toBe(true);
    expect(isNoiseTag('Defence')).toBe(true);
    expect(isNoiseTag('Defense')).toBe(true);
    expect(isNoiseTag('India')).toBe(true);
    expect(isNoiseTag('Security')).toBe(true);
    expect(isNoiseTag('Update')).toBe(true);
    expect(isNoiseTag('Updates')).toBe(true);
    expect(isNoiseTag('Top News')).toBe(true);
    expect(isNoiseTag('Breaking News')).toBe(true);
    expect(isNoiseTag('Press Release')).toBe(true);
    expect(isNoiseTag('Operational')).toBe(true);
    expect(isNoiseTag('Strategic')).toBe(true);
    expect(isNoiseTag('Acquisition')).toBe(true);
    expect(isNoiseTag('Modernization')).toBe(true);
    expect(isNoiseTag('Systems')).toBe(true);
    expect(isNoiseTag('Arc')).toBe(true);
    expect(isNoiseTag('Delivery')).toBe(true);
    expect(isNoiseTag('')).toBe(true);
    expect(isNoiseTag('x')).toBe(true);
  });

  it('allows sovereign military entities, programs, and platforms', () => {
    expect(isNoiseTag('Su-57')).toBe(false);
    expect(isNoiseTag('#Su57')).toBe(false);
    expect(isNoiseTag('Apache')).toBe(false);
    expect(isNoiseTag('TASL')).toBe(false);
    expect(isNoiseTag('EOS-05')).toBe(false);
    expect(isNoiseTag('#EOS05')).toBe(false);
    expect(isNoiseTag('INSSudarshini')).toBe(false);
    expect(isNoiseTag('LAC')).toBe(false);
    expect(isNoiseTag('Tejas Mk1A')).toBe(false);
    expect(isNoiseTag('DAC Clearance')).toBe(false);
  });
});

describe('cleanHashtag', () => {
  it('strips leading # and trims cleanly', () => {
    expect(cleanHashtag('#Su57')).toBe('Su57');
    expect(cleanHashtag(' #Apache ')).toBe('Apache');
    expect(cleanHashtag('#TASL')).toBe('TASL');
    expect(cleanHashtag('#EOS05')).toBe('EOS05');
    expect(cleanHashtag('#INSSudarshini')).toBe('INSSudarshini');
    expect(cleanHashtag('#LAC')).toBe('LAC');
  });

  it('strips th_ prefix if passed a thread ID', () => {
    expect(cleanHashtag('th_su-57')).toBe('Su-57');
    expect(cleanHashtag('th_tasl')).toBe('TASL');
    expect(cleanHashtag('th_lac')).toBe('LAC');
    expect(cleanHashtag('th_tejas-mk1a')).toBe('Tejas-Mk1A');
  });

  it('capitalizes all-lowercase words and preserves acronyms', () => {
    expect(cleanHashtag('apache')).toBe('Apache');
    expect(cleanHashtag('tasl')).toBe('TASL');
    expect(cleanHashtag('amca')).toBe('AMCA');
    expect(cleanHashtag('')).toBe('');
  });
});

describe('hashtagToSlug', () => {
  it('generates consistent th_ slug for hyphenated, camelCase, and alphanumeric tags', () => {
    expect(hashtagToSlug('#Su57')).toBe('th_su-57');
    expect(hashtagToSlug('Su-57')).toBe('th_su-57');
    expect(hashtagToSlug('su57')).toBe('th_su-57');
    expect(hashtagToSlug('th_su-57')).toBe('th_su-57');
    expect(hashtagToSlug('#Apache')).toBe('th_apache');
    expect(hashtagToSlug('#TASL')).toBe('th_tasl');
    expect(hashtagToSlug('#EOS05')).toBe('th_eos-05');
    expect(hashtagToSlug('#INSSudarshini')).toBe('th_ins-sudarshini');
    expect(hashtagToSlug('#LAC')).toBe('th_lac');
    expect(hashtagToSlug('Tejas Mk1A')).toBe('th_tejas-mk1a');
  });

  it('returns empty string for invalid inputs', () => {
    expect(hashtagToSlug('')).toBe('');
    expect(hashtagToSlug('###')).toBe('');
  });
});

describe('canonicalizeTag', () => {
  it('unifies variant forms into canonical display representation', () => {
    expect(canonicalizeTag('#Su57')).toBe('Su-57');
    expect(canonicalizeTag('su-57')).toBe('Su-57');
    expect(canonicalizeTag('th_su-57')).toBe('Su-57');
    expect(canonicalizeTag('Su-57')).toBe('Su-57');
    expect(canonicalizeTag('#EOS05')).toBe('EOS-05');
    expect(canonicalizeTag('#Apache')).toBe('Apache');
    expect(canonicalizeTag('#TASL')).toBe('TASL');
    expect(canonicalizeTag('#LAC')).toBe('LAC');
  });

  it('returns empty string for noise tags', () => {
    expect(canonicalizeTag('#News')).toBe('');
    expect(canonicalizeTag('Defence')).toBe('');
    expect(canonicalizeTag('India')).toBe('');
  });
});
