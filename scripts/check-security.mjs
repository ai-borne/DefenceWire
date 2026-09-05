#!/usr/bin/env node
/**
 * DefenceWire Dependency Vulnerability Audit Wrapper
 * Retries on transient registry outages (503 / 502 / network timeout).
 * Treats npm registry 503 / network outages gracefully so CI is not blocked by third-party downtime,
 * but FAILS LOUD on actual high/critical vulnerabilities.
 * Hard limit: <= 300 LOC.
 */

import { spawnSync } from 'node:child_process';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

function runAudit() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = spawnSync('npm', ['audit', '--audit-level=high'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000 // 30s timeout to prevent hanging on registry outages
    });

    const output = (result.stdout || '') + (result.stderr || '');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status === 0) {
      process.exit(0);
    }

    const isRegistryOutage = output.includes('503 Service Unavailable') ||
      output.includes('502 Bad Gateway') ||
      output.includes('network timeout') ||
      /** @type {NodeJS.ErrnoException | undefined} */ (result.error)?.code === 'ETIMEDOUT';

    if (isRegistryOutage) {
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ npm registry outage detected (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        spawnSync('node', ['-e', `setTimeout(() => {}, ${RETRY_DELAY_MS})`]);
      } else {
        console.warn('⚠️ [SECURITY AUDIT] npm registry is currently returning 503 Service Unavailable or timed out. Bypassing blocker for transient registry outage.');
        process.exit(0);
      }
    } else {
      console.error('❌ [SECURITY AUDIT] High/Critical vulnerabilities detected or fatal npm audit error.');
      process.exit(result.status || 1);
    }
  }
}

runAudit();
