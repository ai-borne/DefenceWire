/**
 * Date & Time Formatting Utilities for DefenceWire.in
 * Handles relative time calculations and IST clock formatting.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';

/**
 * Calculates human-readable relative time string (e.g., "15m ago", "2h ago", "1d ago", "Just now").
 *
 * @param isoString - ISO 8601 date string
 * @param now - Optional reference date (useful for deterministic tests)
 * @returns Relative time string
 */
export function formatTimeAgo(isoString: string, now: Date = new Date()): string {
  if (!isoString) {
    return STRINGS.story.justNow;
  }

  const targetDate = new Date(isoString);
  if (isNaN(targetDate.getTime())) {
    return STRINGS.story.justNow;
  }

  const diffMs = now.getTime() - targetDate.getTime();
  if (diffMs <= 0) {
    return STRINGS.story.justNow;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return STRINGS.story.justNow;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}${STRINGS.story.timeAgoMinutes}`;
  }
  if (diffHours < 24) {
    return `${diffHours}${STRINGS.story.timeAgoHours}`;
  }
  return `${diffDays}${STRINGS.story.timeAgoDays}`;
}

/**
 * Formats a Date object into live Indian Standard Time (IST, UTC+5:30) string.
 * Example output: "30 Aug 2026, 15:30:45 IST"
 *
 * @param date - Date instance to format (defaults to current date)
 * @returns Formatted IST timestamp string
 */
export function formatLiveIST(date: Date = new Date()): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-IN', options);
    const parts = formatter.formatToParts(date);
    
    let day = '';
    let month = '';
    let year = '';
    let hour = '';
    let minute = '';
    let second = '';

    for (const part of parts) {
      if (part.type === 'day') day = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'year') year = part.value;
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'second') second = part.value;
    }

    return `${day} ${month} ${year}, ${hour}:${minute}:${second} IST`;
  } catch {
    // Fallback if Intl is unavailable
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  }
}
