/**
 * Cloudflare Pages Function: /api/curator/auth
 * Thin runtime adapter for Curator Desk authentication with Cloudflare Zero Trust recognition.
 * Hard limit: <= 300 LOC.
 */

import {
  handleCuratorAuthRequest,
  createSessionCookie,
  createClearSessionCookie,
  verifyCuratorAuthorization,
  sanitizeReturnUrl,
  CuratorAuthPayload
} from '../../../src/services/curatorAuthHandler.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';
import { STRINGS } from '../../../src/resources/strings.js';

interface PagesFunctionContext {
  request: Request;
  env: {
    CURATOR_PASSCODE_HASH?: string;
    CURATOR_SESSION_SECRET?: string;
    CURATOR_SESSION_EPOCH?: string;
    CURATOR_TEAM_DOMAIN?: string;
  };
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `curator_auth:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, error: STRINGS.errors.rateLimitExceeded },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  try {
    const payload = (await context.request.json()) as CuratorAuthPayload;
    const result = await handleCuratorAuthRequest(payload, context.env);

    if (!result.success || !result.cookie) {
      const isConfigError = result.error === STRINGS.errors.authConfigMissing || (!context.env.CURATOR_PASSCODE_HASH || !context.env.CURATOR_SESSION_SECRET);
      const status = isConfigError ? 500 : 401;
      return Response.json(
        { success: false, error: result.error || STRINGS.errors.authFailed },
        { status, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Set-Cookie', result.cookie);
    headers.set('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(rateLimitHeaders)) {
      headers.set(k, v);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const isHtmlNav = url.searchParams.get('redirect') === '1' || (context.request.headers.get('accept') || '').includes('text/html');
  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const epoch = context.env.CURATOR_SESSION_EPOCH;
  const authContext = await verifyCuratorAuthorization(
    context.request.headers,
    cookieHeader,
    secret,
    context.env.CURATOR_TEAM_DOMAIN,
    globalThis.fetch,
    epoch
  );

  if (isHtmlNav) {
    const returnUrl = sanitizeReturnUrl(url.searchParams.get('return_to'));
    const headers = new Headers();
    headers.set('Location', returnUrl);
    headers.set('Cache-Control', 'no-store');
    if (authContext.authorized && secret) {
      headers.set('Set-Cookie', await createSessionCookie(secret));
    }
    return new Response(null, {
      status: 302,
      headers
    });
  }

  return Response.json(
    {
      authenticated: authContext.authorized,
      userEmail: authContext.email || null,
      provider: authContext.provider
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

export async function onRequestDelete(): Promise<Response> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Set-Cookie', createClearSessionCookie());
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
    status: 200,
    headers
  });
}
