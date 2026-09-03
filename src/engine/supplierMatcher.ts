/**
 * Supplier <-> Wire Story Matcher (Phase 2.7)
 * Mirrors engine/programMatcher.ts's compiled-regex approach so the Supplier
 * Dossier's "Live Wire Mentions" tab can surface real coverage instead of a
 * permanent empty state, matching on the currently loaded live feed clusters
 * the same way Programs already does — no server round-trip.
 * Hard limit: <= 300 LOC.
 */

import { ALL_SUPPLIERS } from '../data/suppliers/seedSuppliers.js';
import { SupplierProfile } from '../types/suppliers.js';
import { StoryCluster } from '../types/news.js';

export interface CompiledSupplierMatcher {
  supplier: SupplierProfile;
  regex: RegExp;
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function buildPatternForSupplier(supplier: SupplierProfile): string {
  const terms = new Set<string>();
  for (const candidate of [supplier.name, ...(supplier.aliases || [])]) {
    const clean = (candidate || '').trim();
    if (clean.length > 2) terms.add(clean);
  }
  const patterns = Array.from(terms).map(escapeForRegex);
  return `\\b(?:${patterns.join('|')})\\b`;
}

const COMPILED_MATCHERS: CompiledSupplierMatcher[] = ALL_SUPPLIERS.map((supplier) => ({
  supplier,
  regex: new RegExp(buildPatternForSupplier(supplier), 'i')
}));

export function getCompiledSupplierMatchers(): CompiledSupplierMatcher[] {
  return COMPILED_MATCHERS;
}

/** Matches all known suppliers mentioned in the provided text. */
export function matchSuppliersInText(text: string): SupplierProfile[] {
  if (!text || typeof text !== 'string') return [];
  return COMPILED_MATCHERS.filter((m) => m.regex.test(text)).map((m) => m.supplier);
}

function clusterText(cluster: StoryCluster): string {
  const parts = [cluster.synthesizedHeadline || ''];
  if (cluster.primarySource) {
    if (cluster.primarySource.title) parts.push(cluster.primarySource.title);
    if (cluster.primarySource.snippet) parts.push(cluster.primarySource.snippet);
  }
  if (cluster.entities && cluster.entities.length > 0) parts.push(cluster.entities.join(' '));
  return parts.join(' ');
}

/** Live feed clusters mentioning the given supplier by name or a known alias. */
export function getRelatedStoriesForSupplier(
  supplierId: string,
  clusters: StoryCluster[]
): StoryCluster[] {
  if (!supplierId || !clusters || clusters.length === 0) return [];
  const matcher = COMPILED_MATCHERS.find((m) => m.supplier.id === supplierId);
  if (!matcher) return [];
  return clusters.filter((cluster) => matcher.regex.test(clusterText(cluster)));
}
