/**
 * Cloudflare Pages Function: /api/curator/auth
 * Thin runtime adapter for Curator Desk authentication with Cloudflare Zero Trust recognition.
 * Hard limit: <= 300 LOC.
 */

import {
  handleCuratorAuthRequest,
  createClearSessionCookie,
  verifyCuratorAuthorization,
  CuratorAuthPayload
} from '../../../src/services/curatorAuthHandler.js';

interface PagesFunctionContext {
  request: Request;
  env: {
    CURATOR_PASSCODE_HASH?: string;
    CURATOR_SESSION_SECRET?: string;
  };
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  try {
    const payload = (await context.request.json()) as CuratorAuthPayload;
    const result = await handleCuratorAuthRequest(payload, context.env);

    if (!result.success || !result.cookie) {
      return Response.json({ success: false, error: result.error || 'Authentication failed' }, { status: 401 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Set-Cookie', result.cookie);
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const isHtmlNav = url.searchParams.get('redirect') === '1' || (context.request.headers.get('accept') || '').includes('text/html');

  if (isHtmlNav) {
    const returnUrl = url.searchParams.get('return_to') || '/#curator';
    return new Response(null, {
      status: 302,
      headers: {
        Location: returnUrl,
        'Cache-Control': 'no-store'
      }
    });
  }

  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const authContext = await verifyCuratorAuthorization(context.request.headers, cookieHeader, secret);

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
