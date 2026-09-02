/**
 * Cookie-Jar Session Client for NIC eProcurement Portals (defproc/eprocure)
 * Hand-rolled around native fetch — no new dependency, matches the repo's
 * native-fetch-only philosophy. defproc.gov.in issues a JSESSIONID cookie on
 * first GET (verified live, no captcha on that route) that must be replayed
 * on subsequent requests to stay in the same session.
 * Hard limit: <= 300 LOC.
 */

import { isSafeFeedUrl } from './parser.js';

export interface TenderFetchResult {
  ok: boolean;
  status: number;
  body: string;
  captchaDetected: boolean;
}

/** Parses one or more `Set-Cookie` header values into `name=value` pairs (attributes discarded). */
export function parseSetCookiePairs(setCookieValues: string[]): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const raw of setCookieValues) {
    if (!raw) continue;
    const firstPart = raw.split(';')[0]?.trim();
    if (!firstPart) continue;
    const eq = firstPart.indexOf('=');
    if (eq <= 0) continue;
    const name = firstPart.slice(0, eq).trim();
    const value = firstPart.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
  return jar;
}

/** Serializes a cookie jar into a `Cookie` header value. */
export function serializeCookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/** True if the response body shows the portal's known captcha-gate string (Layer for the circuit breaker). */
export function detectCaptchaGate(body: string): boolean {
  if (!body) return false;
  return /enter\s*captcha/i.test(body) || /provide\s*captcha/i.test(body);
}

export class TenderSessionClient {
  private jar: Record<string, string> = {};
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: { fetchFn?: typeof fetch; timeoutMs?: number } = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  getCookieHeader(): string {
    return serializeCookieHeader(this.jar);
  }

  private captureSetCookie(response: Response): void {
    const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const values = typeof getSetCookie === 'function'
      ? getSetCookie.call(response.headers)
      : [response.headers.get('set-cookie')].filter((v): v is string => !!v);
    if (values.length === 0) return;
    Object.assign(this.jar, parseSetCookiePairs(values));
  }

  async fetch(
    url: string,
    init: { method?: 'GET' | 'POST'; body?: string; extraHeaders?: Record<string, string> } = {}
  ): Promise<TenderFetchResult> {
    if (!isSafeFeedUrl(url)) {
      return { ok: false, status: 0, body: '', captchaDetected: false };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const cookieHeader = this.getCookieHeader();
      const response = await this.fetchFn(url, {
        method: init.method || 'GET',
        body: init.body,
        signal: controller.signal,
        headers: {
          'User-Agent': 'DefenceWire/1.0 (Tender Ingestion; +https://defencewire.in)',
          Accept: 'text/html,application/xhtml+xml',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(init.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...(init.extraHeaders || {})
        }
      });
      clearTimeout(timer);

      this.captureSetCookie(response);
      const body = await response.text();
      return { ok: response.ok, status: response.status, body, captchaDetected: detectCaptchaGate(body) };
    } catch {
      clearTimeout(timer);
      return { ok: false, status: 0, body: '', captchaDetected: false };
    }
  }
}
