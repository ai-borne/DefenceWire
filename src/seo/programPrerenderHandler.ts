/**
 * Program Dossier Prerender Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind Cloudflare Pages Function at functions/program/[id].ts.
 * Injects OpenGraph, Twitter, Schema.org JSON-LD, and static semantic HTML
 * for social/search bots while regular users receive the client SPA.
 * Hard limit: <= 300 LOC. Target: < 100 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { OrbatUnit } from '../types/orbat.js';
import { buildProgramMetaDocument, parseProgramIdFromPath } from './programMeta.js';
import { injectStoryMetaIntoHtml } from './htmlMetaInjector.js';
import { isSocialMediaCrawler } from './socialCrawlerDetection.js';
import { getProgramById, findProgramByAlias } from '../data/strategicPrograms.js';
import { getOrbatByProgramId } from '../data/orbat/programOrbatData.js';

export interface HtmlDocumentResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ProgramPrerenderRequest {
  userAgent: string | null;
  url: string;
}

export interface ProgramPrerenderDependencies {
  fetchOriginHtml: () => Promise<HtmlDocumentResponse>;
  getProgram?: (id: string) => StrategicProgram | undefined;
  getOrbatUnits?: (programId: string) => OrbatUnit[];
}

export async function handleProgramPrerenderRequest(
  request: ProgramPrerenderRequest,
  deps: ProgramPrerenderDependencies
): Promise<HtmlDocumentResponse> {
  if (!isSocialMediaCrawler(request.userAgent)) {
    return deps.fetchOriginHtml();
  }

  const requestUrl = new URL(request.url);
  const rawId = parseProgramIdFromPath(requestUrl.pathname);
  const originHtml = await deps.fetchOriginHtml();
  if (!rawId) return originHtml;

  const programResolver = deps.getProgram ?? ((id: string) => getProgramById(id) ?? findProgramByAlias(id));
  const orbatResolver = deps.getOrbatUnits ?? getOrbatByProgramId;

  const program = programResolver(rawId);
  if (!program) return originHtml;

  const orbatUnits = orbatResolver(program.id);
  const meta = buildProgramMetaDocument(program, orbatUnits);

  return {
    ...originHtml,
    body: injectStoryMetaIntoHtml(originHtml.body, meta)
  };
}
