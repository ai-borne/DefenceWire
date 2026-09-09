/**
 * Unit Tests for Entity Salience Scoring Engine (Phase 1)
 * Verifies headline vs lead vs incidental mention scoring and threshold gating.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEntitySalience,
  calculateClusterEntitySalience,
  PRIMARY_TAG_SALIENCE_THRESHOLD
} from '../../crawler/entitySalience.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('calculateEntitySalience', () => {
  it('awards high salience (>= 0.60) to focal headline subjects', () => {
    const headline = 'Tejas Mk1A Completes Advanced Weapon Firing Trials';
    const body = 'The Tejas Mk1A demonstrated precision strike capability today at Pokhran range. HAL and IAF teams monitored the performance closely.';

    const result = calculateEntitySalience('Tejas Mk1A', { headline, body });

    expect(result.disambiguationValid).toBe(true);
    expect(result.headlineScore).toBe(0.50);
    expect(result.leadScore).toBe(0.30);
    expect(result.score).toBeGreaterThanOrEqual(PRIMARY_TAG_SALIENCE_THRESHOLD);
    expect(result.isEligibleForPrimaryTag).toBe(true);
  });

  it('rejects incidental mentions buried in body text (< 0.60)', () => {
    const headline = 'IAF Finalizes Global Tender for 114 Multi-Role Fighter Aircraft';
    const body = 'The Indian Air Force is accelerating its procurement roadmap under Make-in-India. Officials stated the squadron strength remains crucial for preparedness along the LAC border. Deliveries are expected by 2029.';

    // LAC is mentioned only in the second sentence of the body as an incidental reference
    const result = calculateEntitySalience('LAC', { headline, body });

    expect(result.disambiguationValid).toBe(true); // Has border anchor
    expect(result.headlineScore).toBe(0.0);
    expect(result.leadScore).toBe(0.0);
    expect(result.score).toBeLessThan(PRIMARY_TAG_SALIENCE_THRESHOLD);
    expect(result.isEligibleForPrimaryTag).toBe(false);
  });

  it('scores 0 when entity fails disambiguation or anchor requirements', () => {
    const headline = 'Black Jet Achieves Flight Milestone, CEMILAC to Certify Replacement Fleet';
    const body = 'Engineers completed testing the advanced stealth coatings on the demonstration platform.';

    const result = calculateEntitySalience('LAC', { headline, body });

    expect(result.disambiguationValid).toBe(false);
    expect(result.score).toBe(0.0);
    expect(result.headlineScore).toBe(0.0);
    expect(result.leadScore).toBe(0.0);
    expect(result.isEligibleForPrimaryTag).toBe(false);
  });

  it('awards headline-only mention meeting the primary tag threshold if grammatical subject', () => {
    const headline = 'DAC Clears Rs 45,000 Crore Capital Acquisition for Armed Forces';
    const body = 'The Ministry of Defence announced new procurement sanctions following a high-level review meeting.';

    const result = calculateEntitySalience('DAC', { headline, body });

    expect(result.disambiguationValid).toBe(true);
    expect(result.headlineScore).toBe(0.50);
    expect(result.frequencyAndSubjectScore).toBeGreaterThanOrEqual(0.10);
    expect(result.score).toBeGreaterThanOrEqual(PRIMARY_TAG_SALIENCE_THRESHOLD);
    expect(result.isEligibleForPrimaryTag).toBe(true);
  });
});

describe('calculateClusterEntitySalience', () => {
  const dummySource: StorySourceItem = {
    id: 'src-1',
    title: 'India and China Conclude Border Talks in Arunachal Sector',
    url: 'https://example.com/border-talks',
    sourceName: 'Example News',
    sourceDomain: 'example.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: new Date().toISOString(),
    snippet: 'Negotiators met along the LAC to discuss Arunachal disengagement and patrol protocols.'
  };

  const dummyCluster: StoryCluster = {
    id: 'cl-test-1',
    synthesizedHeadline: 'India-China LAC Talks: Disengagement Agreed in Arunachal Sector',
    primarySource: dummySource,
    relatedCoverage: [],
    discussions: [],
    categories: ['strategic', 'army'],
    entities: ['LAC', 'China'],
    defenceScore: 85,
    isLeadStory: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('correctly calculates salience across cluster headline and primary source snippet', () => {
    const result = calculateClusterEntitySalience(dummyCluster, 'LAC');

    expect(result.disambiguationValid).toBe(true);
    expect(result.headlineScore).toBe(0.50);
    expect(result.leadScore).toBe(0.30);
    expect(result.score).toBeGreaterThanOrEqual(0.80);
    expect(result.isEligibleForPrimaryTag).toBe(true);
  });

  it('rejects an irrelevant tag against the cluster', () => {
    const result = calculateClusterEntitySalience(dummyCluster, 'INS Vikrant');
    expect(result.score).toBe(0.0);
    expect(result.isEligibleForPrimaryTag).toBe(false);
  });
});
