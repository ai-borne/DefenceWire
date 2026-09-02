/**
 * LLM Living Dossier & Timeline Pruner
 * Prunes raw milestones, deduplicates media claims, resolves conflicting timelines/budgets,
 * and synthesizes canonical sovereign defence platform dossiers.
 * Hard limit: <= 250 LOC.
 */

import { DomainCategory, StoryCluster, StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { sanitizePlainText } from '../src/utils/security.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { slugifyEntityName } from './entityHarvester.js';

export interface EntityMilestone {
  id: string;
  entityId: string;
  date: string;
  title: string;
  summary: string;
  sourceTier: SourceTier;
  sourceName: string;
  sourceUrl: string;
  isOfficial: boolean;
  program?: string;
  budgetCrores?: number;
  deliveryTimeline?: string;
  iddmPercentage?: number;
  status?: 'concept' | 'sanctioned' | 'development' | 'trials' | 'production' | 'induction' | 'operational' | 'delayed' | 'general';
}

export interface MilestoneConflict {
  field: string;
  officialValue?: string | number;
  mediaValues: Array<{ sourceName: string; value: string | number; date: string }>;
  resolution: string;
}

export interface CanonicalEntityDossier {
  id: string;
  name: string;
  category: DomainCategory;
  summary: string;
  specifications: string[];
  lifecycleStatus: 'concept' | 'sanctioned' | 'development' | 'trials' | 'production' | 'induction' | 'operational';
  totalBudgetCrores?: number;
  targetDeliveryDate?: string;
  indigenousContentPercentage?: number;
  milestones: EntityMilestone[];
  conflicts: MilestoneConflict[];
  lastUpdated: string;
}

export function extractBudgetFromString(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  if (!match?.[1]) return undefined;
  const val = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(val) ? undefined : val;
}

export function extractIddmFromString(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/(\d{1,3})%\s*(?:indigenous|iddm|indigenisation|local content)\b/i);
  if (!match?.[1]) return undefined;
  const val = parseInt(match[1], 10);
  return isNaN(val) || val < 0 || val > 100 ? undefined : val;
}

export function extractTimelineFromString(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/\b(?:by|in|from|target(?:ed)?(?:\s+(?:for|in|by))?|delivery:?|scheduled\s+(?:for|to\s+commence\s+by|by)?)\s*([A-Za-z]+\s+\d{4}|\d{4}-\d{2,4}|FY\s*\d{2,4}|\d{4})\b/i);
  return match?.[1]?.trim();
}

export function extractMilestoneFromSourceItem(item: StorySourceItem, entityName: string): EntityMilestone | null {
  if (!item || !entityName) return null;
  const entityId = slugifyEntityName(entityName);
  if (!entityId) return null;

  const isOfficial = item.tier === SourceTier.TIER_1_OFFICIAL || item.officialType === 'pib_mod' || Boolean(item.parliamentMeta);
  const text = `${item.title} ${item.snippet || ''}`;
  let status: EntityMilestone['status'] = 'general';
  const lower = text.toLowerCase();
  if (lower.includes('induct') || lower.includes('commission')) status = 'induction';
  else if (lower.includes('trial') || lower.includes('flight test')) status = 'trials';
  else if (lower.includes('ccs approval') || lower.includes('dac approval') || lower.includes('sanction')) status = 'sanctioned';
  else if (lower.includes('deliver') || lower.includes('rollout')) status = 'production';
  else if (lower.includes('delay')) status = 'delayed';

  return {
    id: `ms-${entityId}-${computeStableHash(item.url || item.id)}`,
    entityId,
    date: item.parliamentMeta?.answeringDate || item.publishedAt.split('T')[0] || new Date().toISOString().split('T')[0]!,
    title: sanitizePlainText(item.title),
    summary: sanitizePlainText(item.snippet || item.title),
    sourceTier: item.tier,
    sourceName: item.sourceName,
    sourceUrl: item.url,
    isOfficial,
    program: entityName,
    budgetCrores: extractBudgetFromString(text),
    deliveryTimeline: extractTimelineFromString(text),
    iddmPercentage: extractIddmFromString(text),
    status
  };
}

export function extractMilestonesFromCluster(cluster: StoryCluster, entityName: string): EntityMilestone[] {
  if (!cluster || !entityName) return [];
  const milestones: EntityMilestone[] = [];
  const primaryMs = extractMilestoneFromSourceItem(cluster.primarySource, entityName);
  if (primaryMs) milestones.push(primaryMs);
  for (const rel of cluster.relatedCoverage || []) {
    const ms = extractMilestoneFromSourceItem(rel, entityName);
    if (ms) milestones.push(ms);
  }
  return milestones;
}

export function isDuplicateMilestone(a: EntityMilestone, b: EntityMilestone): boolean {
  if (a.entityId !== b.entityId) return false;
  if (a.sourceUrl === b.sourceUrl && a.sourceUrl.length > 0) return true;
  const diffDays = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) {
    const wordsA = new Set(a.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const overlap = b.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && wordsA.has(w)).length;
    if (overlap >= 2) return true;
  }
  return false;
}

export function mergeDuplicateMilestones(primary: EntityMilestone, secondary: EntityMilestone): EntityMilestone {
  const canon = primary.isOfficial ? primary : secondary.isOfficial ? secondary : primary.sourceTier <= secondary.sourceTier ? primary : secondary;
  return {
    ...canon,
    budgetCrores: canon.budgetCrores ?? primary.budgetCrores ?? secondary.budgetCrores,
    deliveryTimeline: canon.deliveryTimeline ?? primary.deliveryTimeline ?? secondary.deliveryTimeline,
    iddmPercentage: canon.iddmPercentage ?? primary.iddmPercentage ?? secondary.iddmPercentage,
    status: canon.status !== 'general' ? canon.status : (secondary.status !== 'general' ? secondary.status : 'general')
  };
}

export function deduplicateMilestones(rawMilestones: EntityMilestone[]): EntityMilestone[] {
  const sorted = [...rawMilestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const deduplicated: EntityMilestone[] = [];
  for (const ms of sorted) {
    const idx = deduplicated.findIndex((d) => isDuplicateMilestone(d, ms));
    if (idx !== -1) deduplicated[idx] = mergeDuplicateMilestones(deduplicated[idx]!, ms);
    else deduplicated.push(ms);
  }
  return deduplicated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function resolveTimelineConflicts(milestones: EntityMilestone[]): { resolvedMilestones: EntityMilestone[]; conflicts: MilestoneConflict[] } {
  const resolvedMilestones = deduplicateMilestones(milestones);
  const conflicts: MilestoneConflict[] = [];
  const official = resolvedMilestones.filter((m) => m.isOfficial && m.deliveryTimeline);
  const media = resolvedMilestones.filter((m) => !m.isOfficial && m.deliveryTimeline);

  if (official.length > 0 && media.length > 0) {
    const latest = official[official.length - 1]!;
    const conflicting = media.filter((m) => m.deliveryTimeline !== latest.deliveryTimeline);
    if (conflicting.length > 0) {
      conflicts.push({
        field: 'deliveryTimeline',
        officialValue: latest.deliveryTimeline,
        mediaValues: conflicting.map((m) => ({ sourceName: m.sourceName, value: m.deliveryTimeline!, date: m.date })),
        resolution: `Official timeline '${latest.deliveryTimeline}' from ${latest.sourceName} prioritized over speculative reports.`
      });
    }
  }
  return { resolvedMilestones, conflicts };
}

export function determineLifecycleStatus(milestones: EntityMilestone[]): CanonicalEntityDossier['lifecycleStatus'] {
  if (milestones.length === 0) return 'concept';
  for (const ms of milestones.slice(-3).reverse()) {
    if (ms.status === 'operational' || ms.status === 'induction') return 'induction';
    if (ms.status === 'production') return 'production';
    if (ms.status === 'trials') return 'trials';
    if (ms.status === 'sanctioned') return 'sanctioned';
  }
  return 'development';
}

export function synthesizeCanonicalDossier(
  entityName: string,
  category: DomainCategory = 'tech',
  rawMilestones: EntityMilestone[] = []
): CanonicalEntityDossier {
  const id = slugifyEntityName(entityName);
  const { resolvedMilestones, conflicts } = resolveTimelineConflicts(rawMilestones);
  const lifecycleStatus = determineLifecycleStatus(resolvedMilestones);
  const budget = resolvedMilestones.find((m) => m.isOfficial && m.budgetCrores)?.budgetCrores ?? resolvedMilestones.find((m) => m.budgetCrores)?.budgetCrores;
  const targetDeliveryDate = resolvedMilestones.slice().reverse().find((m) => m.deliveryTimeline)?.deliveryTimeline;
  const iddmPercentage = resolvedMilestones.slice().reverse().find((m) => m.iddmPercentage)?.iddmPercentage;

  const specs: string[] = [];
  if (targetDeliveryDate) specs.push(`Target Timeline: ${targetDeliveryDate}`);
  if (budget) specs.push(`Estimated Budget: ₹${budget.toLocaleString('en-IN')} Cr`);
  if (iddmPercentage) specs.push(`Indigenous Content: ${iddmPercentage}%`);

  return {
    id,
    name: entityName,
    category,
    summary: resolvedMilestones.length > 0
      ? `Canonical timeline tracking ${entityName} with ${resolvedMilestones.length} verified milestone(s). Current status: ${lifecycleStatus.toUpperCase()}.`
      : `Dossier initialized for ${entityName}. Awaiting initial filings.`,
    specifications: specs,
    lifecycleStatus,
    totalBudgetCrores: budget,
    targetDeliveryDate,
    indigenousContentPercentage: iddmPercentage,
    milestones: resolvedMilestones,
    conflicts,
    lastUpdated: new Date().toISOString()
  };
}

export function batchConsolidateLivingDossiers(
  items: Array<{ name: string; category?: DomainCategory; milestones: EntityMilestone[] }>
): Record<string, CanonicalEntityDossier> {
  const result: Record<string, CanonicalEntityDossier> = {};
  for (const item of items) {
    result[slugifyEntityName(item.name)] = synthesizeCanonicalDossier(item.name, item.category || 'tech', item.milestones);
  }
  return result;
}
