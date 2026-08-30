#!/usr/bin/env node
/**
 * Setup Pre-Commit Git Hook for DefenceWire.in
 * Automatically installs .git/hooks/pre-commit on npm install / setup.
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const gitDir = path.resolve(process.cwd(), '.git');
if (!fs.existsSync(gitDir)) {
  console.log('ℹ️ No .git directory found. Skipping hook installation.');
  process.exit(0);
}

const hooksDir = path.join(gitDir, 'hooks');
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hookPath = path.join(hooksDir, 'pre-commit');
const hookContent = `#!/bin/sh
# DefenceWire Multi-Gate Pre-Commit Verification Hook
# Enforces Typecheck, Contracts, Unit Tests, Crawler Dry-Run, Production Build, Performance Budget & Security before allowing commits.

echo "🔍 [1/7] Typecheck (TypeScript Strict Mode)..."
npm run typecheck || { echo "❌ Typecheck failed. Commit aborted."; exit 1; }

echo "🛡️ [2/7] Architecture & Contracts Guardrail (<= 300 LOC, SSOT purity)..."
npm run check:contracts || { echo "❌ Contract check failed. Commit aborted."; exit 1; }

echo "🧪 [3/7] Vitest Unit & Integration Suite..."
npm test || { echo "❌ Test suite failed. Commit aborted."; exit 1; }

echo "🤖 [4/7] Crawler Pipeline Dry-Run..."
npm run check:crawler || { echo "❌ Crawler dry-run failed. Commit aborted."; exit 1; }

echo "📦 [5/7] Production Vite Build..."
npm run build || { echo "❌ Production build failed. Commit aborted."; exit 1; }

echo "📊 [6/7] Performance Budget (< 35 KB Gzipped JS)..."
npm run check:budget || { echo "❌ Performance budget exceeded. Commit aborted."; exit 1; }

echo "🔒 [7/7] Security Vulnerability Audit..."
npm run check:security || { echo "❌ Security audit failed. Commit aborted."; exit 1; }

echo "✅ [DefenceWire Pre-Commit] All 7 pre-commit verification gates passed successfully."
exit 0
`;

fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
console.log('✅ [PRE-COMMIT HOOK INSTALLED] .git/hooks/pre-commit configured with 7 verification gates.');
