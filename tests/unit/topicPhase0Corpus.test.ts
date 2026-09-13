/**
 * Phase 0 topic corpus and baseline contract tests.
 * These tests protect the reviewed business examples without implementing the classifier.
 * Hard limit: <= 300 LOC.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  calculateTopicBaseline,
  extractThreadSeedMetrics,
  normalizeObservedTag
} from '../../scripts/topic-baseline.mjs';

type EvidenceKind = 'exact' | 'inferred';
type Importance = 'core' | 'secondary';

interface ExpectedTopic {
  topicId: string;
  role: string;
  evidenceKind: EvidenceKind;
  evidence: string;
  importance: Importance;
}

interface CorpusCase {
  id: string;
  headline: string;
  snippet: string;
  eligible: boolean;
  expectedTopics: ExpectedTopic[];
  rejectedTopicIds: string[];
  duplicateGroup?: string;
  sourceOwnerKey?: string;
}

interface Corpus {
  schemaVersion: number;
  reviewStatus: string;
  cases: CorpusCase[];
  stabilityScenarios: Array<{ id: string; rule: string }>;
}

const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/topics/classification-corpus.json');
const corpus = JSON.parse(readFileSync(fixturePath, 'utf8')) as Corpus;
const byId = new Map(corpus.cases.map((testCase) => [testCase.id, testCase]));

function topicIds(testCase: CorpusCase): string[] {
  return testCase.expectedTopics.map((topic) => topic.topicId).sort();
}

function coreTopicIds(testCase: CorpusCase): string[] {
  return testCase.expectedTopics
    .filter((topic) => topic.importance === 'core')
    .map((topic) => topic.topicId)
    .sort();
}

describe('Phase 0 reviewed classification corpus', () => {
  it('is versioned, accepted, and contains unique case identifiers', () => {
    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.reviewStatus).toBe('accepted-phase-0');
    expect(new Set(corpus.cases.map((testCase) => testCase.id)).size).toBe(corpus.cases.length);
  });

  it('contains every required positive, negative, alias, ambiguity, and stability scenario', () => {
    const requiredCases = [
      'lac-explicit-talks',
      'lac-kibithu-context',
      'lac-nsa-negotiations',
      'lac-black-substring-negative',
      'lac-kibithu-tourism-negative',
      'iran-us-jordan-airbase-attack',
      'us-aircraft-jordan-base-operation',
      'iran-historical-background-negative',
      'us-alias-usa',
      'us-alias-dotted',
      'us-alias-short-contextual',
      'us-alias-full',
      'su57-alias-compact',
      'su57-alias-hyphen',
      'su57-alias-manufacturer',
      'jaguar-aircraft-context',
      'jaguar-company-context',
      'jaguar-ordinary-word-context',
      'loc-whole-word-negative',
      'akash-transliteration-diacritic',
      'renamed-programme-frcv'
    ];
    expect(requiredCases.every((id) => byId.has(id))).toBe(true);

    const scenarioIds = new Set(corpus.stabilityScenarios.map((scenario) => scenario.id));
    expect(scenarioIds).toEqual(new Set([
      'unchanged-rerun',
      'primary-source-change',
      'cluster-merge',
      'cluster-split',
      'correction-and-retraction',
      'model-output-disagreement'
    ]));
  });

  it('grounds every exact annotation in source text and every inference in a named rule', () => {
    for (const testCase of corpus.cases) {
      const sourceText = `${testCase.headline} ${testCase.snippet}`.normalize('NFKC').toLowerCase();
      for (const topic of testCase.expectedTopics) {
        if (topic.evidenceKind === 'exact') {
          expect(sourceText, `${testCase.id}: missing exact evidence ${topic.evidence}`)
            .toContain(topic.evidence.normalize('NFKC').toLowerCase());
        } else {
          expect(topic.evidence, `${testCase.id}: unnamed implication`).toMatch(/^rule:[a-z0-9-]+$/);
        }
      }
    }
  });

  it('never both accepts and rejects the same topic for one case', () => {
    for (const testCase of corpus.cases) {
      const accepted = new Set(topicIds(testCase));
      expect(accepted.size).toBe(testCase.expectedTopics.length);
      expect(new Set(testCase.rejectedTopicIds).size).toBe(testCase.rejectedTopicIds.length);
      expect(testCase.rejectedTopicIds.filter((topicId) => accepted.has(topicId))).toEqual([]);
    }
  });

  it('converges United States and Su-57 spellings on one canonical topic ID', () => {
    const usCases = ['us-alias-usa', 'us-alias-dotted', 'us-alias-short-contextual', 'us-alias-full'];
    const su57Cases = ['su57-alias-compact', 'su57-alias-hyphen', 'su57-alias-manufacturer'];
    expect(usCases.map((id) => topicIds(byId.get(id)!))).toEqual(usCases.map(() => ['united-states']));
    expect(su57Cases.map((id) => topicIds(byId.get(id)!))).toEqual(su57Cases.map(() => ['su-57']));
  });

  it('keeps incidental and substring matches out of effective topics', () => {
    expect(byId.get('lac-black-substring-negative')!.rejectedTopicIds).toContain('lac');
    expect(byId.get('lac-kibithu-tourism-negative')!.rejectedTopicIds).toContain('lac');
    expect(byId.get('iran-historical-background-negative')!.rejectedTopicIds).toContain('iran');
    expect(byId.get('loc-whole-word-negative')!.rejectedTopicIds).toContain('loc');
  });

  it('gives syndicated copies identical core topics but one editorial owner', () => {
    const copies = corpus.cases.filter((testCase) => testCase.duplicateGroup === 'pralay-export-report');
    expect(copies).toHaveLength(2);
    expect(coreTopicIds(copies[0]!)).toEqual(coreTopicIds(copies[1]!));
    expect(new Set(copies.map((testCase) => testCase.sourceOwnerKey))).toEqual(new Set(['wire-example']));
  });
});

describe('Phase 0 baseline calculator', () => {
  it('measures tags, variants, truncation visibility, threads, and orphans deterministically', () => {
    const news = {
      generatedAt: '2026-09-01T00:00:00Z',
      totalIngested: 4,
      totalFiltered: 3,
      clusters: [
        {
          id: 'cluster-a', primaryTag: 'Su-57', hashtags: ['Su57'],
          primarySource: { url: 'https://a.example/story' }, relatedCoverage: []
        },
        {
          id: 'cluster-b', hashtags: [],
          primarySource: { url: 'https://b.example/story' }, relatedCoverage: []
        }
      ],
      river: [
        { url: 'https://a.example/story' },
        { url: 'https://b.example/story' },
        { url: 'https://c.example/omitted' }
      ]
    };
    const seed = extractThreadSeedMetrics(
      "INSERT OR REPLACE INTO story_threads (id) VALUES ('thread-a');\n" +
      "INSERT OR REPLACE INTO story_thread_events (id, thread_id, cluster_id) VALUES ('event-a', 'thread-a', 'cluster-a');"
    );

    expect(calculateTopicBaseline(news, seed)).toMatchObject({
      retainedClusterCount: 2,
      taggedClusterCount: 1,
      taggedClusterPercentage: 50,
      observedTagSpellingCount: 2,
      normalizedObservedTopicCount: 1,
      extraObservedTagVariantCount: 1,
      observableArticlesExcludedFromRetainedClusters: 1,
      threadCount: 1,
      eventCount: 1,
      threadedRetainedClusterCount: 1,
      orphanRetainedClusterCount: 1
    });
  });

  it('uses measurement-only punctuation and diacritic folding without claiming linguistic alias resolution', () => {
    expect(normalizeObservedTag('#Sukhoi Su-57')).toBe('sukhoisu57');
    expect(normalizeObservedTag('Sukhoi-Su57')).toBe('sukhoisu57');
    expect(normalizeObservedTag('Ākāś-NG')).toBe('akasng');
  });
});
