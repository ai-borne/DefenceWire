#!/usr/bin/env node
/**
 * DefenceWire Sitemap Generator
 * Builds public/sitemap.xml from the latest crawled news feed so search engines
 * can discover the homepage and every story permalink.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const SITE_ORIGIN = 'https://www.defencewire.in';

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generateSitemap() {
  const newsPath = path.resolve(process.cwd(), 'public/data/news.json');
  const outputPath = path.resolve(process.cwd(), 'public/sitemap.xml');

  let clusters = [];
  try {
    const raw = await fs.readFile(newsPath, 'utf-8');
    const data = JSON.parse(raw);
    clusters = Array.isArray(data.clusters) ? data.clusters : [];
  } catch {
    // No feed yet; sitemap will just contain the homepage.
  }

  const now = new Date().toISOString();
  const entries = [urlEntry(`${SITE_ORIGIN}/`, now, 'always', '1.0')];

  for (const cluster of clusters) {
    if (!cluster || !cluster.id) continue;
    const lastmod = cluster.updatedAt || cluster.createdAt || now;
    entries.push(urlEntry(`${SITE_ORIGIN}/story/${cluster.id}`, lastmod, 'hourly', '0.7'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  await fs.writeFile(outputPath, xml, 'utf-8');
  console.log(`[SITEMAP] Wrote ${clusters.length + 1} URLs to ${outputPath}`);
}

generateSitemap().catch((err) => {
  console.error('[SITEMAP ERROR]', err);
  process.exitCode = 1;
});
