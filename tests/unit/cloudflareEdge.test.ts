/**
 * Unit Test: Cloudflare Pages Edge Deployment & Production Configuration
 * Verifies CNAME, _headers security/caching policies, _routes.json, _redirects, and Vite base config.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Cloudflare Pages Edge & Production Deployment Configuration', () => {
  const rootDir = process.cwd();

  it('verifies public/CNAME is correctly configured for www.defencewire.in', () => {
    const cnamePath = path.join(rootDir, 'public/CNAME');
    expect(fs.existsSync(cnamePath)).toBe(true);
    const content = fs.readFileSync(cnamePath, 'utf-8').trim();
    expect(content).toBe('www.defencewire.in');
  });

  it('verifies public/_headers defines strict CSP, HSTS, and caching headers', () => {
    const headersPath = path.join(rootDir, 'public/_headers');
    expect(fs.existsSync(headersPath)).toBe(true);
    const content = fs.readFileSync(headersPath, 'utf-8');

    // Security headers
    expect(content).toContain('Content-Security-Policy:');
    expect(content).toContain('X-Frame-Options: DENY');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Strict-Transport-Security:');

    // 1-year immutable caching on static assets
    expect(content).toContain('/assets/*');
    expect(content).toContain('Cache-Control: public, max-age=31536000, immutable');

    // Stale-while-revalidate on news.json
    expect(content).toContain('/data/news.json');
    expect(content).toContain('stale-while-revalidate=300');

    // Immediate revalidation on sw.js
    expect(content).toContain('/sw.js');
    expect(content).toContain('must-revalidate');
  });

  it('verifies public/_routes.json contains valid SPA exclusion rules', () => {
    const routesPath = path.join(rootDir, 'public/_routes.json');
    expect(fs.existsSync(routesPath)).toBe(true);
    const raw = fs.readFileSync(routesPath, 'utf-8');
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(1);
    expect(parsed.include).toContain('/*');
    expect(parsed.exclude).toContain('/assets/*');
    expect(parsed.exclude).toContain('/data/*');
  });

  it('verifies public/_redirects provides SPA 200 rewrite fallback', () => {
    const redirectsPath = path.join(rootDir, 'public/_redirects');
    expect(fs.existsSync(redirectsPath)).toBe(true);
    const content = fs.readFileSync(redirectsPath, 'utf-8');
    expect(content).toContain('/*    /index.html   200');
  });

  it('verifies vite.config.ts configures base: "/" for SPA deep-linking and edge routing', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    const content = fs.readFileSync(viteConfigPath, 'utf-8');
    expect(content).toContain("base: '/'");
  });

  it('verifies dist/index.html (if built) never uses relative asset or manifest paths', () => {
    const distIndexPath = path.join(rootDir, 'dist/index.html');
    if (fs.existsSync(distIndexPath)) {
      const html = fs.readFileSync(distIndexPath, 'utf-8');
      expect(html).not.toMatch(/src=["']\.\/assets\//);
      expect(html).not.toMatch(/href=["']\.\/assets\//);
      expect(html).not.toMatch(/href=["']\.\/manifest\.json["']/);
      expect(html).toMatch(/src=["']\/assets\//);
      expect(html).toMatch(/href=["']\/manifest\.json["']/);
    }
  });

  it('verifies .github/workflows/crawl-and-deploy.yml has hourly off-peak cron and test execution', () => {
    const workflowPath = path.join(rootDir, '.github/workflows/crawl-and-deploy.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const content = fs.readFileSync(workflowPath, 'utf-8');

    expect(content).toContain("cron: '17 * * * *'");
    expect(content).toContain('npm test');
    expect(content).toContain('npx vite-node crawler/ingest.ts');
    expect(content).toContain('npm run build');
    expect(content).toContain('npx wrangler pages deploy dist --project-name=defencewire');
  });
});
