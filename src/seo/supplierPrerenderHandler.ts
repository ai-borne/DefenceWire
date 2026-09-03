/**
 * Supplier Dossier Prerender Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind Cloudflare Pages Function at functions/supplier/[id].ts.
 * Injects OpenGraph, Twitter, Schema.org Corporation JSON-LD, and static semantic HTML
 * for social/search bots while regular users receive the client SPA.
 * Hard limit: <= 300 LOC. Target: < 70 LOC.
 */

import { SupplierProfile } from '../types/suppliers.js';
import { buildSupplierMetaDocument, parseSupplierIdFromPath } from './supplierMeta.js';
import { injectStoryMetaIntoHtml } from './htmlMetaInjector.js';
import { isSocialMediaCrawler } from './socialCrawlerDetection.js';
import { getSupplierBySlug, ALL_SUPPLIERS } from '../data/suppliers/seedSuppliers.js';
import { HtmlDocumentResponse } from './programPrerenderHandler.js';

export interface SupplierPrerenderRequest {
  userAgent: string | null;
  url: string;
}

export interface SupplierPrerenderDependencies {
  fetchOriginHtml: () => Promise<HtmlDocumentResponse>;
  getSupplier?: (slug: string) => SupplierProfile | undefined;
}

function resolveSupplier(slug: string): SupplierProfile | undefined {
  const direct = getSupplierBySlug(slug);
  if (direct) return direct;
  return ALL_SUPPLIERS.find((s) => s.id === slug || s.aliases?.some((a) => a.toLowerCase() === slug.toLowerCase()));
}

export async function handleSupplierPrerenderRequest(
  request: SupplierPrerenderRequest,
  deps: SupplierPrerenderDependencies
): Promise<HtmlDocumentResponse> {
  if (!isSocialMediaCrawler(request.userAgent)) {
    return deps.fetchOriginHtml();
  }

  const requestUrl = new URL(request.url);
  const rawSlug = parseSupplierIdFromPath(requestUrl.pathname);
  const originHtml = await deps.fetchOriginHtml();
  if (!rawSlug) return originHtml;

  const supplierResolver = deps.getSupplier ?? resolveSupplier;
  const supplier = supplierResolver(rawSlug);
  if (!supplier) return originHtml;

  const meta = buildSupplierMetaDocument(supplier);

  return {
    ...originHtml,
    body: injectStoryMetaIntoHtml(originHtml.body, meta)
  };
}
