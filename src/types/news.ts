/**
 * Core News, Clustering, and SSB Intelligence Data Contracts
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from './source.js';

export interface StorySourceItem {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceDomain: string;
  tier: SourceTier;
  publishedAt: string; // ISO 8601 string
  snippet?: string;
  author?: string;
  isPrimary?: boolean;
}

export interface DiscussionQuote {
  id: string;
  author: string;
  handleOrTitle: string;
  quote: string;
  url?: string;
  sourcePlatform: 'X/Twitter' | 'Substack' | 'ThinkTank' | 'PressBriefing';
}

export interface DefenceTechTakeaway {
  platformOrSystem: string; // e.g. "Tejas Mk1A", "Project 75I", "AMCA"
  specifications: string[];
  indigenousContentPercentage?: number;
  keySignificance: string;
}

export interface SSBIntelligence {
  whyItMatters: string;
  defenceTechTakeaway?: DefenceTechTakeaway;
  strategicAngle?: string;
  // Populated only for clusters editorially tagged with the 'ssb' category —
  // rendered as an opt-in insight box, not shown in the default article summary.
  gdLecturettePoints?: string[];
  potentialInterviewQuestions?: string[];
}

export type DomainCategory =
  | 'army'
  | 'navy'
  | 'airforce'
  | 'tech'
  | 'strategic'
  | 'procurement'
  | 'ssb';

export interface StoryCluster {
  id: string;
  synthesizedHeadline: string;
  primarySource: StorySourceItem;
  relatedCoverage: StorySourceItem[];
  discussions: DiscussionQuote[];
  ssbIntel?: SSBIntelligence;
  categories: DomainCategory[];
  entities: string[];
  defenceScore: number;
  isLeadStory: boolean;
  isEditorPromoted?: boolean;
  isIgnored?: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
