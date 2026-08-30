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
export function sanitizeContent(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Configure DOMPurify with strict allowlist
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'p', 'br', 'code'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false
  });
}

/**
 * Sanitizes plain text by stripping all HTML tags completely.
 *
 * @param dirty - Unsanitized string input
 * @returns Plain text stripped of all HTML markup
 */
export function sanitizePlainText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
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
