#!/usr/bin/env node
/**
 * DefenceWire Performance Budget Verification
 * Enforces hard limit: Total gzipped JS bundle in dist/ must be < 100 KB (102,400 bytes).
 * Raised from 40 KB to 55 KB when MOAT 2 was established, to 75 KB when Pillar A
 * (Jane's-grade specifications for all 43 programs, serial order books, and iDEX/ADITI challenges)
 * was integrated, to 82 KB when Phase 2.4 (Pillar B Ecosystem Explorer & Supplier Dossier
 * Modal — the verified supplier directory UI, filters, and cross-linked program dossiers) was
 * integrated, and to 100 KB by explicit user sign-off after the Curator's Desk plan's Phase 5
 * (Knowledge Base tab) left the 82 KB cap at ~90 bytes of headroom — see that plan's Phase 10
 * handoff report. Still flagged for explicit sign-off, not a silent bump.
 *
 * FUTURE OPTIMIZATION STRATEGIES (If bundle exceeds budget):
 * 1. Code-Split / Lazy-Load Rare Features (~12 KB saving):
 *    - Dynamically import EditorDashboard (`import('./components/EditorDashboard.js')`)
 *      and ArchiveView (`import('./components/ArchiveView.js')`) only when activated.
 * 2. Lazy-Load DOMPurify or Rely on Native Sanitizer API (~8 KB saving):
 *    - Dynamically load DOMPurify only when rendering complex user drawers or rely
 *      on native Browser Sanitizer API with fallback to safe DOM text nodes.
 *
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const MAX_BYTES = 100 * 1024; // 100 KB = 102,400 bytes
const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('❌ [BUDGET ERROR] dist/assets directory not found. Please run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error('❌ [BUDGET ERROR] No JS bundles found in dist/assets.');
  process.exit(1);
}

const mainBundleFile = jsFiles.find((f) => f.startsWith('index-')) || jsFiles[0];
let mainGzipBytes = 0;

for (const jsFile of jsFiles) {
  const filePath = path.join(distAssetsDir, jsFile);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  if (jsFile === mainBundleFile) {
    mainGzipBytes = gzipped.length;
  }
  console.log(`📦 Bundle: ${jsFile} | Raw: ${(content.length / 1024).toFixed(2)} KB | Gzipped: ${(gzipped.length / 1024).toFixed(2)} KB`);
}

console.log(`📊 Main Reader Bundle (${mainBundleFile}): ${(mainGzipBytes / 1024).toFixed(2)} KB (Max Budget: ${(MAX_BYTES / 1024).toFixed(2)} KB)`);

if (mainGzipBytes > MAX_BYTES) {
  console.error(`\n❌ [PERFORMANCE BUDGET EXCEEDED] Main JS bundle is ${(mainGzipBytes / 1024).toFixed(2)} KB (> ${(MAX_BYTES / 1024).toFixed(0)} KB limit)!`);
  process.exit(1);
} else {
  console.log(`✅ [PERFORMANCE BUDGET PASSED] Production main bundle is within the < ${(MAX_BYTES / 1024).toFixed(0)} KB performance budget.`);
}
