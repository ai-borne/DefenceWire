import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { FeedConfig } from './feedTypes.js';

export interface IngestOptions {
  feeds?: FeedConfig[];
  maxAgeHours?: number;
  maxClusters?: number;
  outputPath?: string | null;
  geminiApiKey?: string;
  fetchFn?: typeof fetch;
  existingClusters?: StoryCluster[];
  existingRiver?: StorySourceItem[];
  includeSeedClusters?: boolean;
  /** Allows focused callers to exercise legacy integrations without durable storage. */
  enableDurableIngestion?: boolean;
  /** Reference clock for freshness/clustering; tests pin it to dodge fake-timer drift. */
  now?: Date;
}

export interface IngestResult {
  clusters: StoryCluster[];
  river: StorySourceItem[];
  totalIngested: number;
  totalFiltered: number;
  activeFeedsCount: number;
  durationMs: number;
  generatedAt: string;
}
