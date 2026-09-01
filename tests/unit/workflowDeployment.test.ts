/**
 * Unit Test: Workflow CI/CD Deployment & Cloudflare Automation Guardrails
 * Verifies direct wrangler pages deploy configuration, CI path-filtering, and build-output consistency.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Workflow CI/CD Deployment & Automation Guardrails', () => {
  const rootDir = process.cwd();

  it('verifies .github/workflows/crawl-and-deploy.yml has direct Cloudflare Pages deployment step', () => {
    const workflowPath = path.join(rootDir, '.github/workflows/crawl-and-deploy.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const content = fs.readFileSync(workflowPath, 'utf-8');

    // Direct Cloudflare Pages deploy
    expect(content).toContain('npx wrangler pages deploy dist --project-name=defencewire');
    expect(content).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(content).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');

    // Concurrency group to avoid overlapping runs
    expect(content).toContain('concurrency:');
    expect(content).toContain('group: crawl-and-deploy');
    expect(content).toContain('cancel-in-progress: false');

    // Autonomous schedule and triggers
    expect(content).toContain("cron: '*/20 * * * *'");
    expect(content).toContain('workflow_dispatch:');
    expect(content).toContain('push:');

    // Pipeline steps sequence
    expect(content).toContain('npm test');
    expect(content).toContain('npx vite-node crawler/ingest.ts');
    expect(content).toContain('npm run sitemap');
    expect(content).toContain('npm run build');
    expect(content).toContain('npx wrangler pages deploy dist --project-name=defencewire');
  });

  it('verifies .github/workflows/ci.yml includes paths-ignore for data/sitemap artifacts', () => {
    const ciPath = path.join(rootDir, '.github/workflows/ci.yml');
    expect(fs.existsSync(ciPath)).toBe(true);
    const content = fs.readFileSync(ciPath, 'utf-8');

    // Check paths-ignore on push
    expect(content).toContain('paths-ignore:');
    expect(content).toContain("'public/data/news.json'");
    expect(content).toContain("'public/sitemap.xml'");

    // Check required CI gates exist
    expect(content).toContain('name: Typecheck (Strict TS)');
    expect(content).toContain('name: Contracts & LOC Guardrails');
    expect(content).toContain('name: Unit & Integration Tests');
    expect(content).toContain('name: Crawler Pipeline Dry-Run');
    expect(content).toContain('name: Security & Compliance Audit');
    expect(content).toContain('name: Web Build & Performance Budget');
    expect(content).toContain('name: CI Success');
  });

  it('verifies wrangler.toml has matching project name and dist output directory', () => {
    const wranglerPath = path.join(rootDir, 'wrangler.toml');
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const content = fs.readFileSync(wranglerPath, 'utf-8');

    expect(content).toContain('name = "defencewire"');
    expect(content).toContain('pages_build_output_dir = "dist"');
    expect(content).toContain('database_name = "defencewire-archive"');
    expect(content).toContain('binding = "ARCHIVE_MEDIA"');
  });
});
