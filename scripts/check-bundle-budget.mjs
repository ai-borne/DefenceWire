#!/usr/bin/env node
/**
 * DefenceWire Performance Budget Verification
 * Enforces hard limit: Total gzipped JS bundle in dist/ must be < 35 KB (35,840 bytes).
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const MAX_BYTES = 35 * 1024; // 35 KB = 35,840 bytes
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
  console.error(`\n❌ [PERFORMANCE BUDGET EXCEEDED] Total JS payload is ${(totalGzipBytes / 1024).toFixed(2)} KB (> 35 KB limit)!`);
  process.exit(1);
} else {
  console.log('✅ [PERFORMANCE BUDGET PASSED] Production bundle is within the < 35 KB performance budget.');
}
