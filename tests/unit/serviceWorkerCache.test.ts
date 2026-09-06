/**
 * Unit Tests: Service Worker Cache Poisoning Prevention & Integrity
 * Verifies public/sw.js validates response.ok, status 200, and response types before caching.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Service Worker Cache Security & Cache Poisoning Prevention', () => {
  const rootDir = process.cwd();
  const swPath = path.join(rootDir, 'public/sw.js');

  it('verifies public/sw.js exists and is within LOC limits', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const content = fs.readFileSync(swPath, 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThanOrEqual(300);
  });

  it('verifies navigation handler validates response.ok and status 200 before caching', () => {
    const content = fs.readFileSync(swPath, 'utf-8');

    // Must check for navigation mode
    expect(content).toContain("event.request.mode === 'navigate'");

    // Must validate response.ok and status 200 before caching
    expect(content).toMatch(/response\.ok/);
    expect(content).toMatch(/response\.status === 200/);

    // Must disallow caching non-200 responses
    expect(content).toContain("caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))");
  });

  it('verifies static asset handler validates response.ok and basic/default type before caching', () => {
    const content = fs.readFileSync(swPath, 'utf-8');

    // Static asset fetch handler must check status and type
    expect(content).toMatch(/networkResponse\.ok/);
    expect(content).toMatch(/networkResponse\.status === 200/);
    expect(content).toMatch(/networkResponse\.type === 'basic'/);
  });

  it('verifies non-http/https requests are explicitly ignored by service worker fetch listener', () => {
    const content = fs.readFileSync(swPath, 'utf-8');
    expect(content).toContain("url.protocol !== 'http:' && url.protocol !== 'https:'");
  });

  it('excludes /data/ endpoints from the stale-while-revalidate cache, alongside /api/', () => {
    // Dynamic feed data (e.g. /data/news.json) must never be served from
    // Cache Storage: its freshness is governed server-side (Cache-Control +
    // the KV-vs-static comparison in functions/data/news.json.ts), and a
    // stale-while-revalidate SW entry has no expiry of its own, so once
    // cached it can outlive that fix indefinitely until a request happens
    // to refresh it in the background.
    const content = fs.readFileSync(swPath, 'utf-8');
    const apiGuardIndex = content.indexOf("url.pathname.startsWith('/api/')");
    const dataGuardIndex = content.indexOf("url.pathname.startsWith('/data/')");
    const returnAfterApiGuard = content.indexOf('return;', apiGuardIndex);

    expect(apiGuardIndex).toBeGreaterThan(-1);
    // The /data/ guard must be part of the *same* early-return condition as
    // /api/, not a separate/later check that could be skipped.
    expect(dataGuardIndex).toBeGreaterThan(apiGuardIndex);
    expect(dataGuardIndex).toBeLessThan(returnAfterApiGuard);
  });

  it('bypasses the fetch handler entirely (no caches.match/caches.open) for a /data/ request', () => {
    const content = fs.readFileSync(swPath, 'utf-8');
    const listenerStart = content.indexOf("self.addEventListener('fetch'");
    const fetchListener = content.slice(listenerStart);

    const events: Array<(event: unknown) => void> = [];
    const self = {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        if (type === 'fetch') events.push(handler);
      }
    };
    const caches = {
      match: () => {
        throw new Error('caches.match must not be called for /data/ requests');
      },
      open: () => {
        throw new Error('caches.open must not be called for /data/ requests');
      }
    };
    const fetch = () => {
      throw new Error('a bypassed request should hit the real network fetch, not this stub');
    };

    // eslint-disable-next-line no-new-func
    new Function('self', 'caches', 'fetch', fetchListener)(self, caches, fetch);
    const handler = events[0];
    expect(handler).toBeDefined();

    let respondWithCalled = false;
    handler!({
      request: { method: 'GET', url: 'https://www.defencewire.in/data/news.json', mode: 'cors' },
      respondWith: () => {
        respondWithCalled = true;
      }
    });

    expect(respondWithCalled).toBe(false);
  });
});
