#!/usr/bin/env node
/**
 * DefenceWire Architectural Guardrail: LOC Checker
 * Enforces hard limit of <= 300 LOC for all source and test files.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const MAX_LOC = 300;
const DIRS_TO_CHECK = ['src', 'crawler', 'tests', 'functions'];
let failed = false;
let totalChecked = 0;

/** @param {string} dirPath */
function checkDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      totalChecked++;

      if (lines > MAX_LOC) {
        console.error(`❌ [LOC VIOLATION] ${fullPath} has ${lines} lines (Max allowed: ${MAX_LOC})`);
        failed = true;
      }
    }
  }
}

for (const dir of DIRS_TO_CHECK) {
  checkDirectory(path.resolve(process.cwd(), dir));
}

if (failed) {
  console.error(`\n🚨 LOC Check Failed: One or more files exceeded ${MAX_LOC} lines of code.`);
  process.exit(1);
} else {
  console.log(`✅ [LOC CHECK PASSED] All ${totalChecked} files strictly satisfy <= ${MAX_LOC} LOC limit.`);
}
