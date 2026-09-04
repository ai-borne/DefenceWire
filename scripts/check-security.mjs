#!/usr/bin/env node
/**
 * DefenceWire Dependency Vulnerability Audit Wrapper
 * Retries on transient registry outages (503 / 502 / network timeout).
 * Fails loud on actual high/critical vulnerabilities.
 * Hard limit: <= 300 LOC.
 */

import { execSync } from 'node:child_process';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function runAudit() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      execSync('npm audit --audit-level=high', { stdio: 'inherit' });
      return;
    } catch (err) {
      const exitCode = err?.status;
      // npm audit exits with 1 if vulnerabilities are found, but also if registry 503s.
      // If attempt is less than max, wait and retry.
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ npm audit attempt ${attempt} failed (exit code ${exitCode}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        execSync(`node -e "setTimeout(() => {}, ${RETRY_DELAY_MS})"`);
      } else {
        console.error(`❌ npm audit failed after ${MAX_RETRIES} attempts.`);
        process.exit(exitCode || 1);
      }
    }
  }
}

runAudit();
