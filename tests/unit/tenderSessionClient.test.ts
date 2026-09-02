/**
 * Unit Tests for Tender Session Client (Cookie Jar) & Captcha Circuit Breaker
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  detectCaptchaGate,
  parseSetCookiePairs,
  serializeCookieHeader,
  TenderSessionClient
} from '../../crawler/tenderSessionClient.js';

describe('Tender Session Client', () => {
  describe('parseSetCookiePairs', () => {
    it('extracts name=value pairs and discards cookie attributes', () => {
      const jar = parseSetCookiePairs(['JSESSIONID=ABC123.node1; Path=/nicgep; HttpOnly']);
      expect(jar).toEqual({ JSESSIONID: 'ABC123.node1' });
    });

    it('handles multiple Set-Cookie values', () => {
      const jar = parseSetCookiePairs(['A=1; Path=/', 'B=2; Secure']);
      expect(jar).toEqual({ A: '1', B: '2' });
    });

    it('ignores malformed entries', () => {
      expect(parseSetCookiePairs(['', 'noequalssign'])).toEqual({});
    });
  });

  describe('serializeCookieHeader', () => {
    it('joins jar entries as a Cookie header', () => {
      expect(serializeCookieHeader({ A: '1', B: '2' })).toBe('A=1; B=2');
    });

    it('returns empty string for an empty jar', () => {
      expect(serializeCookieHeader({})).toBe('');
    });
  });

  describe('detectCaptchaGate', () => {
    it('flags the known captcha-gate strings', () => {
      expect(detectCaptchaGate('Provide Captcha and click on Search button to list all active tenders')).toBe(true);
      expect(detectCaptchaGate('Please Enter Captcha below')).toBe(true);
    });

    it('does not flag ordinary tender listing content', () => {
      expect(detectCaptchaGate('The latest Tender documents issued by various Government Departments')).toBe(false);
    });

    it('handles empty/falsy input', () => {
      expect(detectCaptchaGate('')).toBe(false);
    });
  });

  describe('TenderSessionClient', () => {
    it('captures a JSESSIONID from Set-Cookie and replays it on the next request', async () => {
      const responses = [
        new Response('<html>first</html>', { status: 200, headers: { 'set-cookie': 'JSESSIONID=XYZ789; Path=/nicgep' } }),
        new Response('<html>second</html>', { status: 200 })
      ];
      const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()!));

      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      await client.fetch('https://defproc.gov.in/nicgep/app?page=FrontEndLatestActiveTendersOrgwise&service=page');
      expect(client.getCookieHeader()).toBe('JSESSIONID=XYZ789');

      await client.fetch('https://defproc.gov.in/nicgep/app?page=FrontEndLatestActiveTendersOrgwise&service=page');
      const secondCallHeaders = fetchFn.mock.calls[1]![1].headers as Record<string, string>;
      expect(secondCallHeaders.Cookie).toBe('JSESSIONID=XYZ789');
    });

    it('flags captchaDetected when the response body contains the known gate string', async () => {
      const fetchFn = vi.fn().mockResolvedValue(new Response('Provide Captcha and click on Search button', { status: 200 }));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await client.fetch('https://eprocure.gov.in/nicgep/app?page=x');
      expect(result.captchaDetected).toBe(true);
      expect(result.ok).toBe(true);
    });

    it('rejects unsafe URLs via the shared SSRF guard without calling fetch', async () => {
      const fetchFn = vi.fn();
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await client.fetch('http://localhost/admin');
      expect(result.ok).toBe(false);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('returns a failure result instead of throwing on network error', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await client.fetch('https://defproc.gov.in/nicgep/app?page=x');
      expect(result.ok).toBe(false);
      expect(result.body).toBe('');
    });
  });
});
