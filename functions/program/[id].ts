/**
 * Cloudflare Pages Function: /program/:id social-crawler prerender.
 * Thin runtime adapter only — delegates to src/seo/programPrerenderHandler.ts.
 * Hard limit: <= 300 LOC.
 */

import { handleProgramPrerenderRequest } from '../../src/seo/programPrerenderHandler.js';
import type { HtmlDocumentResponse } from '../../src/seo/programPrerenderHandler.js';

interface PagesFunctionContext {
  request: Request;
  next: () => Promise<Response>;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const result = await handleProgramPrerenderRequest(
    {
      userAgent: context.request.headers.get('user-agent'),
      url: context.request.url
    },
    {
      fetchOriginHtml: async (): Promise<HtmlDocumentResponse> => {
        const originResponse = await context.next();
        return {
          status: originResponse.status,
          headers: headersToRecord(originResponse.headers),
          body: await originResponse.text()
        };
      }
    }
  );

  const headers = new Headers(result.headers);
  headers.delete('content-length');

  return new Response(result.body, { status: result.status, headers });
}
