/**
 * Unit Tests for SSRF Guard (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { isSsrfSafeUrl } from '../../src/utils/ssrfGuard.js';

describe('SSRF Guard: isSsrfSafeUrl', () => {
  it('rejects loopback IPv4 (127.0.0.1)', () => {
    expect(isSsrfSafeUrl('http://127.0.0.1/')).toBe(false);
  });

  it('rejects the cloud metadata endpoint (169.254.169.254)', () => {
    expect(isSsrfSafeUrl('http://169.254.169.254/')).toBe(false);
  });

  it('rejects private class-A range (10.0.0.5)', () => {
    expect(isSsrfSafeUrl('http://10.0.0.5/')).toBe(false);
  });

  it('rejects private class-C range (192.168.1.1)', () => {
    expect(isSsrfSafeUrl('http://192.168.1.1/')).toBe(false);
  });

  it('rejects private class-B range (172.16.5.1)', () => {
    expect(isSsrfSafeUrl('http://172.16.5.1/')).toBe(false);
  });

  it('rejects IPv6 loopback ([::1])', () => {
    expect(isSsrfSafeUrl('http://[::1]/')).toBe(false);
  });

  it('rejects localhost hostname', () => {
    expect(isSsrfSafeUrl('http://localhost/')).toBe(false);
  });

  it('rejects .internal hostname suffix', () => {
    expect(isSsrfSafeUrl('http://foo.internal/')).toBe(false);
  });

  it('rejects .local hostname suffix', () => {
    expect(isSsrfSafeUrl('http://foo.local/')).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isSsrfSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSsrfSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSsrfSafeUrl('ftp://example.com/')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isSsrfSafeUrl('not a url')).toBe(false);
    expect(isSsrfSafeUrl('')).toBe(false);
  });

  it('accepts a normal external HTTPS URL', () => {
    expect(isSsrfSafeUrl('https://www.example.com/article/1')).toBe(true);
  });

  it('accepts a normal external HTTP URL with a public IP literal', () => {
    expect(isSsrfSafeUrl('http://8.8.8.8/')).toBe(true);
  });
});
