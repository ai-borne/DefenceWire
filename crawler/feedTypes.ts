/**
 * Feed Configuration Types and Helper Utilities
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';

export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  domain: string;
  tier: SourceTier;
  defaultCategory: DomainCategory;
  enabled: boolean;
  timeoutMs?: number;
}
