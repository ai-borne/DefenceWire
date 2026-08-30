/**
 * Unit Tests for Security & Sanitization Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeContent,
  sanitizePlainText,
  isValidExternalUrl,
  sanitizeUrl,
  getSafeLinkAttributes
} from '../../src/utils/security.js';

describe('Security Utilities: Content Sanitization', () => {
  it('should remove malicious script tags and inline handlers', () => {
    const malicious = '<script>alert("pwned")</script><p>Normal text</p><img src="x" onerror="alert(1)">';
    const clean = sanitizeContent(malicious);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<p>Normal text</p>');
  });

  it('should preserve allowed formatting tags and attributes', () => {
    const safeHtml = '<p><strong>MoD</strong> clears <em>procurement</em> for <a href="https://pib.gov.in">Tejas</a></p>';
    const clean = sanitizeContent(safeHtml);

    expect(clean).toContain('<strong>MoD</strong>');
    expect(clean).toContain('<em>procurement</em>');
    expect(clean).toContain('<a href="https://pib.gov.in">Tejas</a>');
  });

  it('should strip dangerous javascript: href from anchor tags', () => {
    const maliciousLink = '<a href="javascript:alert(\'xss\')">Click here</a>';
    const clean = sanitizeContent(maliciousLink);

    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Click here');
  });

  it('should handle null, undefined, or empty inputs gracefully', () => {
    // @ts-expect-error testing invalid inputs
    expect(sanitizeContent(null)).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(sanitizeContent(undefined)).toBe('');
    expect(sanitizeContent('')).toBe('');
  });
});

describe('Security Utilities: Plain Text Sanitization', () => {
  it('should strip all HTML tags from plain text inputs', () => {
    const raw = '<h3>HAL Tejas Mk1A</h3><p>First flight scheduled.</p>';
    const plain = sanitizePlainText(raw);

    expect(plain).toBe('HAL Tejas Mk1AFirst flight scheduled.');
  });

  it('should handle empty or malformed strings gracefully', () => {
    expect(sanitizePlainText('')).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(sanitizePlainText(null)).toBe('');
  });
});

describe('Security Utilities: URL Validation & Sanitization', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    expect(isValidExternalUrl('https://pib.gov.in/PressReleasePage.aspx?PRID=123')).toBe(true);
    expect(isValidExternalUrl('http://mod.gov.in/defence-updates')).toBe(true);
    expect(isValidExternalUrl('https://reuters.com/world/india/')).toBe(true);
  });

  it('should reject dangerous protocols (javascript, data, vbscript, file)', () => {
    expect(isValidExternalUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isValidExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidExternalUrl('vbscript:msgbox("test")')).toBe(false);
    expect(isValidExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isValidExternalUrl('ftp://example.com/file')).toBe(false);
  });

  it('should reject relative URLs, malformed strings, and non-strings', () => {
    expect(isValidExternalUrl('/relative/path')).toBe(false);
    expect(isValidExternalUrl('just a string')).toBe(false);
    expect(isValidExternalUrl('')).toBe(false);
    // @ts-expect-error testing invalid inputs
    expect(isValidExternalUrl(undefined)).toBe(false);
  });

  it('should sanitize invalid URLs to # fallback', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeUrl('invalid-url')).toBe('#');
    expect(sanitizeUrl('https://pib.gov.in')).toBe('https://pib.gov.in');
  });

  it('should generate secure anchor attributes with noopener noreferrer', () => {
    const validLinkAttrs = getSafeLinkAttributes('https://theprint.in/defence');
    expect(validLinkAttrs.href).toBe('https://theprint.in/defence');
    expect(validLinkAttrs.target).toBe('_blank');
    expect(validLinkAttrs.rel).toBe('noopener noreferrer');

    const unsafeLinkAttrs = getSafeLinkAttributes('javascript:eval("evil")');
    expect(unsafeLinkAttrs.href).toBe('#');
    expect(unsafeLinkAttrs.target).toBe('_self');
    expect(unsafeLinkAttrs.rel).toBe('noopener noreferrer');
  });
});
