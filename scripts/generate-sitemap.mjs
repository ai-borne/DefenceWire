#!/usr/bin/env node
/**
 * DefenceWire Sitemap Generator
 * Builds public/sitemap.xml from SSOT sitemap generator (homepage, 43 strategic
 * programs, verified suppliers, and live story clusters).
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateSitemapXml } from '../src/seo/sitemapGenerator.js';

async function generateSitemap() {
  const newsPath = path.resolve(process.cwd(), 'public/data/news.json');
  const outputPath = path.resolve(process.cwd(), 'public/sitemap.xml');

  let clusters = [];
  try {
    const raw = await fs.readFile(newsPath, 'utf-8');
    const data = JSON.parse(raw);
    clusters = Array.isArray(data.clusters) ? data.clusters : [];
  } catch {
    // No feed yet; sitemap will just contain the static programs & suppliers.
  }

  const xml = generateSitemapXml(clusters);

  await fs.writeFile(outputPath, xml, 'utf-8');
  console.log(`[SITEMAP] Wrote updated sitemap to ${outputPath} (${xml.length} bytes)`);
}

generateSitemap().catch((err) => {
  console.error('[SITEMAP ERROR]', err);
  process.exitCode = 1;
});
