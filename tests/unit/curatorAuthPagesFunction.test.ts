/**
 * Unit Tests: Cloudflare Pages Function /api/curator/auth
 * Verifies onRequestGet, onRequestPost, and onRequestDelete handlers including Open Redirect mitigation.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost, onRequestDelete } from '../../functions/api/curator/auth.js';
import { sha256Hex } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/auth', () => {
  it('redirects safely with sanitized Location header when malicious return_to is passed', async () => {
    const request = new Request('http://localhost:5176/api/curator/auth?redirect=1&return_to=https://evil.com');
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/#curator');
  });

  it('preserves valid relative return_to destination on redirect', async () => {
    const request = new Request('http://localhost:5176/api/curator/auth?redirect=1&return_to=/archive');
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/archive');
  });

  it('rejects protocol-relative open redirect attacks', async () => {
    const request = new Request('http://localhost:5176/api/curator/auth?redirect=1&return_to=//attacker.com');
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/#curator');
  });

  it('returns JSON status response when accept header is application/json without redirect param', async () => {
    const request = new Request('http://localhost:5176/api/curator/auth', {
      headers: { accept: 'application/json' }
    });
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { authenticated: boolean; userEmail: string | null; provider: string };
    expect(body.authenticated).toBe(false);
    expect(body.userEmail).toBeNull();
    expect(body.provider).toBe('none');
  });

  it('processes valid login POST request and issues session cookie', async () => {
    const passcode = 'testPasscode2026';
    const hash = await sha256Hex(passcode);
    const request = new Request('http://localhost:5176/api/curator/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, remember: true })
    });

    const response = await onRequestPost({
      request,
      env: { CURATOR_PASSCODE_HASH: hash, CURATOR_SESSION_SECRET: 'test-secret' }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('dw_curator_session=v1.');
  });

  it('rejects invalid login POST request with HTTP 401', async () => {
    const request = new Request('http://localhost:5176/api/curator/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'wrongPasscode' })
    });

    const response = await onRequestPost({
      request,
      env: { CURATOR_PASSCODE_HASH: 'known-hash', CURATOR_SESSION_SECRET: 'test-secret' }
    });

    expect(response.status).toBe(401);
  });

  it('processes DELETE request and clears session cookie', async () => {
    const response = await onRequestDelete();

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
