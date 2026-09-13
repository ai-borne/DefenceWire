/** Maps parameterized D1 registry reads into domain records. */
import { D1Statement } from '../archive/d1QueryBuilder.js';
import {
  TopicAliasRecord, TopicImplicationRuleRecord, TopicRecord,
  TopicRegistrySnapshot, TopicRelationRecord, TopicType
} from '../types/topics.js';
import {
  buildLoadTopicAliasesStatement, buildLoadTopicImplicationsStatement,
  buildLoadTopicRegistryStatement, buildLoadTopicRelationsStatement,
  buildResolveTopicRedirectStatement
} from './topicQueryBuilder.js';

interface TopicRow extends Record<string, unknown> {
  id: string; display_name: string; display_hashtag: string; topic_type: TopicType;
  description: string | null; status: TopicRecord['status'];
  verification_state: TopicRecord['verificationState']; display_priority: number;
  registry_version: number; replaced_by_topic_id: string | null;
}

interface AliasRow extends Record<string, unknown> {
  normalized_alias: string; topic_id: string; alias_type: TopicAliasRecord['aliasType'];
  requires_context: number; context_rule_json: string | null;
  verification_state: TopicAliasRecord['verificationState'];
}

interface RelationRow extends Record<string, unknown> {
  source_topic_id: string; relation_type: TopicRelationRecord['relationType'];
  target_topic_id: string; confidence: number;
  verification_state: TopicRelationRecord['verificationState'];
}

interface ImplicationRow extends Record<string, unknown> {
  source_topic_id: string; implied_topic_id: string; required_context_json: string;
  maximum_depth: number; verification_state: TopicImplicationRuleRecord['verificationState'];
}

export interface TopicRegistryReader {
  batch(statements: D1Statement[]): Promise<Record<string, unknown>[][]>;
  first<T extends Record<string, unknown>>(sql: string, params: unknown[]): Promise<T | null>;
}

export function normalizeTopicAlias(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
    .replace(/[.‐‑‒–—−]/g, '-').replace(/[_\s-]+/g, ' ').trim();
}

export async function loadTopicRegistry(reader: TopicRegistryReader): Promise<TopicRegistrySnapshot> {
  const [topicRowsRaw, aliasRowsRaw, relationRowsRaw, implicationRowsRaw] = await reader.batch([
    buildLoadTopicRegistryStatement(), buildLoadTopicAliasesStatement(),
    buildLoadTopicRelationsStatement(), buildLoadTopicImplicationsStatement()
  ]);
  const topicRows = topicRowsRaw as TopicRow[];
  const aliasRows = aliasRowsRaw as AliasRow[];
  const relationRows = relationRowsRaw as RelationRow[];
  const implicationRows = implicationRowsRaw as ImplicationRow[];
  const topics = topicRows.map(mapTopicRow);
  const aliases = aliasRows.map((row) => ({
    normalizedAlias: row.normalized_alias,
    topicId: row.topic_id,
    aliasType: row.alias_type,
    requiresContext: row.requires_context === 1,
    contextRuleJson: row.context_rule_json,
    verificationState: row.verification_state
  }));
  return {
    registryVersion: topics.reduce((max, topic) => Math.max(max, topic.registryVersion), 0),
    topics,
    aliases,
    relations: relationRows.map((row) => ({
      sourceTopicId: row.source_topic_id, relationType: row.relation_type,
      targetTopicId: row.target_topic_id, confidence: row.confidence,
      verificationState: row.verification_state
    })),
    implicationRules: implicationRows.map((row) => ({
      sourceTopicId: row.source_topic_id, impliedTopicId: row.implied_topic_id,
      requiredContextJson: row.required_context_json, maximumDepth: row.maximum_depth,
      verificationState: row.verification_state
    }))
  };
}

export async function resolveTopicRedirect(reader: TopicRegistryReader, topicId: string): Promise<string | null> {
  const stmt = buildResolveTopicRedirectStatement(topicId);
  const row = await reader.first<{ id: string }>(stmt.sql, stmt.params);
  return row?.id ?? null;
}

function mapTopicRow(row: TopicRow): TopicRecord {
  return {
    id: row.id, displayName: row.display_name, displayHashtag: row.display_hashtag,
    topicType: row.topic_type, description: row.description, status: row.status,
    verificationState: row.verification_state, displayPriority: row.display_priority,
    registryVersion: row.registry_version, replacedByTopicId: row.replaced_by_topic_id
  };
}
