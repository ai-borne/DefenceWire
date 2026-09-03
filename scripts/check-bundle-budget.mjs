#!/usr/bin/env node
/**
 * DefenceWire Performance Budget Verification
 * Enforces hard limit: Total gzipped JS bundle in dist/ must be < 75 KB (76,800 bytes).
 * Raised from 40 KB to 55 KB when MOAT 2 was established, and to 75 KB when Pillar A
 * (Jane's-grade specifications for all 43 programs, serial order books, and iDEX/ADITI challenges) was integrated.
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

const MAX_BYTES = 75 * 1024; // 75 KB = 76,800 bytes
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

let totalGzipBytes = 0;

for (const jsFile of jsFiles) {
  const filePath = path.join(distAssetsDir, jsFile);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  totalGzipBytes += gzipped.length;
  console.log(`📦 Bundle: ${jsFile} | Raw: ${(content.length / 1024).toFixed(2)} KB | Gzipped: ${(gzipped.length / 1024).toFixed(2)} KB`);
}

console.log(`📊 Total Gzipped JS Payload: ${(totalGzipBytes / 1024).toFixed(2)} KB (Max Budget: ${(MAX_BYTES / 1024).toFixed(2)} KB)`);

if (totalGzipBytes > MAX_BYTES) {
  console.error(`\n❌ [PERFORMANCE BUDGET EXCEEDED] Total JS payload is ${(totalGzipBytes / 1024).toFixed(2)} KB (> ${(MAX_BYTES / 1024).toFixed(0)} KB limit)!`);
  process.exit(1);
} else {
  console.log(`✅ [PERFORMANCE BUDGET PASSED] Production bundle is within the < ${(MAX_BYTES / 1024).toFixed(0)} KB performance budget.`);
}
