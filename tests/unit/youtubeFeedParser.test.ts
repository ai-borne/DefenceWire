/**
 * Unit & Integration Tests for YouTube Armed Forces Atom Feed Parser & Noise Gate
 * Validates extraction of video titles, descriptions, URLs, thumbnails, and strategic signal gating.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  SOCIAL_FEEDS,
  YOUTUBE_ARMED_FORCES_FEEDS
} from '../../crawler/feedsSocial.js';
import { parseFeedXml } from '../../crawler/parser.js';
import { isDefenceRelevant } from '../../crawler/filters.js';
import { isSocialPostStrategic } from '../../crawler/socialFilters.js';
import { SourceTier } from '../../src/types/source.js';
import { isValidUrl } from '../../src/utils/security.js';

const DRDO_YOUTUBE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" href="https://www.youtube.com/feeds/videos.xml?channel_id=UCV9WiohwtfgSwHAar039sNw"/>
  <id>yt:channel:UCV9WiohwtfgSwHAar039sNw</id>
  <yt:channelId>UCV9WiohwtfgSwHAar039sNw</yt:channelId>
  <title>DRDO</title>
  <link rel="alternate" href="https://www.youtube.com/channel/UCV9WiohwtfgSwHAar039sNw"/>
  <published>2018-05-18T10:49:15+00:00</published>
  <entry>
    <id>yt:video:LRLACM2026</id>
    <yt:videoId>LRLACM2026</yt:videoId>
    <yt:channelId>UCV9WiohwtfgSwHAar039sNw</yt:channelId>
    <title>Successful Maiden Flight Test of Long Range Land Attack Cruise Missile (LRLACM)</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=LRLACM2026"/>
    <author>
      <name>DRDO</name>
      <uri>https://www.youtube.com/channel/UCV9WiohwtfgSwHAar039sNw</uri>
    </author>
    <published>2026-08-30T10:00:00+00:00</published>
    <updated>2026-08-30T10:15:00+00:00</updated>
    <media:group>
      <media:title>Successful Maiden Flight Test of Long Range Land Attack Cruise Missile (LRLACM)</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/LRLACM2026/hqdefault.jpg" width="480" height="360"/>
      <media:description>DRDO conducted maiden flight test of Long Range Land Attack Cruise Missile from mobile articulated launcher off the coast of Odisha, validated waypoint navigation and terminal precision.</media:description>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:CEREMONY01</id>
    <yt:videoId>CEREMONY01</yt:videoId>
    <yt:channelId>UCV9WiohwtfgSwHAar039sNw</yt:channelId>
    <title>Wreath Laying Ceremony &amp; Annual Day Pipe Band Display</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=CEREMONY01"/>
    <published>2026-08-29T08:00:00+00:00</published>
    <media:group>
      <media:title>Wreath Laying Ceremony &amp; Annual Day Pipe Band Display</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/CEREMONY01/hqdefault.jpg" width="480" height="360"/>
      <media:description>Dignitaries paid solemn floral tribute followed by symphony band concert, tree plantation drive and free medical camp.</media:description>
    </media:group>
  </entry>
</feed>`;

const ARMY_NAVY_IAF_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>ADG PI - Indian Army</title>
  <entry>
    <title>Indian Army &amp; IAF Conduct Tactical Airborne Assault Drills in Eastern Sector</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=ARMY_DRILL_77"/>
    <published>2026-08-31T06:30:00Z</published>
    <media:group>
      <media:description>Special Forces executed combat free-fall insertions and forward operational deployment drills with C-130J Super Hercules aircraft.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/ARMY_DRILL_77/hqdefault.jpg" />
    </media:group>
  </entry>
  <entry>
    <title>Veterans Rally &amp; Pension Adalat with Free Health Camp in Pune</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=PENSION_ADALAT"/>
    <published>2026-08-31T05:00:00Z</published>
    <media:group>
      <media:description>Southern Command organized ESM rally, eye checkup camp and pension grievances redressal session.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/PENSION_ADALAT/hqdefault.jpg" />
    </media:group>
  </entry>
  <entry>
    <title>Indian Navy Frigate INS Teg Conducts Anti-Piracy Patrol in Gulf of Aden</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=NAVY_PATROL_99"/>
    <published>2026-08-30T14:00:00Z</published>
    <media:group>
      <media:description>Stealth frigate completed maritime security operations and live-fire surface engagement drills in western IOR.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/NAVY_PATROL_99/hqdefault.jpg" />
    </media:group>
  </entry>
</feed>`;

describe('YouTube Armed Forces Feeds Registry', () => {
  it('registers all 6 verified armed forces YouTube Atom feeds with TIER_1_SOCIAL', () => {
    expect(YOUTUBE_ARMED_FORCES_FEEDS.length).toBe(6);
    expect(SOCIAL_FEEDS.length).toBeGreaterThanOrEqual(6);

    const expectedFeeds = [
      { id: 'feed-youtube-drdo', category: 'tech', channelId: 'UCV9WiohwtfgSwHAar039sNw' },
      { id: 'feed-youtube-army', category: 'army', channelId: 'UClnMEy7EJWhtWPINNygT_jg' },
      { id: 'feed-youtube-iaf', category: 'airforce', channelId: 'UC5jeeBnawh1VvE5yTB5bQHw' },
      { id: 'feed-youtube-navy', category: 'navy', channelId: 'UCbtFn_Ml8HuQ7nGHQ2LTQZg' },
      { id: 'feed-youtube-mod', category: 'strategic', channelId: 'UCtHnxLd8OMR-7yILSyNa_Tg' },
      { id: 'feed-youtube-pib', category: 'strategic', channelId: 'UCGn6a5SI8SNlj7WylmPD6GQ' }
    ];

    for (const exp of expectedFeeds) {
      const feed = YOUTUBE_ARMED_FORCES_FEEDS.find((f) => f.id === exp.id);
      expect(feed).toBeDefined();
      expect(feed?.domain).toBe('youtube.com');
      expect(feed?.tier).toBe(SourceTier.TIER_1_SOCIAL);
      expect(feed?.defaultCategory).toBe(exp.category);
      expect(feed?.enabled).toBe(true);
      expect(feed?.url).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${exp.channelId}`);
      expect(isValidUrl(feed!.url)).toBe(true);
    }
  });
});

describe('YouTube Atom XML Parsing', () => {
  const drdoFeed = YOUTUBE_ARMED_FORCES_FEEDS[0]!;

  it('correctly parses video titles, links, descriptions, thumbnails, and ISO timestamps', () => {
    const items = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);
    expect(items.length).toBe(2);

    const first = items[0]!;
    expect(first.id).toBeDefined();
    expect(first.title).toBe('Successful Maiden Flight Test of Long Range Land Attack Cruise Missile (LRLACM)');
    expect(first.url).toBe('https://www.youtube.com/watch?v=LRLACM2026');
    expect(first.sourceName).toBe(drdoFeed.name);
    expect(first.sourceDomain).toBe('youtube.com');
    expect(first.tier).toBe(SourceTier.TIER_1_SOCIAL);
    expect(first.snippet).toContain('DRDO conducted maiden flight test of Long Range Land Attack Cruise Missile');
    expect(first.imageUrl).toBe('https://i.ytimg.com/vi/LRLACM2026/hqdefault.jpg');
    expect(new Date(first.publishedAt).toISOString()).toBe('2026-08-30T10:00:00.000Z');
  });

  it('decodes HTML entities in video titles and descriptions', () => {
    const items = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);
    const ceremonial = items[1]!;

    expect(ceremonial.title).toBe('Wreath Laying Ceremony & Annual Day Pipe Band Display');
    expect(ceremonial.title).not.toContain('&amp;');
    expect(ceremonial.imageUrl).toBe('https://i.ytimg.com/vi/CEREMONY01/hqdefault.jpg');
  });

  it('assigns deterministic stable IDs to parsed YouTube entries across runs', () => {
    const run1 = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);
    const run2 = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);

    expect(run1[0]?.id).toBe(run2[0]?.id);
    expect(run1[1]?.id).toBe(run2[1]?.id);
    expect(run1[0]?.id).not.toBe(run1[1]?.id);
  });
});

describe('Social Noise Gating for YouTube Feeds', () => {
  const drdoFeed = YOUTUBE_ARMED_FORCES_FEEDS[0]!;
  const armyFeed = YOUTUBE_ARMED_FORCES_FEEDS[1]!;

  it('passes genuine missile tests, airborne assault drills, and naval patrols through noise gate', () => {
    const drdoItems = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);
    const strategicDrdo = drdoItems[0]!;

    expect(isSocialPostStrategic(strategicDrdo, drdoFeed)).toBe(true);
    expect(isDefenceRelevant(strategicDrdo, drdoFeed)).toBe(true);

    const armyItems = parseFeedXml(ARMY_NAVY_IAF_ATOM_XML, armyFeed);
    const airborneAssault = armyItems[0]!;
    const navalPatrol = armyItems[2]!;

    expect(isSocialPostStrategic(airborneAssault, armyFeed)).toBe(true);
    expect(isDefenceRelevant(airborneAssault, armyFeed)).toBe(true);

    expect(isSocialPostStrategic(navalPatrol, armyFeed)).toBe(true);
    expect(isDefenceRelevant(navalPatrol, armyFeed)).toBe(true);
  });

  it('rejects ceremonial wreath laying, pipe bands, veteran rallies, and medical camps (0% false positives for PR noise)', () => {
    const drdoItems = parseFeedXml(DRDO_YOUTUBE_ATOM_XML, drdoFeed);
    const ceremonialDrdo = drdoItems[1]!;

    expect(isSocialPostStrategic(ceremonialDrdo, drdoFeed)).toBe(false);
    expect(isDefenceRelevant(ceremonialDrdo, drdoFeed)).toBe(false);

    const armyItems = parseFeedXml(ARMY_NAVY_IAF_ATOM_XML, armyFeed);
    const veteranRally = armyItems[1]!;

    expect(isSocialPostStrategic(veteranRally, armyFeed)).toBe(false);
    expect(isDefenceRelevant(veteranRally, armyFeed)).toBe(false);
  });
});
