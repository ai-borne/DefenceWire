/**
 * Core News, Clustering, and SSB Intelligence Data Contracts
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from './source.js';

export interface ParliamentQuestionMeta {
  house: 'Lok Sabha' | 'Rajya Sabha';
  questionNumber: string | number;
  questionType: 'Starred' | 'Unstarred';
  answeringDate: string; // ISO 8601 or YYYY-MM-DD
  ministry: string;
  member?: string;
  minister?: string;
  subject?: string;
  pdfUrl?: string;
}

export type OfficialSourceType = 'lok_sabha' | 'rajya_sabha' | 'pib_mod' | 'tender' | 'idex';

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
  imageUrl?: string;
  isPrimary?: boolean;
  parliamentMeta?: ParliamentQuestionMeta;
  officialType?: OfficialSourceType;
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
  budgetCrores?: number;
  deliveryTimeline?: string;
  programTag?: string;
  equipmentType?: string;
  foreignOem?: string;
}

export interface SSBIntelligence {
  whyItMatters: string;
  defenceTechTakeaway?: DefenceTechTakeaway;
  strategicAngle?: string;
  // Populated only for clusters editorially tagged with the 'ssb' category —
  // rendered as an opt-in insight box, not shown in the default article summary.
  gdLecturettePoints?: string[];
  potentialInterviewQuestions?: string[];
  // Which pipeline produced this brief — lets the UI label deterministic
  // extractive-miner output distinctly from free-form LLM analysis.
  provenance?: 'gemini' | 'cloudflare-ai' | 'extractive';
}

export type DomainCategory =
  | 'official'
  | 'programs'
  | 'tenders'
  | 'idex'
  | 'tech'
  | 'strategic'
  | 'procurement'
  | 'ssb'
  | 'army'
  | 'navy'
  | 'airforce';

export interface StoryCluster {
  id: string;
  synthesizedHeadline: string;
  primarySource: StorySourceItem;
  relatedCoverage: StorySourceItem[];
  discussions: DiscussionQuote[];
  ssbIntel?: SSBIntelligence;
  categories: DomainCategory[];
  entities: string[];
  programTags?: string[];
  defenceScore: number;
  isLeadStory: boolean;
  isEditorPromoted?: boolean;
  isIgnored?: boolean;
  isDeleted?: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

