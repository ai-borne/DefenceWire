/**
 * Unit Tests for Security & Sanitization Utilities
 * Verifies DOMPurify HTML sanitization, plain text extraction, URL safety, and entity decoding.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeContent,
  sanitizePlainText,
  decodeHtmlEntities,
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

  it('should neutralize SVG and IFRAME XSS vectors', () => {
    const svgVector = '<svg><script>alert("svg")</script></svg><iframe src="javascript:alert(1)"></iframe>';
    const clean = sanitizeContent(svgVector);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<iframe>');
    expect(clean).not.toContain('<svg>');
  });

  it('should preserve allowed formatting tags and attributes', () => {
    const safeHtml = '<p><strong>MoD</strong> clears <em>procurement</em> for <a href="https://pib.gov.in">Tejas</a></p>';
    const clean = sanitizeContent(safeHtml);

    expect(clean).toContain('<strong>MoD</strong>');
    expect(clean).toContain('<em>procurement</em>');
    expect(clean).toContain('<a href="https://pib.gov.in">Tejas</a>');
  });

  it('should strip dangerous javascript, vbscript, and data URIs from anchor tags', () => {
    const jsLink = '<a href="javascript:alert(\'xss\')">Click here</a>';
    const vbLink = '<a href="vbscript:msgbox(\'xss\')">Click here</a>';
    const dataLink = '<a href="data:text/html,<script>alert(1)</script>">Click here</a>';

    expect(sanitizeContent(jsLink)).not.toContain('javascript:');
    expect(sanitizeContent(vbLink)).not.toContain('vbscript:');
    expect(sanitizeContent(dataLink)).not.toContain('data:');
  });

  it('should strip on* event handlers from all elements', () => {
    const payload = '<div onmouseover="alert(1)" onclick="alert(2)" autofocus onfocus="alert(3)">Text</div>';
    const clean = sanitizeContent(payload);

    expect(clean).not.toContain('onmouseover');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onfocus');
    expect(clean).toContain('Text');
  });

  it('should handle null, undefined, or empty inputs gracefully', () => {
    // @ts-expect-error testing invalid inputs
    expect(sanitizeContent(null)).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(sanitizeContent(undefined)).toBe('');
    expect(sanitizeContent('')).toBe('');
  });
});

describe('Security Utilities: HTML Entity Decoding', () => {
  it('decodes standard numeric and named HTML entities correctly', () => {
    expect(decodeHtmlEntities("Russia&#039;s New MC-21 Airliner")).toBe("Russia's New MC-21 Airliner");
    expect(decodeHtmlEntities("Javelin &#039;co-production&#039; in India")).toBe("Javelin 'co-production' in India");
    expect(decodeHtmlEntities("China&#039;s Military Purge")).toBe("China's Military Purge");
    expect(decodeHtmlEntities('BrahMos &amp; Pinaka')).toBe('BrahMos & Pinaka');
    expect(decodeHtmlEntities('&quot;Operation Vijay&quot;')).toBe('"Operation Vijay"');
    expect(decodeHtmlEntities('Range &lt; 500km &gt; 100km')).toBe('Range < 500km > 100km');
    expect(decodeHtmlEntities('Air&#8211;to&#8211;Air Missile')).toBe('Air–to–Air Missile');
    expect(decodeHtmlEntities('&#8220;Make in India&#8221;')).toBe('“Make in India”');
    expect(decodeHtmlEntities("Hex code &#x27;quote&#x27; test")).toBe("Hex code 'quote' test");
    expect(decodeHtmlEntities('Non-breaking&nbsp;space')).toBe('Non-breaking space');
    expect(decodeHtmlEntities('DRDO &bull; ISRO &middot; HAL')).toBe('DRDO • ISRO · HAL');
    expect(decodeHtmlEntities('Budget: &euro;50M &pound;40M &yen;500M')).toBe('Budget: €50M £40M ¥500M');
  });

  it('strips CDATA wrappers while preserving payload content', () => {
    expect(decodeHtmlEntities('<![CDATA[Sovereign Defence Tech]]>')).toBe('Sovereign Defence Tech');
  });

  it('handles invalid code points safely in decodeHtmlEntities', () => {
    expect(decodeHtmlEntities('&#999999999;')).toBe('');
    expect(decodeHtmlEntities('&#0;')).toBe('');
  });

  it('handles empty or malformed inputs gracefully in decodeHtmlEntities', () => {
    expect(decodeHtmlEntities('')).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(decodeHtmlEntities(null)).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(decodeHtmlEntities(undefined)).toBe('');
  });
});

describe('Security Utilities: Plain Text Sanitization', () => {
  it('should strip all HTML tags from plain text inputs', () => {
    const raw = '<h3>HAL Tejas Mk1A</h3><p>First flight scheduled.</p>';
    const plain = sanitizePlainText(raw);

    expect(plain).toBe('HAL Tejas Mk1AFirst flight scheduled.');
  });

  it('should decode HTML entities and NOT corrupt apostrophes or quotes into entity strings', () => {
    expect(sanitizePlainText("Russia&#039;s New MC-21 Airliner")).toBe("Russia's New MC-21 Airliner");
    expect(sanitizePlainText("Javelin &#039;co-production&#039; in India")).toBe("Javelin 'co-production' in India");
    expect(sanitizePlainText('TATA\'s Defence Systems &amp; &quot;Make in India&quot;')).toBe(
      'TATA\'s Defence Systems & "Make in India"'
    );
  });

  it('should strip script and style tags with their contents entirely', () => {
    const raw = '<script>alert("xss")</script><style>body{color:red}</style>India&#039;s Defence Budget';
    const plain = sanitizePlainText(raw);
    expect(plain).not.toContain('<script>');
    expect(plain).not.toContain('body{color:red}');
    expect(plain).toBe("India's Defence Budget");
  });

  it('should strip embedded images and event handlers from plain text', () => {
    const raw = '<img src=x onerror=alert(1)>Tejas Mk2 Trials<svg onload=alert(2)></svg>';
    const plain = sanitizePlainText(raw);
    expect(plain).not.toContain('<img');
    expect(plain).not.toContain('onerror');
    expect(plain).not.toContain('<svg');
    expect(plain).toBe('Tejas Mk2 Trials');
  });

  it('should handle empty or malformed strings gracefully', () => {
    expect(sanitizePlainText('')).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(sanitizePlainText(null)).toBe('');
    // @ts-expect-error testing invalid inputs
    expect(sanitizePlainText(undefined)).toBe('');
  });
});

describe('Security Utilities: URL Validation & Sanitization', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    expect(isValidExternalUrl('https://pib.gov.in/PressReleasePage.aspx?PRID=123')).toBe(true);
    expect(isValidExternalUrl('http://mod.gov.in/defence-updates')).toBe(true);
    expect(isValidExternalUrl('https://reuters.com/world/india/')).toBe(true);
  });

  it('should reject dangerous protocols (javascript, data, vbscript, file, ftp)', () => {
    expect(isValidExternalUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isValidExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidExternalUrl('vbscript:msgbox("test")')).toBe(false);
    expect(isValidExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isValidExternalUrl('ftp://example.com/file')).toBe(false);
    expect(isValidExternalUrl('blob:https://example.com/uuid')).toBe(false);
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
