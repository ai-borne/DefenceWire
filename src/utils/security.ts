/**
 * Security & Sanitization Utility for DefenceWire.in
 * Native content sanitization, entity decoding, and strict URL schema validator.
 * Hard limit: <= 300 LOC.
 */

/** Allowed URL protocols */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'a', 'span', 'p', 'br', 'code', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'
]);
const ALLOWED_ATTRS = new Set(['href', 'title', 'target', 'rel', 'class', 'id']);

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

  // Remove script, style, svg, and iframe tags with their contents first
  let cleaned = dirty.replace(/<(script|style|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<(script|style|svg|iframe)[^>]*\/?>/gi, '');

  if (typeof document !== 'undefined') {
    const template = document.createElement('template');
    template.innerHTML = cleaned;

    const sanitizeNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          if (!ALLOWED_TAGS.has(tagName)) {
            const childNodes = Array.from(el.childNodes);
            el.replaceWith(...childNodes);
            for (const cn of childNodes) {
              if (cn.nodeType === Node.ELEMENT_NODE) sanitizeNode(cn);
            }
            continue;
          }

          // Clean attributes
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            if (!ALLOWED_ATTRS.has(attrName) || attrName.startsWith('on') || attrName === 'autofocus') {
              el.removeAttribute(attr.name);
            } else if (attrName === 'href') {
              const val = attr.value.trim().toLowerCase();
              if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:')) {
                el.removeAttribute(attr.name);
              }
            }
          }

          sanitizeNode(el);
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      }
    };

    sanitizeNode(template.content);
    return template.innerHTML;
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

  // Remove script, style, svg, and iframe tags with their contents first
  let text = dirty.replace(/<(script|style|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<[^>]*>?/gm, '');

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
