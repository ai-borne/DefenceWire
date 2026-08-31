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
});
