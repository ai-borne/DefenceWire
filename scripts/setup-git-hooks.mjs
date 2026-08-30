#!/usr/bin/env node
/**
 * Setup Pre-Commit Git Hook for DefenceWire.in
 * Automatically installs .git/hooks/pre-commit on npm install / setup.
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
# DefenceWire Pre-Commit Verification Hook
# Enforces Typecheck, LOC limits, Tests & Production Build before allowing commits.

echo "🛡️ [DefenceWire Pre-Commit] Running Typecheck..."
npm run typecheck || { echo "❌ Typecheck failed. Commit aborted."; exit 1; }

echo "🛡️ [DefenceWire Pre-Commit] Checking LOC Guardrails (<= 300 LOC)..."
npm run check:loc || { echo "❌ LOC guardrail failed. Commit aborted."; exit 1; }

echo "🛡️ [DefenceWire Pre-Commit] Running Vitest Suite..."
npm test || { echo "❌ Test suite failed. Commit aborted."; exit 1; }

echo "🛡️ [DefenceWire Pre-Commit] Testing Production Build..."
npm run build || { echo "❌ Build failed. Commit aborted."; exit 1; }

echo "✅ [DefenceWire Pre-Commit] All pre-commit checks passed successfully."
exit 0
`;

fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
console.log('✅ [PRE-COMMIT HOOK INSTALLED] .git/hooks/pre-commit configured successfully.');
