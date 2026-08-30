/**
 * Traffic Funnel and Conversion Tracking Service for DefenceWire.in
 * Generates safe outbound URLs with UTM attribution and tracks ecosystem click events.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { isSafeHttpUrl } from '../utils/security.js';

export interface FunnelClickEvent {
  id: string;
  url: string;
  destination: string;
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  timestamp: string; // ISO 8601
}

export interface FunnelUrlOptions {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export type FunnelTrackListener = (event: FunnelClickEvent) => void;

const STORAGE_KEY = 'dw_funnel_events';
const inMemoryEvents: FunnelClickEvent[] = [];
const listeners: Set<FunnelTrackListener> = new Set();

/**
 * Builds an outbound URL embedded with UTM parameters while guaranteeing strict HTTPS/HTTP security.
 */
export function buildFunnelUrl(baseUrl: string, options: FunnelUrlOptions = {}): string {
  if (!isSafeHttpUrl(baseUrl)) {
    return '#';
  }

  try {
    const urlObj = new URL(baseUrl);
    const source = options.source || STRINGS.funnel.utmSource;
    const medium = options.medium || STRINGS.funnel.utmCampaignDefault;
    const campaign = options.campaign || STRINGS.funnel.utmCampaignDefault;

    urlObj.searchParams.set('utm_source', source);
    urlObj.searchParams.set('utm_medium', medium);
    urlObj.searchParams.set('utm_campaign', campaign);

    if (options.content) {
      urlObj.searchParams.set('utm_content', options.content);
    }

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return safe fallback
    return '#';
  }
}

/**
 * Tracks an outbound ecosystem conversion or navigation event.
 */
export function trackOutboundClick(
  data: Omit<FunnelClickEvent, 'id' | 'source' | 'timestamp'> & {
    source?: string;
    timestamp?: string;
  }
): FunnelClickEvent {
  const event: FunnelClickEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url: data.url,
    destination: data.destination,
    source: data.source || STRINGS.funnel.utmSource,
    medium: data.medium,
    campaign: data.campaign,
    content: data.content,
    timestamp: data.timestamp || new Date().toISOString()
  };

  inMemoryEvents.push(event);

  // Best-effort local storage persistence
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: FunnelClickEvent[] = stored ? JSON.parse(stored) : [];
      list.push(event);
      // Keep only last 100 events
      const trimmed = list.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore localStorage exceptions in private browsing or constrained environments
    }
  }

  // Notify active listeners
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Prevent listener errors from bubbling up
    }
  }

  return event;
}

/**
 * Retrieves recorded conversion tracking events.
 */
export function getRecordedEvents(): FunnelClickEvent[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall through to in-memory events
    }
  }
  return [...inMemoryEvents];
}

/**
 * Clears recorded funnel events from memory and storage.
 */
export function clearRecordedEvents(): void {
  inMemoryEvents.length = 0;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Registers an observer for real-time tracking events.
 */
export function onTrack(listener: FunnelTrackListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
