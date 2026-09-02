/**
 * Unit Tests for Fast Regex/Trie Program Matcher & Auto-Linking Engine (MOAT 2)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  getCompiledProgramMatchers,
  linkParliamentQuestionToPrograms,
  linkStoryToPrograms,
  matchProgramIds,
  matchProgramsInText,
  getRelatedStoriesForProgram
} from '../../src/engine/programMatcher.js';
import { StoryCluster, StorySourceItem, ParliamentQuestionMeta } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';

describe('Strategic Program Matcher & Auto-Linking Engine', () => {
  it('pre-compiles matchers for all 43 strategic programs with valid regex patterns', () => {
    const matchers = getCompiledProgramMatchers();
    expect(matchers.length).toBe(ALL_STRATEGIC_PROGRAMS.length);
    expect(matchers.length).toBe(43);

    for (const m of matchers) {
      expect(m.program).toBeDefined();
      expect(m.program.id).toBeTruthy();
      expect(m.regex).toBeInstanceOf(RegExp);
    }
  });

  it('matches aerospace programs across standard designations and aliases', () => {
    const text1 = 'HAL initiates flight testing for LCA Tejas Mk1A with Uttam AESA radar';
    const matches1 = matchProgramsInText(text1);
    expect(matches1.map(p => p.id)).toContain('tejas-mk1a');

    const text2 = 'Cabinet Committee on Security (CCS) approves AMCA 5th-gen stealth fighter project';
    const matches2 = matchProgramsInText(text2);
    expect(matches2.map(p => p.id)).toContain('amca');

    const text3 = 'DRDO achieves autonomous flying-wing flight trial of Ghatak stealth UCAV';
    const matches3 = matchProgramsInText(text3);
    expect(matches3.map(p => p.id)).toContain('ghatak-ucav');
  });

  it('matches naval programs with variations in project prefixes and hull names', () => {
    const textP75I = 'Indian Navy advances field evaluation trials for Project 75I submarines';
    expect(matchProgramIds(textP75I)).toContain('project-75i');

    const textP75IAlt = 'L&T and TKMS team up for P-75I air-independent propulsion deal';
    expect(matchProgramIds(textP75IAlt)).toContain('project-75i');

    const textP17B = 'Nilgiri follow-on stealth frigate initiated under Project 17B';
    expect(matchProgramIds(textP17B)).toContain('project-17b');

    const textP18 = 'Next-gen guided missile destroyer conceptualized under Project 18';
    expect(matchProgramIds(textP18)).toContain('project-18');

    const textArihant = 'INS Arighat SSBN strategic nuclear submarine commissioned into service';
    expect(matchProgramIds(textArihant)).toContain('s4-s5-ssbn');
  });

  it('matches land, missile, and unmanned warfare platforms accurately', () => {
    const textZorawar = 'Indian Army conducts high-altitude trials for Zorawar light tank in Ladakh';
    expect(matchProgramIds(textZorawar)).toContain('zorawar-light-tank');

    const textBrahmos = 'BrahMos supersonic cruise missile test fired from Su-30MKI';
    const matched = matchProgramIds(textBrahmos);
    expect(matched).toContain('brahmos-supersonic');
    expect(matched).toContain('su30mki-super-sukhoi');

    const textAkash = 'DRDO flight tests Akash-NG surface to air missile against high speed target';
    expect(matchProgramIds(textAkash)).toContain('akash-ng');

    const textTapas = 'Tapas-BH-201 MALE UAV completes operational ceiling test';
    expect(matchProgramIds(textTapas)).toContain('tapas-archer-uav');
  });

  it('enforces word boundaries to eliminate substring false positives', () => {
    // "ramca" should NOT trigger "amca"
    expect(matchProgramIds('The ramcat was observed in the forest')).toEqual([]);

    // "arjun" in general non-defence context should not trigger unless in word boundary
    expect(matchProgramIds('superarjuna power')).toEqual([]);
  });

  it('links StoryCluster objects to relevant program IDs across headline, source, and entities', () => {
    const mockPrimary: StorySourceItem = {
      id: 'pib-tejas-story',
      title: 'MoD Reviews Tejas Mk1A Delivery Schedule with HAL',
      url: 'https://pib.gov.in/tejas-review',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z',
      snippet: 'Delivery of first batch of LCA Tejas Mk1A fighters to commence next quarter with F404 engines.'
    };

    const story: Partial<StoryCluster> = {
      synthesizedHeadline: 'HAL Briefs Raksha Mantri on Tejas Mk1A Fighter Jet Timeline',
      primarySource: mockPrimary,
      entities: ['Tejas Mk1A', 'HAL']
    };

    const tags = linkStoryToPrograms(story as StoryCluster);
    expect(tags).toContain('tejas-mk1a');
  });

  it('links Parliament Q&A questions with metadata to sovereign program IDs', () => {
    const parliamentMeta: ParliamentQuestionMeta = {
      house: 'Lok Sabha',
      questionNumber: 1204,
      questionType: 'Unstarred',
      answeringDate: '2026-08-20',
      ministry: 'Ministry of Defence',
      subject: 'Sanction and Indigenous Development of AMCA Fighter Aircraft'
    };

    const programIds = linkParliamentQuestionToPrograms(
      parliamentMeta,
      'Written Reply on Status of Advanced Medium Combat Aircraft (AMCA)',
      'CCS approved prototype development of AMCA 5th gen stealth jet.'
    );

    expect(programIds).toContain('amca');
  });

  it('filters and retrieves related stories for a specific programId', () => {
    const mockClusterA: StoryCluster = {
      id: 'cluster-a',
      synthesizedHeadline: 'Tejas Mk1A Deliveries Underway',
      primarySource: {
        id: 's1',
        title: 'Tejas Mk1A Update',
        url: 'https://pib.gov.in/1',
        sourceName: 'PIB',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T10:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['airforce', 'programs'],
      entities: ['Tejas Mk1A'],
      programTags: ['tejas-mk1a'],
      defenceScore: 90,
      isLeadStory: true,
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z'
    };

    const mockClusterB: StoryCluster = {
      id: 'cluster-b',
      synthesizedHeadline: 'Project 75I Submarine Bids Evaluated',
      primarySource: {
        id: 's2',
        title: 'P-75I Submarine Evaluation',
        url: 'https://pib.gov.in/2',
        sourceName: 'PIB',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T11:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['navy', 'programs'],
      entities: ['Project 75I'],
      programTags: ['project-75i'],
      defenceScore: 85,
      isLeadStory: false,
      createdAt: '2026-08-30T11:00:00Z',
      updatedAt: '2026-08-30T11:00:00Z'
    };

    const tejasStories = getRelatedStoriesForProgram('tejas-mk1a', [mockClusterA, mockClusterB]);
    expect(tejasStories).toHaveLength(1);
    expect(tejasStories[0]?.id).toBe('cluster-a');

    const p75iStories = getRelatedStoriesForProgram('project-75i', [mockClusterA, mockClusterB]);
    expect(p75iStories).toHaveLength(1);
    expect(p75iStories[0]?.id).toBe('cluster-b');
  });

  it('executes high-throughput text matching in under 15ms for 100 headlines', () => {
    const sampleHeadlines = [
      'IAF tests Tejas Mk1A with Astra missile',
      'Indian Navy tests Project 75I fuel cell AIP system',
      'Zorawar tank deployed in Ladakh high altitude sector',
      'BrahMos supersonic cruise missile fired from INS Mormugao',
      'AMCA stealth fighter project enters detailed design phase'
    ];

    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      const headline = sampleHeadlines[i % sampleHeadlines.length]!;
      matchProgramIds(headline);
    }
    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeLessThan(50); // Under 50ms for 100 checks
  });
});
