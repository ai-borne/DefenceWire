/**
 * Unit Tests for LLM Living Dossier & Timeline Pruner
 * Tests milestone extraction, deduplication, conflict resolution, and canonical dossier synthesis.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  batchConsolidateLivingDossiers,
  deduplicateMilestones,
  determineLifecycleStatus,
  EntityMilestone,
  extractBudgetFromString,
  extractIddmFromString,
  extractMilestoneFromSourceItem,
  extractTimelineFromString,
  isDuplicateMilestone,
  mergeDuplicateMilestones,
  resolveTimelineConflicts,
  synthesizeCanonicalDossier
} from '../../crawler/dossierPruner.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('LLM Living Dossier Pruner: Regex & Fact Extraction', () => {
  it('extracts budget in ₹ Cr from various textual representations', () => {
    expect(extractBudgetFromString('DAC clears procurement worth ₹45,000 Cr for Indian Navy')).toBe(45000);
    expect(extractBudgetFromString('Project cost estimated at Rs 12,500.50 crore')).toBe(12500.5);
    expect(extractBudgetFromString('Contract signed for 6,200 cr with HAL')).toBe(6200);
    expect(extractBudgetFromString('No monetary figures mentioned here')).toBeUndefined();
  });

  it('extracts IDDM percentage from text', () => {
    expect(extractIddmFromString('Tejas Mk1A achieved 65% indigenous content')).toBe(65);
    expect(extractIddmFromString('High local content of 75% IDDM compliance')).toBe(75);
    expect(extractIddmFromString('Imported sub-assemblies only')).toBeUndefined();
  });

  it('extracts target delivery and trial timelines from text', () => {
    expect(extractTimelineFromString('Deliveries scheduled to commence by March 2026')).toBe('March 2026');
    expect(extractTimelineFromString('Target operational induction in 2028-2029')).toBe('2028-2029');
    expect(extractTimelineFromString('Initial flight tests targeted for 2027')).toBe('2027');
  });

  it('extracts structured milestone from official Sansad parliamentary question', () => {
    const sansadItem: StorySourceItem = {
      id: 'src-sansad-ls-usq-101',
      title: 'Lok Sabha Unstarred Question No. 101: Status of LCA Tejas Mk1A Deliveries',
      url: 'https://sansad.in/ls/q101',
      sourceName: 'Lok Sabha Secretariat',
      sourceDomain: 'sansad.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-10T09:00:00Z',
      snippet: 'MoD stated in Lok Sabha that 83 Tejas Mk1A aircraft worth ₹48,000 Cr will see first delivery by March 2026 with 65% indigenous content.',
      parliamentMeta: {
        house: 'Lok Sabha',
        questionNumber: 'USQ 101',
        questionType: 'Unstarred',
        answeringDate: '2026-08-10',
        ministry: 'Ministry of Defence',
        member: 'Hon. MP',
        minister: 'Raksha Rajya Mantri'
      }
    };

    const ms = extractMilestoneFromSourceItem(sansadItem, 'Tejas Mk1A');
    expect(ms).not.toBeNull();
    expect(ms?.entityId).toBe('tejas-mk1a');
    expect(ms?.date).toBe('2026-08-10');
    expect(ms?.isOfficial).toBe(true);
    expect(ms?.sourceTier).toBe(SourceTier.TIER_1_OFFICIAL);
    expect(ms?.budgetCrores).toBe(48000);
    expect(ms?.deliveryTimeline).toBe('March 2026');
    expect(ms?.iddmPercentage).toBe(65);
    expect(ms?.status).toBe('production');
  });
});

describe('LLM Living Dossier Pruner: Milestone Deduplication & Conflict Resolution', () => {
  const officialMilestone: EntityMilestone = {
    id: 'ms-official-1',
    entityId: 'amca',
    date: '2026-08-01',
    title: 'CCS Accords Approval for AMCA 5th Gen Fighter Prototype Development',
    summary: 'CCS cleared ₹15,000 Cr for 5 AMCA prototypes with first flight targeted by 2028.',
    sourceTier: SourceTier.TIER_1_OFFICIAL,
    sourceName: 'PIB Defence',
    sourceUrl: 'https://pib.gov.in/amca-ccs',
    isOfficial: true,
    budgetCrores: 15000,
    deliveryTimeline: '2028',
    status: 'sanctioned'
  };

  const mediaMilestone: EntityMilestone = {
    id: 'ms-media-1',
    entityId: 'amca',
    date: '2026-08-05',
    title: 'Cabinet Committee clears AMCA 5th-gen fighter project',
    summary: 'Government approves AMCA fighter development, prototype roll-out expected in 2030.',
    sourceTier: SourceTier.TIER_2_NATIONAL,
    sourceName: 'The Hindu',
    sourceUrl: 'https://thehindu.com/defence/amca',
    isOfficial: false,
    deliveryTimeline: '2030',
    status: 'sanctioned'
  };

  it('detects duplicate milestones across official and media coverage within 30 days', () => {
    expect(isDuplicateMilestone(officialMilestone, mediaMilestone)).toBe(true);
  });

  it('merges duplicate milestones preserving official sovereign source as primary', () => {
    const merged = mergeDuplicateMilestones(officialMilestone, mediaMilestone);
    expect(merged.isOfficial).toBe(true);
    expect(merged.sourceName).toBe('PIB Defence');
    expect(merged.budgetCrores).toBe(15000);
    expect(merged.deliveryTimeline).toBe('2028');
  });

  it('deduplicates a stream of multiple articles into clean sorted milestone list', () => {
    const raw = [mediaMilestone, officialMilestone];
    const deduplicated = deduplicateMilestones(raw);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]!.isOfficial).toBe(true);
  });

  it('resolves timeline conflicts by prioritizing official sworn statements and recording conflicts', () => {
    const unmergedMilestones: EntityMilestone[] = [
      officialMilestone,
      {
        ...mediaMilestone,
        date: '2026-06-01', // outside 30-day deduplication window
        title: 'Speculative Reports on AMCA First Flight Delay'
      }
    ];

    const { resolvedMilestones, conflicts } = resolveTimelineConflicts(unmergedMilestones);
    expect(resolvedMilestones.length).toBeGreaterThanOrEqual(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.field).toBe('deliveryTimeline');
    expect(conflicts[0]!.officialValue).toBe('2028');
    expect(conflicts[0]!.resolution).toContain('prioritized over speculative reports');
  });
});

describe('LLM Living Dossier Pruner: Canonical Synthesis & Batch Consolidation', () => {
  it('determines lifecycle status accurately based on latest milestone events', () => {
    const milestones: EntityMilestone[] = [
      {
        id: '1',
        entityId: 'zorawar',
        date: '2026-01-10',
        title: 'DAC Clears Zorawar Light Tank',
        summary: 'Sanctioned',
        sourceTier: SourceTier.TIER_1_OFFICIAL,
        sourceName: 'PIB MoD',
        sourceUrl: 'https://pib.gov.in/z1',
        isOfficial: true,
        status: 'sanctioned'
      },
      {
        id: '2',
        entityId: 'zorawar',
        date: '2026-07-15',
        title: 'DRDO Conducts High-Altitude Desert Trials of Zorawar Tank',
        summary: 'Successful firing trials',
        sourceTier: SourceTier.TIER_1_OFFICIAL,
        sourceName: 'DRDO Press',
        sourceUrl: 'https://drdo.gov.in/z2',
        isOfficial: true,
        status: 'trials'
      }
    ];

    expect(determineLifecycleStatus(milestones)).toBe('trials');
  });

  it('synthesizes complete canonical dossier with specifications and budget aggregation', () => {
    const milestones: EntityMilestone[] = [
      {
        id: 'ms-p75i',
        entityId: 'project-75i',
        date: '2026-08-20',
        title: 'MoD Selects Fuel-Cell AIP for Project 75I Submarines',
        summary: 'Strategic partnership cleared with ₹43,000 Cr budget and delivery timeline 2031.',
        sourceTier: SourceTier.TIER_1_OFFICIAL,
        sourceName: 'PIB MoD',
        sourceUrl: 'https://pib.gov.in/p75i',
        isOfficial: true,
        budgetCrores: 43000,
        deliveryTimeline: '2031',
        iddmPercentage: 60,
        status: 'sanctioned'
      }
    ];

    const dossier = synthesizeCanonicalDossier('Project 75I', 'navy', milestones);
    expect(dossier.id).toBe('project-75i');
    expect(dossier.name).toBe('Project 75I');
    expect(dossier.category).toBe('navy');
    expect(dossier.totalBudgetCrores).toBe(43000);
    expect(dossier.targetDeliveryDate).toBe('2031');
    expect(dossier.indigenousContentPercentage).toBe(60);
    expect(dossier.specifications).toContain('Estimated Budget: ₹43,000 Cr');
    expect(dossier.specifications).toContain('Target Timeline: 2031');
    expect(dossier.specifications).toContain('Indigenous Content: 60%');
    expect(dossier.summary).toContain('Project 75I');
  });

  it('batch consolidates multiple entity living dossiers idempotently', () => {
    const batch = [
      {
        name: 'AMCA',
        category: 'airforce' as const,
        milestones: [
          {
            id: 'm1',
            entityId: 'amca',
            date: '2026-05-01',
            title: 'AMCA Design Freeze',
            summary: 'DRDO completes design review',
            sourceTier: SourceTier.TIER_1_OFFICIAL,
            sourceName: 'DRDO',
            sourceUrl: 'https://drdo.gov.in/amca',
            isOfficial: true,
            status: 'development' as const
          }
        ]
      },
      {
        name: 'Zorawar',
        category: 'army' as const,
        milestones: [
          {
            id: 'm2',
            entityId: 'zorawar',
            date: '2026-06-01',
            title: 'Zorawar Track Trials',
            summary: 'Track trials completed',
            sourceTier: SourceTier.TIER_1_OFFICIAL,
            sourceName: 'PIB',
            sourceUrl: 'https://pib.gov.in/zorawar',
            isOfficial: true,
            status: 'trials' as const
          }
        ]
      }
    ];

    const dossiers = batchConsolidateLivingDossiers(batch);
    expect(Object.keys(dossiers)).toHaveLength(2);
    expect(dossiers['amca']?.lifecycleStatus).toBe('development');
    expect(dossiers['zorawar']?.lifecycleStatus).toBe('trials');
  });
});
