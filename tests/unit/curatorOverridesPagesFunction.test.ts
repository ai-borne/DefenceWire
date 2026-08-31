/**
 * Unit Tests: Cloudflare Pages Function /api/curator/overrides
 * Verifies onRequestGet, onRequestPost, and onRequestDelete handlers including PII redaction on unauthenticated reads.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet, onRequestPost, onRequestDelete } from '../../functions/api/curator/overrides.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/overrides', () => {
  const secret = 'curator-test-secret-2026';

  it('redacts curator_email from overrides when GET request is unauthenticated', async () => {
    const mockRows = [
      {
        id: 'cluster-amca',
        override_type: 'promote',
        payload_json: '{"isLead":true}',
        updated_at: '2026-08-31T12:00:00Z',
        curator_email: 'analyst@defencewire.in'
      }
    ];

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRows })
      })
    };

    const request = new Request('http://localhost:5176/api/curator/overrides');
    const response = await onRequestGet({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: Array<{ id: string; curator_email?: string }> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe('cluster-amca');
    expect(body.data[0]?.curator_email).toBeUndefined();
  });

  it('includes curator_email in overrides when GET request has valid curator session cookie', async () => {
    const mockRows = [
      {
        id: 'cluster-amca',
        override_type: 'promote',
        payload_json: '{"isLead":true}',
        updated_at: '2026-08-31T12:00:00Z',
        curator_email: 'analyst@defencewire.in'
      }
    ];

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRows })
      })
    };

    const validCookie = await createSessionCookie(secret, 3600);
    const request = new Request('http://localhost:5176/api/curator/overrides', {
      headers: { cookie: validCookie }
    });

    const response = await onRequestGet({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: Array<{ id: string; curator_email?: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.curator_email).toBe('analyst@defencewire.in');
  });

  it('returns 503 if D1 database is not configured on GET', async () => {
    const request = new Request('http://localhost:5176/api/curator/overrides');
    const response = await onRequestGet({ request, env: {} });
    expect(response.status).toBe(503);
  });

  it('rejects POST override creation with 401 when unauthenticated', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'cluster-1', overrideType: 'promote', payload: {} })
    });

    const response = await onRequestPost({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(401);
  });

  it('allows POST override creation with 200 when authenticated with valid session', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    };

    const validCookie = await createSessionCookie(secret, 3600);
    const request = new Request('http://localhost:5176/api/curator/overrides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: validCookie
      },
      body: JSON.stringify({ id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } })
    });

    const response = await onRequestPost({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { id: string; curatorEmail: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('cluster-1');
  });

  it('rejects DELETE override with 401 when unauthenticated', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/overrides?id=cluster-1', {
      method: 'DELETE'
    });

    const response = await onRequestDelete({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(401);
  });

  it('allows DELETE override with 200 when authenticated with valid session', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    };

    const validCookie = await createSessionCookie(secret, 3600);
    const request = new Request('http://localhost:5176/api/curator/overrides?id=cluster-1', {
      method: 'DELETE',
      headers: { cookie: validCookie }
    });

    const response = await onRequestDelete({
      request,
      env: { DB: mockDb as unknown as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('cluster-1');
  });
});
