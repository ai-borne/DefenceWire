/**
 * Unit Tests: Security Headers & CSP Enforcement
 * Verifies strict CSP, COOP, CORP, COEP, HSTS, frame protection, and secret exclusions.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Edge Security Headers & CSP Enforcement', () => {
  const rootDir = process.cwd();

  it('verifies public/_headers enforces strict CSP without unsafe-inline in script-src', () => {
    const headersPath = path.join(rootDir, 'public/_headers');
    expect(fs.existsSync(headersPath)).toBe(true);
    const content = fs.readFileSync(headersPath, 'utf-8');

    // CSP directive presence
    expect(content).toContain('Content-Security-Policy:');

    // Extract CSP line
    const cspMatch = content.match(/Content-Security-Policy:\s*([^\n\r]+)/);
    expect(cspMatch).not.toBeNull();
    const csp = cspMatch![1]!;

    // Assert script-src contains 'self' and does NOT contain 'unsafe-inline'
    expect(csp).toMatch(/script-src\s+'self'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

    // Frame ancestors protection against clickjacking
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    // Connect-src least privilege (excludes direct GitHub API calls)
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('api.github.com');
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('verifies public/_headers contains cross-origin isolation and security headers', () => {
    const headersPath = path.join(rootDir, 'public/_headers');
    const content = fs.readFileSync(headersPath, 'utf-8');

    expect(content).toContain('X-Frame-Options: DENY');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(content).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    expect(content).toContain('Cross-Origin-Opener-Policy: same-origin');
    expect(content).toContain('Cross-Origin-Resource-Policy: same-origin');
    expect(content).toContain('Cross-Origin-Embedder-Policy: credentialless');
    expect(content).toContain('X-Permitted-Cross-Domain-Policies: none');
  });

  it('verifies index.html CSP meta tag is synchronized with strict edge policy', () => {
    const indexPath = path.join(rootDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('http-equiv="Content-Security-Policy"');
    expect(content).toMatch(/script-src\s+'self'/);
    expect(content).not.toMatch(/script-src[^;"]*'unsafe-inline'/);
    expect(content).toContain("object-src 'none'");
    expect(content).toContain("base-uri 'self'");
    expect(content).toContain("form-action 'self'");
  });

  it('verifies .gitignore contains strict security and secret exclusion patterns', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    expect(content).toContain('.env');
    expect(content).toContain('.env.*');
    expect(content).toContain('.dev.vars');
    expect(content).toContain('.cloudflare');
    expect(content).toContain('*.pem');
    expect(content).toContain('*.key');
  });
});
