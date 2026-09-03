/**
 * Dynamic XML Sitemap Generator for DefenceWire.in
 * Generates standards-compliant XML sitemaps indexing the homepage, all 43
 * strategic defense programs, verified suppliers, and live story clusters.
 * Hard limit: <= 300 LOC. Target: < 100 LOC.
 */

import { ALL_STRATEGIC_PROGRAMS } from '../data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../data/suppliers/seedSuppliers.js';
import { StoryCluster } from '../types/news.js';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const SITE_ORIGIN = 'https://www.defencewire.in';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapEntries(stories: StoryCluster[] = []): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // 1. Homepage
  entries.push({
    loc: `${SITE_ORIGIN}/`,
    changefreq: 'hourly',
    priority: 1.0
  });

  // 2. All 43 Strategic Defense Programs
  for (const prog of ALL_STRATEGIC_PROGRAMS) {
    entries.push({
      loc: `${SITE_ORIGIN}/program/${prog.id}`,
      changefreq: 'daily',
      priority: 0.9
    });
  }

  // 3. Verified Defense Industrial Ecosystem Suppliers
  for (const supplier of ALL_SUPPLIERS) {
    entries.push({
      loc: `${SITE_ORIGIN}/supplier/${supplier.slug}`,
      changefreq: 'weekly',
      priority: 0.8
    });
  }

  // 4. Live Story Clusters
  for (const story of stories) {
    entries.push({
      loc: `${SITE_ORIGIN}/story/${story.id}`,
      lastmod: story.updatedAt ? new Date(story.updatedAt).toISOString().split('T')[0] : undefined,
      changefreq: 'daily',
      priority: 0.7
    });
  }

  return entries;
}

export function generateSitemapXml(stories: StoryCluster[] = []): string {
  const entries = generateSitemapEntries(stories);

  const xmlEntries = entries.map((entry) => {
    let xml = `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
    }
    xml += '  </url>';
    return xml;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries.join('\n')}\n</urlset>`;
}
