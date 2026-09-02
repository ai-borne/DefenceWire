/**
 * Sansad Parliament Q&A Scraper & Primary Source Connector
 * Ingests official Lok Sabha and Rajya Sabha Defence Questions and sworn answers.
 * Hard limit: <= 300 LOC.
 */

import { ParliamentQuestionMeta, StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { decodeHtmlEntities, isValidUrl, sanitizePlainText } from '../src/utils/security.js';
import { cleanStorySnippet } from '../src/utils/snippetCleaner.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { isSafeFeedUrl, MAX_FEED_BYTES, readStreamWithLimit } from './parser.js';

export interface SansadRawQuestion {
  house?: string;
  questionNo?: string | number;
  type?: string;
  date?: string;
  ministry?: string;
  minister?: string;
  member?: string;
  subject?: string;
  answer?: string;
  pdfUrl?: string;
  url?: string;
}

export function normalizeSansadDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().split('T')[0]!;
  }
  const clean = dateStr.trim();
  const dmyMatch = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1]!;
  }
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0]!;
  }
  return new Date().toISOString().split('T')[0]!;
}

export function normalizeQuestionNumber(rawQNo: string | number, type: 'Starred' | 'Unstarred' = 'Unstarred'): string {
  const str = String(rawQNo ?? '').trim();
  const prefixMatch = str.match(/^(?:USQ|AU|Unstarred)\s*(\d+)$/i);
  if (prefixMatch) return `USQ ${prefixMatch[1]}`;

  const sqMatch = str.match(/^(?:SQ|AS|Starred)\s*(\d+)$/i);
  if (sqMatch) return `SQ ${sqMatch[1]}`;

  const numMatch = str.match(/\b(\d+)\b/);
  if (numMatch) {
    const prefix = type === 'Starred' ? 'SQ' : 'USQ';
    return `${prefix} ${numMatch[1]}`;
  }
  return str || (type === 'Starred' ? 'SQ 0' : 'USQ 0');
}

function normalizeMinistry(rawMin?: string): string {
  if (!rawMin) return 'Ministry of Defence';
  const clean = sanitizePlainText(rawMin);
  if (/^defence$/i.test(clean) || /^mod$/i.test(clean)) return 'Ministry of Defence';
  return clean.startsWith('Ministry of') ? clean : `Ministry of ${clean}`;
}

export function parseSansadQuestionObject(
  raw: SansadRawQuestion,
  defaultHouse: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha'
): StorySourceItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawHouse = String(raw.house || '').toLowerCase();
  const house: 'Lok Sabha' | 'Rajya Sabha' = rawHouse.includes('rajya') ? 'Rajya Sabha' : defaultHouse;
  const rawType = String(raw.type || '').toLowerCase();
  const questionType: 'Starred' | 'Unstarred' = rawType.includes('starred') && !rawType.includes('unstarred')
    ? 'Starred'
    : 'Unstarred';

  const qNum = normalizeQuestionNumber(raw.questionNo ?? '', questionType);
  const answeringDate = normalizeSansadDate(raw.date || '');
  const ministry = normalizeMinistry(raw.ministry);
  const member = raw.member ? sanitizePlainText(raw.member) : undefined;
  const minister = raw.minister ? sanitizePlainText(raw.minister) : undefined;
  const cleanSubject = sanitizePlainText(raw.subject || 'Parliamentary Defence Question');
  const cleanAnswer = cleanStorySnippet(raw.answer || '', 300);

  const rawNumOnly = qNum.replace(/^[A-Z]+\s*/, '');
  const title = `${house} ${questionType} Question No. ${rawNumOnly}: ${cleanSubject}`;
  const pdfUrl = raw.pdfUrl && isValidUrl(raw.pdfUrl) ? raw.pdfUrl : undefined;
  const directUrl = raw.url && isValidUrl(raw.url) ? raw.url : pdfUrl || 'https://sansad.in';

  const parliamentMeta: ParliamentQuestionMeta = {
    house,
    questionNumber: qNum,
    questionType,
    answeringDate,
    ministry,
    member,
    minister,
    subject: cleanSubject,
    pdfUrl
  };

  const houseSlug = house === 'Lok Sabha' ? 'lok-sabha' : 'rajya-sabha';
  const qSlug = qNum.toLowerCase().replace(/\s+/g, '-');
  const id = `src-sansad-${houseSlug}-${qSlug}-${computeStableHash(directUrl)}`;

  return {
    id,
    title,
    url: directUrl,
    sourceName: house === 'Lok Sabha' ? 'Lok Sabha Secretariat' : 'Rajya Sabha Secretariat',
    sourceDomain: 'sansad.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: `${answeringDate}T09:00:00Z`,
    snippet: cleanAnswer || `${ministry} sworn written answer tabled in ${house}.`,
    isPrimary: true,
    officialType: house === 'Lok Sabha' ? 'lok_sabha' : 'rajya_sabha',
    parliamentMeta
  };
}

export function parseSansadJsonPayload(
  payload: unknown,
  defaultHouse: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha'
): StorySourceItem[] {
  if (!payload) return [];
  let data: unknown = payload;

  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch {
      return [];
    }
  }

  const rawList = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null
      ? (data as { data?: unknown[]; items?: unknown[]; questions?: unknown[] }).data ||
        (data as { items?: unknown[] }).items ||
        (data as { questions?: unknown[] }).questions ||
        []
      : [];

  const items: StorySourceItem[] = [];
  for (const raw of rawList) {
    const item = parseSansadQuestionObject(raw as SansadRawQuestion, defaultHouse);
    if (item) items.push(item);
  }
  return items;
}

export function parseSansadXmlFeed(
  xmlContent: string,
  defaultHouse: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha'
): StorySourceItem[] {
  if (!xmlContent || typeof xmlContent !== 'string') return [];
  const items: StorySourceItem[] = [];
  const itemMatches = xmlContent.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const block of itemMatches) {
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = block.match(/<pubDate[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
    const pdfMatch = block.match(/url=["']([^"']+\.pdf)["']/i);

    const rawTitle = titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1]) : '';
    const rawLink = linkMatch?.[1] ? decodeHtmlEntities(linkMatch[1].trim()) : '';
    const rawDesc = descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : '';
    const rawPubDate = pubDateMatch?.[1] ? pubDateMatch[1].trim() : '';

    if (!rawTitle) continue;

    const house: 'Lok Sabha' | 'Rajya Sabha' = rawTitle.toLowerCase().includes('rajya')
      ? 'Rajya Sabha'
      : defaultHouse;
    const isStarred = /starred/i.test(rawTitle) && !/unstarred/i.test(rawTitle);
    const numMatch = rawTitle.match(/(?:Question|Q\.?|No\.?|USQ|SQ)\s*(\d+)/i) || rawDesc.match(/Question No:\s*([A-Z0-9]+)/i);

    const rawQuestion: SansadRawQuestion = {
      house,
      questionNo: numMatch?.[1] || '0',
      type: isStarred ? 'Starred' : 'Unstarred',
      date: rawPubDate,
      ministry: 'Ministry of Defence',
      subject: rawTitle.replace(/^.*?(?:Question\s*(?:No\.?)?\s*\d+:?\s*)/i, ''),
      answer: rawDesc,
      pdfUrl: pdfMatch?.[1],
      url: rawLink || pdfMatch?.[1]
    };

    const parsed = parseSansadQuestionObject(rawQuestion, defaultHouse);
    if (parsed) items.push(parsed);
  }

  return items;
}

export async function fetchSansadDefenceQuestions(options: {
  house?: 'Lok Sabha' | 'Rajya Sabha';
  endpointUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
} = {}): Promise<StorySourceItem[]> {
  const house = options.house || 'Lok Sabha';
  const url =
    options.endpointUrl ||
    (house === 'Lok Sabha'
      ? 'https://sansad.in/api/ls/questions?ministry=defence'
      : 'https://sansad.in/api/rs/questions?ministry=defence');

  if (!isSafeFeedUrl(url)) return [];

  const fetcher = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetcher(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DefenceWire/1.0 (Official Sansad Ingestion; +https://defencewire.in)',
        Accept: 'application/json, application/rss+xml, text/xml;q=0.9, */*;q=0.8'
      }
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const text = await readStreamWithLimit(res, MAX_FEED_BYTES);
    if (!text) return [];

    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return parseSansadJsonPayload(trimmed, house);
    }
    return parseSansadXmlFeed(trimmed, house);
  } catch {
    clearTimeout(timer);
    return [];
  }
}
