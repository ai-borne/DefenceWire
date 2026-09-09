/**
 * Unit Tests for Entity Disambiguator & Contextual Anchor Validator (Phase 1)
 * Enforces strict token-boundary matching and contextual anchors.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  hasWordBoundary,
  countTokenOccurrences,
  validateEntityAnchors,
  disambiguateEntity,
  CONTEXTUAL_ANCHORS
} from '../../crawler/entityDisambiguator.js';

describe('hasWordBoundary', () => {
  it('rejects lexical collisions where acronym is a substring of an unrelated word', () => {
    expect(hasWordBoundary('Black Jet takes flight', 'LAC')).toBe(false);
    expect(hasWordBoundary('CEMILAC airworthiness certification', 'LAC')).toBe(false);
    expect(hasWordBoundary('Plans to replace the aging fleet', 'LAC')).toBe(false);
    expect(hasWordBoundary('Automated lacquer coating', 'LAC')).toBe(false);
    expect(hasWordBoundary('Inspecting the hangar', 'INS')).toBe(false);
    expect(hasWordBoundary('Shall proceed with trials', 'HAL')).toBe(false);
  });

  it('detects discrete word tokens accurately', () => {
    expect(hasWordBoundary('Troops deployed along the LAC today', 'LAC')).toBe(true);
    expect(hasWordBoundary('#LAC standoff resolution', '#LAC')).toBe(true);
    expect(hasWordBoundary('INS Vikrant completes sortie', 'INS')).toBe(true);
    expect(hasWordBoundary('DAC cleared procurement deal', 'DAC')).toBe(true);
    expect(hasWordBoundary('HAL signs contract for Tejas', 'HAL')).toBe(true);
  });
});

describe('countTokenOccurrences', () => {
  it('counts only discrete tokens, ignoring substring occurrences', () => {
    const text = 'Black Jet replacement: LAC troops patrol LAC sector near CEMILAC facility';
    expect(countTokenOccurrences(text, 'LAC')).toBe(2);
  });

  it('returns 0 for non-existent entities', () => {
    expect(countTokenOccurrences('Simple test string', 'AMCA')).toBe(0);
  });
});

describe('validateEntityAnchors', () => {
  it('proves "Black Jet", "CEMILAC", and "replace" score 0 for LAC', () => {
    const blackJetRes = validateEntityAnchors('LAC', 'Black Jet conducts first flight demonstration');
    expect(blackJetRes.score).toBe(0);
    expect(blackJetRes.isValid).toBe(false);
    expect(blackJetRes.hasWordBoundaryMatch).toBe(false);

    const cemilacRes = validateEntityAnchors('LAC', 'CEMILAC issues initial airworthiness flight clearance');
    expect(cemilacRes.score).toBe(0);
    expect(cemilacRes.isValid).toBe(false);
    expect(cemilacRes.hasWordBoundaryMatch).toBe(false);

    const replaceRes = validateEntityAnchors('LAC', 'Plans to replace legacy fighter jets with fifth-generation aircraft');
    expect(replaceRes.score).toBe(0);
    expect(replaceRes.isValid).toBe(false);
    expect(replaceRes.hasWordBoundaryMatch).toBe(false);
  });

  it('proves legitimate Arunachal border talks score 1.0 for LAC', () => {
    const text = 'India and China hold high-level military talks on Arunachal LAC disengagement';
    const res = validateEntityAnchors('LAC', text);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
    expect(res.hasWordBoundaryMatch).toBe(true);
    expect(res.matchedAnchors).toContain('China');
    expect(res.matchedAnchors).toContain('Arunachal');
    expect(disambiguateEntity('LAC', text)).toBe(true);
  });

  it('proves Ladakh standoff and buffer zone talks score 1.0 for LAC', () => {
    const text = 'PLA and Indian Army complete patrol disengagement along LAC Ladakh buffer zone';
    const res = validateEntityAnchors('LAC', text);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
    expect(res.matchedAnchors).toContain('PLA');
    expect(res.matchedAnchors).toContain('patrol');
    expect(res.matchedAnchors).toContain('Ladakh');
    expect(res.matchedAnchors).toContain('buffer zone');

    const expansionText = 'PLA and Indian Army complete patrol disengagement along Line of Actual Control in Ladakh';
    const expansionRes = validateEntityAnchors('LAC', expansionText);
    expect(expansionRes.score).toBe(1.0);
    expect(expansionRes.isValid).toBe(true);
  });

  it('rejects LAC when token exists but lacks contextual anchors (e.g. currency or unrelated)', () => {
    const text = 'Project sanctioned with 50 lac financial budget allocation for state roads';
    const res = validateEntityAnchors('LAC', text);
    expect(res.score).toBe(0);
    expect(res.isValid).toBe(false);
    expect(res.hasWordBoundaryMatch).toBe(true);
    expect(res.matchedAnchors.length).toBe(0);
  });

  it('enforces naval anchors for INS', () => {
    const navyText = 'INS Vikrant joins carrier strike group with stealth frigate and submarine';
    const res = validateEntityAnchors('INS', navyText);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
    expect(res.matchedAnchors).toContain('frigate');
    expect(res.matchedAnchors).toContain('submarine');

    const nonNavyText = 'INS inspection department reviewed factory protocols';
    const rejected = validateEntityAnchors('INS', nonNavyText);
    expect(rejected.score).toBe(0);
    expect(rejected.isValid).toBe(false);
  });

  it('enforces procurement anchors for DAC', () => {
    const dacText = 'DAC cleared Rs 45,000 crore capital acquisition order chaired by Rajnath';
    const res = validateEntityAnchors('DAC', dacText);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
    expect(res.matchedAnchors).toContain('capital acquisition');
    expect(res.matchedAnchors).toContain('order');
    expect(res.matchedAnchors).toContain('Rajnath');

    const nonDacText = 'DAC meeting discussed internal administrative scheduling';
    const rejected = validateEntityAnchors('DAC', nonDacText);
    expect(rejected.score).toBe(0);
    expect(rejected.isValid).toBe(false);
  });

  it('enforces aviation anchors for HAL', () => {
    const aviationText = 'HAL rolls out Tejas Mk1A fighter aircraft and light combat helicopter';
    const res = validateEntityAnchors('HAL', aviationText);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
    expect(res.matchedAnchors).toContain('aircraft');
    expect(res.matchedAnchors).toContain('Tejas');

    const nonAviationText = 'HAL staff members organize community sports day';
    const rejected = validateEntityAnchors('HAL', nonAviationText);
    expect(rejected.score).toBe(0);
    expect(rejected.isValid).toBe(false);
  });

  it('allows non-ambiguous platforms directly if word boundary matches', () => {
    const text = 'Indian Air Force evaluates Su-57 Felon fifth-generation fighter jet';
    const res = validateEntityAnchors('Su-57', text);
    expect(res.score).toBe(1.0);
    expect(res.isValid).toBe(true);
  });
});

describe('CONTEXTUAL_ANCHORS', () => {
  it('defines required contextual anchor sets for known ambiguous acronyms', () => {
    expect(CONTEXTUAL_ANCHORS.LAC).toContain('China');
    expect(CONTEXTUAL_ANCHORS.LAC).toContain('PLA');
    expect(CONTEXTUAL_ANCHORS.LAC).toContain('border');
    expect(CONTEXTUAL_ANCHORS.INS).toContain('Navy');
    expect(CONTEXTUAL_ANCHORS.DAC).toContain('procurement');
    expect(CONTEXTUAL_ANCHORS.HAL).toContain('aviation');
    expect(CONTEXTUAL_ANCHORS.LOC).toContain('Pakistan');
  });
});

