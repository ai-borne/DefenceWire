/**
 * Unit Tests for Date and Time Utilities
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { formatTimeAgo, formatTimeUntil, formatLiveIST } from '../../src/utils/dateUtils.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Date Utilities: formatTimeAgo', () => {
  const baseDate = new Date('2026-08-30T12:00:00Z');

  it('should return just now for dates less than 1 minute ago', () => {
    const recent = new Date(baseDate.getTime() - 30 * 1000).toISOString();
    expect(formatTimeAgo(recent, baseDate)).toBe(STRINGS.story.justNow);
  });

  it('should return minutes ago for dates under 1 hour', () => {
    const minsAgo = new Date(baseDate.getTime() - 25 * 60 * 1000).toISOString();
    expect(formatTimeAgo(minsAgo, baseDate)).toBe(`25${STRINGS.story.timeAgoMinutes}`);
  });

  it('should return hours ago for dates under 24 hours', () => {
    const hoursAgo = new Date(baseDate.getTime() - 4 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(hoursAgo, baseDate)).toBe(`4${STRINGS.story.timeAgoHours}`);
  });

  it('should return days ago for dates 24 hours or older', () => {
    const daysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(daysAgo, baseDate)).toBe(`3${STRINGS.story.timeAgoDays}`);
  });

  it('should handle invalid or future date strings safely', () => {
    expect(formatTimeAgo('', baseDate)).toBe(STRINGS.story.justNow);
    expect(formatTimeAgo('invalid-date-string', baseDate)).toBe(STRINGS.story.justNow);

    const futureDate = new Date(baseDate.getTime() + 60 * 1000).toISOString();
    expect(formatTimeAgo(futureDate, baseDate)).toBe(STRINGS.story.justNow);
  });
});

describe('Date Utilities: formatTimeUntil', () => {
  const baseDate = new Date('2026-08-30T12:00:00Z');

  it('counts forward, not backward, for a date in the future (e.g. a tender closing date)', () => {
    const in28Days = new Date(baseDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeUntil(in28Days, baseDate)).toBe(`${STRINGS.tenders.closingInPrefix}28${STRINGS.tenders.closingDaysSuffix}`);
  });

  it('returns "closing today" for a date under 24 hours away', () => {
    const in5Hours = new Date(baseDate.getTime() + 5 * 60 * 60 * 1000).toISOString();
    expect(formatTimeUntil(in5Hours, baseDate)).toBe(STRINGS.tenders.closingToday);
  });

  it('returns "closed" once the date has passed, unlike formatTimeAgo which would say "just now"', () => {
    const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeUntil(yesterday, baseDate)).toBe(STRINGS.tenders.closingPassed);
  });

  it('handles invalid or missing date strings safely', () => {
    expect(formatTimeUntil('', baseDate)).toBe(STRINGS.tenders.closingNotAvailable);
    expect(formatTimeUntil('invalid-date-string', baseDate)).toBe(STRINGS.tenders.closingNotAvailable);
  });
});

describe('Date Utilities: formatLiveIST', () => {
  it('should format timestamp with compact IST format by default', () => {
    const fixedDate = new Date('2026-08-30T10:00:00Z');
    const istString = formatLiveIST(fixedDate);
    expect(istString).toContain('IST');
    expect(istString).toContain('2026');
    expect(istString).toBe('30 Aug 2026, 15:30 IST');
  });

  it('should format timestamp with seconds when requested', () => {
    const fixedDate = new Date('2026-08-30T10:00:15Z');
    const istString = formatLiveIST(fixedDate, true);
    expect(istString).toBe('30 Aug 2026, 15:30:15 IST');
  });
});
