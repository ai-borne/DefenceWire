/**
 * Archive Date Grouping for DefenceWire.in
 * Pure function that buckets already date-sorted stories into IST calendar
 * days for the Archive tab's browse view, matching the "Today / Yesterday /
 * dated" heading convention readers expect from a day-grouped feed.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export interface ArchiveDateGroup {
  dateKey: string;
  dateLabel: string;
  stories: StoryCluster[];
}

const IST_TIME_ZONE = 'Asia/Kolkata';

function istDateKey(isoString: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(new Date(isoString));
}

function formatDateLabel(dateKey: string, now: Date): string {
  const todayKey = istDateKey(now.toISOString());
  const yesterdayKey = istDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const [year, month, day] = dateKey.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
  return formatter.format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 12)));
}

export function groupStoriesByDate(stories: StoryCluster[], now: Date = new Date()): ArchiveDateGroup[] {
  const groups: ArchiveDateGroup[] = [];
  const groupByKey = new Map<string, ArchiveDateGroup>();

  for (const story of stories) {
    const dateKey = istDateKey(story.primarySource.publishedAt);
    let group = groupByKey.get(dateKey);
    if (!group) {
      group = { dateKey, dateLabel: formatDateLabel(dateKey, now), stories: [] };
      groupByKey.set(dateKey, group);
      groups.push(group);
    }
    group.stories.push(story);
  }

  return groups;
}
