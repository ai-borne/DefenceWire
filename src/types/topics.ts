/** Canonical-topic domain contracts. D1 is the runtime source of truth. */

export const TOPIC_TYPES = [
  'country', 'bilateral_relationship', 'person', 'office', 'military_service',
  'military_unit', 'organization', 'company', 'platform', 'programme',
  'location', 'facility', 'exercise', 'operation', 'alliance',
  'operational_theatre', 'conflict', 'technology', 'capability', 'strategic_theme'
] as const;

export type TopicType = typeof TOPIC_TYPES[number];
export type TopicStatus = 'provisional' | 'active' | 'deprecated' | 'merged';
export type TopicVerificationState = 'unverified' | 'provisional' | 'verified' | 'published' | 'rejected';
export type TopicAssignmentRole =
  | 'subject' | 'actor' | 'target' | 'operator' | 'location'
  | 'facility' | 'platform' | 'programme' | 'context';

export interface TopicRecord {
  id: string;
  displayName: string;
  displayHashtag: string;
  topicType: TopicType;
  description: string | null;
  status: TopicStatus;
  verificationState: TopicVerificationState;
  displayPriority: number;
  registryVersion: number;
  replacedByTopicId: string | null;
}

export interface TopicAliasRecord {
  normalizedAlias: string;
  topicId: string;
  aliasType: 'canonical' | 'acronym' | 'spelling' | 'former_name' | 'transliteration';
  requiresContext: boolean;
  contextRuleJson: string | null;
  verificationState: TopicVerificationState;
}

export interface TopicRelationRecord {
  sourceTopicId: string;
  relationType: 'related_to' | 'part_of' | 'operated_by' | 'located_in' | 'successor_to';
  targetTopicId: string;
  confidence: number;
  verificationState: TopicVerificationState;
}

export interface TopicImplicationRuleRecord {
  sourceTopicId: string;
  impliedTopicId: string;
  requiredContextJson: string;
  maximumDepth: number;
  verificationState: TopicVerificationState;
}

export interface TopicRegistrySnapshot {
  registryVersion: number;
  topics: TopicRecord[];
  aliases: TopicAliasRecord[];
  relations: TopicRelationRecord[];
  implicationRules: TopicImplicationRuleRecord[];
}
