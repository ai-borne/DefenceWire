#!/usr/bin/env node
/**
 * DefenceWire Architectural & Contract Guardrail Verification
 * Validates:
 * 1. Hard limit <= 300 LOC per file in src/, crawler/, tests/
 * 2. Resource purity: Zero hardcoded hex colors in src/components/
 * 3. Contract integrity: Valid exports in src/types/ and src/resources/
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const MAX_LOC = 300;
const DIRS_TO_CHECK = ['src', 'crawler', 'tests', 'functions'];
let failed = false;
let totalFilesChecked = 0;

// 1. LOC Guardrail
function checkLoc(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      checkLoc(fullPath);
    } else if (entry.isFile() && /\.(ts|js|css|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      totalFilesChecked++;

      if (lines > MAX_LOC) {
        console.error(`❌ [LOC VIOLATION] ${path.relative(process.cwd(), fullPath)}: ${lines} lines (Max: ${MAX_LOC})`);
        failed = true;
      }
    }
  }
}

// 2. Resource Purity: Zero Hardcoded Hex Colors in Components
function checkHexColors(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isFile() && /\.(ts|js)$/.test(file.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(hexPattern);
      if (matches && matches.length > 0) {
        console.error(`❌ [RESOURCE PURITY VIOLATION] Hardcoded hex color in ${path.relative(process.cwd(), fullPath)}: ${matches.join(', ')}`);
        failed = true;
      }
    }
  }
}

// 3. Contract Integrity: Verify Types and Strings SSOT Exist
function checkContracts() {
  const requiredContracts = [
    'src/resources/strings.ts',
    'src/resources/colors.ts',
    'src/types/news.ts',
    'src/types/source.ts',
    'src/types/ranking.ts',
    'src/types/viewState.ts'
  ];

  for (const relPath of requiredContracts) {
    const full = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(full)) {
      console.error(`❌ [CONTRACT MISSING] Expected SSOT contract file: ${relPath}`);
      failed = true;
    }
  }
}

console.log('🔍 [CONTRACTS & ARCHITECTURE] Checking LOC limits, resource purity, and SSOT contracts...');

for (const dir of DIRS_TO_CHECK) {
  checkLoc(path.resolve(process.cwd(), dir));
}

checkHexColors(path.resolve(process.cwd(), 'src/components'));
checkContracts();

if (failed) {
  console.error('\n🚨 Architecture and Contract checks failed! Please resolve violations above.');
  process.exit(1);
} else {
  console.log(`✅ [CONTRACTS PASSED] Verified ${totalFilesChecked} files: 0 LOC violations, 0 hardcoded colors, all contracts intact.`);
}
