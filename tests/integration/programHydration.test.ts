/**
 * Integration Tests for MOAT 2 Live Feed Hydration & E2E Validation
 * Verifies live crawled cluster linking, 43-program database integrity & zero-empty-state hydration.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAllPrograms, getProgramDomainStats } from '../../src/data/strategicPrograms.js';
import { ProgramsViewModel } from '../../src/viewmodels/ProgramsViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { linkStoryToPrograms, getRelatedStoriesForProgram } from '../../src/engine/programMatcher.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Integration: MOAT 2 Live Feed Hydration & 43 Program Integrity', () => {
  let newsVm: NewsViewModel;
  let programsVm: ProgramsViewModel;

  beforeEach(() => {
    newsVm = new NewsViewModel();
    programsVm = new ProgramsViewModel(newsVm);
  });

  it('should verify all 43 strategic programs exist with valid attributes and domain coverage', () => {
    const programs = getAllPrograms();
    expect(programs.length).toBe(43);

    const stats = getProgramDomainStats();
    expect(stats.total).toBe(43);
    expect(stats.aerospace).toBe(11);
    expect(stats.naval).toBe(9);
    expect(stats.land).toBe(8);
    expect(stats.missiles).toBe(10);
    expect(stats.unmanned).toBe(5);

    for (const p of programs) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.shortName).toBeTruthy();
      expect(p.domain).toBeTruthy();
      expect(p.serviceBranch).toBeTruthy();
      expect(p.leadAgency).toBeTruthy();
      expect(p.stage).toBeTruthy();
      expect(p.summary).toBeTruthy();
      expect(p.searchAliases.length).toBeGreaterThan(0);
      expect(p.keySubsystems.length).toBeGreaterThan(0);
    }
  });

  it('should auto-link incoming wire stories to programs and hydrate program cards dynamically', () => {
    const liveSampleClusters: StoryCluster[] = [
      {
        id: 'live-cluster-amca-stealth',
        synthesizedHeadline: 'CCS Accords ₹15,000 Cr Sanction for AMCA 5th-Gen Stealth Fighter Full Scale Engineering Development',
        primarySource: {
          id: 'src-amca-01',
          title: 'CCS Accords Sanction for AMCA 5th-Gen Stealth Fighter Prototype Fabrication',
          url: 'https://pib.gov.in/amca-ccs-approval',
          sourceName: 'PIB (MoD)',
          sourceDomain: 'pib.gov.in',
          tier: SourceTier.TIER_1_OFFICIAL,
          publishedAt: '2026-09-02T08:00:00Z',
          isPrimary: true
        },
        relatedCoverage: [],
        discussions: [],
        categories: ['official', 'programs', 'tech'],
        entities: ['AMCA', 'DRDO', 'CCS Approval'],
        programTags: ['amca'],
        defenceScore: 92,
        isLeadStory: true,
        createdAt: '2026-09-02T08:00:00Z',
        updatedAt: '2026-09-02T08:00:00Z'
      },
      {
        id: 'live-cluster-atags-export',
        synthesizedHeadline: 'Armenia Operationalizes First Regiments of Indigenous ATAGS 155mm Towed Howitzers',
        primarySource: {
          id: 'src-atags-01',
          title: 'Armenia Deploys Indian ATAGS Howitzers on Border Defense Grid',
          url: 'https://thehindu.com/atags-export-armenia',
          sourceName: 'The Hindu',
          sourceDomain: 'thehindu.com',
          tier: SourceTier.TIER_2_NATIONAL,
          publishedAt: '2026-09-02T09:00:00Z',
          isPrimary: true
        },
        relatedCoverage: [],
        discussions: [],
        categories: ['programs', 'army'],
        entities: ['ATAGS'],
        defenceScore: 81,
        isLeadStory: false,
        createdAt: '2026-09-02T09:00:00Z',
        updatedAt: '2026-09-02T09:00:00Z'
      }
    ];

    newsVm.setClusters(liveSampleClusters);

    // AMCA program linked via explicit programTags
    const amcaRelated = programsVm.getProgramRelatedClusters('amca');
    expect(amcaRelated.length).toBe(1);
    expect(amcaRelated[0]?.id).toBe('live-cluster-amca-stealth');
    expect(programsVm.getProgramNewsCount('amca')).toBe(1);

    // ATAGS program linked via auto NLP matcher
    const atagsRelated = programsVm.getProgramRelatedClusters('atags');
    expect(atagsRelated.length).toBe(1);
    expect(atagsRelated[0]?.id).toBe('live-cluster-atags-export');
    expect(programsVm.getProgramNewsCount('atags')).toBe(1);
  });

  it('should accurately associate parliamentary Q&As to target strategic programs', () => {
    const questionCluster: StoryCluster = {
      id: 'cluster-parliament-tedbf-qa',
      synthesizedHeadline: 'MoD Clarifies Twin Engine Deck Based Fighter (TEDBF) Flight Test Schedule for INS Vikrant',
      primarySource: {
        id: 'src-sansad-tedbf',
        title: 'Lok Sabha Starred Question No. 112: Development of TEDBF for Navy Indigenous Aircraft Carriers',
        url: 'https://sansad.in/ls/questions/tedbf-iac',
        sourceName: 'Lok Sabha Secretariat',
        sourceDomain: 'sansad.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-01T10:00:00Z',
        officialType: 'lok_sabha',
        parliamentMeta: {
          house: 'Lok Sabha',
          questionNumber: 'SQ 112',
          questionType: 'Starred',
          answeringDate: '2026-09-01',
          ministry: 'Ministry of Defence',
          minister: 'Raksha Mantri',
          subject: 'Indigenous Twin Engine Deck Based Fighter (TEDBF) Prototype Development',
          pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/SQ112.pdf'
        },
        isPrimary: true
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['official', 'programs', 'navy'],
      entities: ['TEDBF', 'INS Vikrant', 'MoD'],
      defenceScore: 88,
      isLeadStory: false,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z'
    };

    const linkedIds = linkStoryToPrograms(questionCluster);
    expect(linkedIds).toContain('tedbf');

    newsVm.setClusters([questionCluster]);
    const tedbfRelated = getRelatedStoriesForProgram('tedbf', [questionCluster]);
    expect(tedbfRelated.length).toBe(1);
    expect(tedbfRelated[0]?.primarySource.parliamentMeta?.questionNumber).toBe('SQ 112');
  });
});
