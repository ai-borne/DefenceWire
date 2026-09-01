/**
 * Security & Sanitization Utility for DefenceWire.in
 * DOMPurify wrapper for content sanitization, strict URL schema validator.
 * Hard limit: <= 300 LOC.
 */

import DOMPurify from 'dompurify';

/** Allowed URL protocols */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Sanitizes arbitrary HTML or text content to prevent XSS.
 * Removes malicious tags, scripts, on* attributes, and iframe exploits.
 *
 * @param dirty - Unsanitized string input
 * @returns Clean, safe HTML/text string
 */
function getPurifier(): typeof DOMPurify | null {
  if (typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPurify = DOMPurify as any;
  if (typeof anyPurify?.default?.sanitize === 'function') {
    return anyPurify.default;
  }
  return null;
}

export function sanitizeContent(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const purifier = getPurifier();
  if (purifier) {
    return purifier.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'p', 'br', 'code'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
      RETURN_DOM: false
    });
  }

  // Safe isomorphic fallback: escape HTML entities completely to eliminate injection
  return dirty
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Decodes standard named, decimal, and hexadecimal HTML entities into UTF-8 characters.
 *
 * @param raw - Raw string potentially containing HTML entities
 * @returns Clean decoded plain-text string
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      try {
        return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      try {
        return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      } catch {
        return '';
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&trade;/g, '™')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&bull;/g, '•')
    .replace(/&middot;/g, '·')
    .replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£')
    .replace(/&yen;/g, '¥')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Sanitizes plain text by stripping all HTML tags completely and decoding entities.
 * Safe for isomorphic execution (browser DOM and headless Node.js crawler).
 *
 * @param dirty - Unsanitized string input
 * @returns Plain text stripped of HTML markup with decoded UTF-8 characters
 */
export function sanitizePlainText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Remove script and style tags with their contents first
  let text = dirty.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');

  const purifier = getPurifier();
  if (purifier) {
    text = purifier.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  } else {
    // Isomorphic fallback: strip all remaining HTML tags
    text = text.replace(/<[^>]*>?/gm, '');
  }

  return decodeHtmlEntities(text);
}

/**
 * Validates whether a URL is secure (HTTP or HTTPS only).
 * Disallows javascript:, data:, file:, vbscript:, and relative or malformed URLs.
 *
 * @param urlString - URL string to validate
 * @returns boolean indicating if the URL is valid and safe
 */
export function isValidExternalUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(urlString);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Aliases for isValidExternalUrl
 */
export const isSafeHttpUrl = isValidExternalUrl;
export const isValidUrl = isValidExternalUrl;


/**
 * Normalizes and sanitizes a URL.
 * Returns '#' if the URL is invalid or uses an unsafe protocol.
 *
 * @param urlString - URL to sanitize
 * @returns Safe URL string or '#'
 */
export function sanitizeUrl(urlString: string): string {
  if (!isValidExternalUrl(urlString)) {
    return '#';
  }
  return urlString.trim();
}

/**
 * Generates secure anchor tag attributes for external links.
 * Always includes rel="noopener noreferrer" and target="_blank".
 */
export function getSafeLinkAttributes(url: string): { href: string; target: string; rel: string } {
  const safeHref = sanitizeUrl(url);
  return {
    href: safeHref,
    target: safeHref === '#' ? '_self' : '_blank',
    rel: 'noopener noreferrer'
  };
}
