/**
 * Fast Strategic Defence Program Matcher & Auto-Linking Engine (MOAT 2)
 * Pre-compiled regex linking for news clusters, wire feeds, and parliament questions.
 * Hard limit: <= 300 LOC.
 */

import { ALL_STRATEGIC_PROGRAMS } from '../data/strategicPrograms.js';
import { StrategicProgram } from '../types/programs.js';
import { ParliamentQuestionMeta, StoryCluster, StorySourceItem } from '../types/news.js';

export interface CompiledProgramMatcher {
  program: StrategicProgram;
  regex: RegExp;
}

function buildPatternForProgram(prog: StrategicProgram): string {
  const terms = new Set<string>();

  const candidates = [
    prog.name,
    prog.shortName,
    ...prog.searchAliases
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (candidate.length > 2) {
      terms.add(candidate);
    }

    const parenMatches = candidate.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const pm of parenMatches) {
        const inner = pm.slice(1, -1).trim();
        if (inner.length > 2) terms.add(inner);
      }
    }

    const withoutParen = candidate.replace(/\([^)]+\)/g, '').trim();
    if (withoutParen.length > 2) {
      terms.add(withoutParen);
    }

    if (candidate.includes('/')) {
      const parts = candidate.split('/');
      for (const part of parts) {
        const trimmed = part.replace(/\([^)]+\)/g, '').trim();
        if (trimmed.length > 2) {
          terms.add(trimmed);
        }
      }
    }
  }

  const patterns: string[] = [];
  for (const term of terms) {
    const escaped = term
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+')
      .replace(/-/g, '[-\\s]?');
    patterns.push(escaped);
  }

  return `\\b(?:${patterns.join('|')})\\b`;
}

const COMPILED_MATCHERS: CompiledProgramMatcher[] = ALL_STRATEGIC_PROGRAMS.map((prog) => ({
  program: prog,
  regex: new RegExp(buildPatternForProgram(prog), 'i')
}));

export function getCompiledProgramMatchers(): CompiledProgramMatcher[] {
  return COMPILED_MATCHERS;
}

/**
 * Matches all strategic defence programs mentioned in the provided text.
 */
export function matchProgramsInText(text: string): StrategicProgram[] {
  if (!text || typeof text !== 'string') return [];
  const matches: StrategicProgram[] = [];

  for (const matcher of COMPILED_MATCHERS) {
    if (matcher.regex.test(text)) {
      matches.push(matcher.program);
    }
  }

  return matches;
}

/**
 * Returns distinct program IDs matched in the provided text.
 */
export function matchProgramIds(text: string): string[] {
  const programs = matchProgramsInText(text);
  return Array.from(new Set(programs.map((p) => p.id)));
}

/**
 * Links a story cluster (or draft story) to strategic programs based on headline, source, and entities.
 */
export function linkStoryToPrograms(story: {
  synthesizedHeadline: string;
  primarySource?: StorySourceItem;
  entities?: string[];
}): string[] {
  const parts: string[] = [story.synthesizedHeadline || ''];

  if (story.primarySource) {
    if (story.primarySource.title) parts.push(story.primarySource.title);
    if (story.primarySource.snippet) parts.push(story.primarySource.snippet);
    if (story.primarySource.parliamentMeta?.subject) parts.push(story.primarySource.parliamentMeta.subject);
  }

  if (story.entities && story.entities.length > 0) {
    parts.push(story.entities.join(' '));
  }

  const combinedText = parts.join(' ');
  return matchProgramIds(combinedText);
}

/**
 * Links a sworn parliamentary question (Lok Sabha / Rajya Sabha) to strategic defence programs.
 */
export function linkParliamentQuestionToPrograms(
  meta: ParliamentQuestionMeta,
  title?: string,
  snippet?: string
): string[] {
  const parts: string[] = [
    meta.subject || '',
    meta.ministry || '',
    title || '',
    snippet || ''
  ];
  const combinedText = parts.filter(Boolean).join(' ');
  return matchProgramIds(combinedText);
}

/**
 * Retrieves all story clusters associated with a specific strategic program ID.
 */
export function getRelatedStoriesForProgram(
  programId: string,
  clusters: StoryCluster[]
): StoryCluster[] {
  if (!programId || !clusters || clusters.length === 0) return [];

  return clusters.filter((cluster) => {
    if (cluster.programTags && cluster.programTags.includes(programId)) {
      return true;
    }
    const derived = linkStoryToPrograms(cluster);
    return derived.includes(programId);
  });
}
