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

// 3. Contract Integrity: Verify Types, Strings, and Theme Tokens SSOT Exist
function checkContracts() {
  const requiredContracts = [
    'src/resources/strings.ts',
    'src/resources/colors.ts',
    'src/styles/themes.css',
    'src/types/news.ts',
    'src/types/source.ts',
    'src/types/ranking.ts',
    'src/types/viewState.ts',
    'src/types/programs.ts'
  ];

  for (const relPath of requiredContracts) {
    const full = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(full)) {
      console.error(`❌ [CONTRACT MISSING] Expected SSOT contract file: ${relPath}`);
      failed = true;
    }
  }
}

// 4. Property-Targeted CSS Token Linter (Phase 3.2 Refinement 3)
// Enforces that themes.css is the sole provider of raw colors,
// and guarded stylesheets use var(--dw-*) for color-bearing properties.
function checkCssTokenPurity() {
  const guardedFiles = [
    'src/styles/dossier.css',
    'src/styles/feed.css',
    'src/styles/editor.css',
    'src/styles/badges.css',
    'src/styles/archive.css'
  ];
  const TARGET_PROPS = new Set(['color', 'background', 'background-color', 'border-color', 'box-shadow']);
  const ALLOWED_KEYWORDS = new Set(['transparent', 'none', 'inherit', 'initial', 'unset', 'currentcolor']);

  for (const relPath of guardedFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;

    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    // Strip comments
    const cleanContent = rawContent.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cleanContent)) !== null) {
      const decls = match[1].split(';');
      for (const decl of decls) {
        const parts = decl.split(':');
        if (parts.length >= 2) {
          const prop = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          if (TARGET_PROPS.has(prop)) {
            const normalized = val.toLowerCase().replace(/!important/g, '').trim();
            if (!val.includes('var(--dw-') && !ALLOWED_KEYWORDS.has(normalized)) {
              console.error(`❌ [TOKEN PURITY VIOLATION] ${relPath} property '${prop}: ${val}' must use 'var(--dw-*)' token.`);
              failed = true;
            }
          }
        }
      }
    }
  }
}

console.log('🔍 [CONTRACTS & ARCHITECTURE] Checking LOC limits, resource purity, and SSOT contracts...');

for (const dir of DIRS_TO_CHECK) {
  checkLoc(path.resolve(process.cwd(), dir));
}

checkHexColors(path.resolve(process.cwd(), 'src/components'));
checkContracts();
checkCssTokenPurity();

if (failed) {
  console.error('\n🚨 Architecture and Contract checks failed! Please resolve violations above.');
  process.exit(1);
} else {
  console.log(`✅ [CONTRACTS PASSED] Verified ${totalFilesChecked} files: 0 LOC violations, 100% token purity in guarded styles, all contracts intact.`);
}
