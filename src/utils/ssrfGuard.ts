/**
 * SSRF Guard for DefenceWire.in Ad-Hoc Ingestion (Phase 4).
 * Rejects hostnames/IP-literals that point at loopback, private, or
 * link-local network ranges before a curator-supplied URL is ever fetched
 * server-side. Kept as its own file (not folded into security.ts, which is
 * already near its 300-line cap).
 *
 * IMPORTANT — KNOWN GUARANTEE BOUNDARY, NOT AN OVERSIGHT (Rule 12: fail loud):
 * The Cloudflare Workers runtime that Pages Functions execute in exposes no
 * raw `dns` module and no way to introspect the actual IP a `fetch()` call
 * connects to after DNS resolution. That means this guard is a **string-level
 * hostname/IP-literal reject-list**, checked before the request is issued —
 * it does NOT and CANNOT protect against DNS-rebinding attacks, where a
 * hostname that looks like a normal public domain at check-time resolves to
 * a private/loopback/link-local IP only at actual fetch-time (a TTL=0 DNS
 * trick). This is a platform limitation of the Workers runtime, not a gap in
 * this implementation. Do not treat `isSsrfSafeUrl` returning true as proof
 * the eventual connection target is safe — it only proves the *literal*
 * hostname/IP the curator typed is not an obviously-private one.
 */

import { isSafeHttpUrl } from './security.js';

const BLOCKED_HOSTNAME_SUFFIXES = ['.internal', '.local'];
const BLOCKED_HOSTNAMES = new Set(['localhost']);

/** Parses an IPv4 literal into its four octets, or null if not a valid IPv4 literal. */
function parseIpv4(hostname: string): [number, number, number, number] | null {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const octets = match.slice(1, 5).map((part) => Number(part));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return octets as [number, number, number, number];
}

/** True if the IPv4 literal falls in loopback, private, or link-local ranges. */
function isBlockedIpv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (cloud metadata: 169.254.169.254)
  return false;
}

/** True if the hostname is a bracketed/unbracketed IPv6 literal referring to loopback or link-local. */
function isBlockedIpv6(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (clean === '::1') return true; // loopback
  if (clean.startsWith('fe80:')) return true; // link-local
  return false;
}

/**
 * Returns true only when the URL uses http(s) and its literal hostname (or
 * IP literal) is not a known-unsafe target. See the guarantee-boundary
 * comment above for what this deliberately does NOT cover.
 */
export function isSsrfSafeUrl(url: string): boolean {
  if (!isSafeHttpUrl(url)) return false;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!hostname) return false;

  if (BLOCKED_HOSTNAMES.has(hostname)) return false;
  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return false;

  const ipv4 = parseIpv4(hostname);
  if (ipv4 && isBlockedIpv4(ipv4)) return false;

  if (hostname.includes(':') && isBlockedIpv6(hostname)) return false;

  return true;
}
