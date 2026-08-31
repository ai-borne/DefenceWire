/**
 * Unit Tests for Social Noise-Gating & Strategic Signal Filters
 * Verifies rejection of ceremonial/administrative noise and pass-through of genuine operational updates.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  CEREMONIAL_ADMIN_BLACKLIST,
  CEREMONIAL_ADMIN_BLACKLIST_REGEX,
  STRATEGIC_ACTION_REGEX,
  isSocialPostStrategic
} from '../../crawler/socialFilters.js';
import { isDefenceRelevant } from '../../crawler/filters.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { FeedConfig } from '../../crawler/feedTypes.js';

function createMockSocialItem(id: string, title: string, snippet?: string): StorySourceItem {
  return {
    id,
    title,
    url: `https://x.com/adgpi/status/${id}`,
    sourceName: 'ADG PI - Indian Army',
    sourceDomain: 'x.com',
    tier: SourceTier.TIER_1_SOCIAL,
    publishedAt: '2026-08-31T10:00:00Z',
    snippet
  };
}

const socialFeed: FeedConfig = {
  id: 'feed-army-x',
  name: 'ADG PI Twitter',
  url: 'https://x.com/adgpi',
  domain: 'x.com',
  tier: SourceTier.TIER_1_SOCIAL,
  defaultCategory: 'army',
  enabled: true
};

describe('Social Noise Gating: Ceremonial & Administrative Blacklist', () => {
  it('exports valid non-empty ceremonial blacklist and precompiled regexes', () => {
    expect(CEREMONIAL_ADMIN_BLACKLIST.length).toBeGreaterThan(15);
    expect(CEREMONIAL_ADMIN_BLACKLIST_REGEX.test('laid wreath at national war memorial')).toBe(true);
    expect(STRATEGIC_ACTION_REGEX.test('flight test of cruise missile')).toBe(true);
  });

  it('rejects wreath laying and homage posts across armed forces social feeds', () => {
    const wreath1 = createMockSocialItem('post-wreath-1', 'Army Commander laid wreath at National War Memorial to pay homage to fallen soldiers');
    const wreath2 = createMockSocialItem('post-wreath-2', 'Air Chief Marshal pays homage to bravehearts during solemn tribute at Srinagar');
    const tribute = createMockSocialItem('post-tribute', 'Floral tribute offered at Amar Jawan Jyoti on Remembrance Day');

    expect(isSocialPostStrategic(wreath1, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(wreath2, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(tribute, socialFeed)).toBe(false);
    expect(isDefenceRelevant(wreath1, socialFeed)).toBe(false);
  });

  it('rejects medical camps, blood donation drives, and veteran rallies', () => {
    const medCamp = createMockSocialItem('post-med', 'Indian Army organizes free medical checkup camp and eye checkup camp in Uri under Operation Sadbhavana');
    const bloodCamp = createMockSocialItem('post-blood', 'Navy personnel participate in voluntary blood donation camp in Karwar');
    const esmRally = createMockSocialItem('post-esm', 'Ex-servicemen rally and pension adalat held at Jalandhar Cantt for veterans');

    expect(isSocialPostStrategic(medCamp, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(bloodCamp, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(esmRally, socialFeed)).toBe(false);
  });

  it('rejects protocol courtesy visits and non-operational meetings', () => {
    const courtesy1 = createMockSocialItem('post-courtesy-1', 'GOC-in-C Northern Command called on Hon’ble Governor of J&K for courtesy meeting');
    const farewell = createMockSocialItem('post-farewell', 'Outgoing Fleet Commander paid farewell call on Chief of the Naval Staff');

    expect(isSocialPostStrategic(courtesy1, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(farewell, socialFeed)).toBe(false);
  });

  it('rejects sports tournaments, adventure expeditions, yoga, and tree plantations', () => {
    const football = createMockSocialItem('post-sports', 'Western Command conducts inter-services football championship in Chandigarh');
    const bikeRally = createMockSocialItem('post-bike', 'Indian Army flags off 500km motorcycle expedition from Leh to Kargil');
    const yoga = createMockSocialItem('post-yoga', 'Troops participate with zeal in International Yoga Day celebrations at Siachen Base Camp');
    const tree = createMockSocialItem('post-tree', 'Swachh Bharat cleanliness drive and tree plantation organized at military station');

    expect(isSocialPostStrategic(football, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(bikeRally, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(yoga, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(tree, socialFeed)).toBe(false);
  });

  it('rejects musical concerts, pipe bands, and routine school outreach', () => {
    const band = createMockSocialItem('post-band', 'Military symphony band and pipe band display enthralls audience at India Gate');
    const school = createMockSocialItem('post-school', 'Sainik school interaction and motivational lecture conducted for youth in Rajouri');

    expect(isSocialPostStrategic(band, socialFeed)).toBe(false);
    expect(isSocialPostStrategic(school, socialFeed)).toBe(false);
  });

  it('rejects non-defence blacklist noise like cricket or elections appearing in social streams', () => {
    const cricket = createMockSocialItem('post-cricket', 'Armed forces personnel attend cricket tournament finals');
    expect(isSocialPostStrategic(cricket, socialFeed)).toBe(false);
  });
});

describe('Social Noise Gating: Strategic Action & Operational Signals', () => {
  it('accepts genuine missile, radar, and weapon developmental trials', () => {
    const trial1 = createMockSocialItem('post-trial-1', 'DRDO successfully conducts flight test of Long Range Land Attack Cruise Missile from ITR Chandipur');
    const trial2 = createMockSocialItem('post-trial-2', 'Indian Navy carries out successful combat firing and user trial of BrahMos supersonic cruise missile');
    const trial3 = createMockSocialItem('post-trial-3', 'Field trials of indigenous Zorawar light tank successfully validated in high-altitude desert terrain');

    expect(isSocialPostStrategic(trial1, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(trial2, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(trial3, socialFeed)).toBe(true);
    expect(isDefenceRelevant(trial1, socialFeed)).toBe(true);
  });

  it('accepts operational deployments, scrambles, and live combat drills', () => {
    const drill1 = createMockSocialItem('post-drill-1', 'Indian Army conducts Ex Trishakti Prahar in North Bengal; live firing of artillery and ATGMs carried out');
    const scramble = createMockSocialItem('post-scramble', 'IAF scrambles Su-30MKI fighter jets to intercept aerial intrusion along northern border');
    const antipiracy = createMockSocialItem('post-piracy', 'Indian Navy warship INS Teg on anti-piracy operational patrol intercepts hijacked merchant vessel');

    expect(isSocialPostStrategic(drill1, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(scramble, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(antipiracy, socialFeed)).toBe(true);
  });

  it('accepts weapon inductions, commissionings, and procurement milestones', () => {
    const induction = createMockSocialItem('post-induction', 'IAF formally inducts first squadron of Tejas Mk1A fighter aircraft at Nal Airbase');
    const commissioning = createMockSocialItem('post-comm', 'Indian Navy commissions indigenous stealth guided missile frigate into Eastern Fleet');
    const aon = createMockSocialItem('post-aon', 'DAC accords AoN approval for capital acquisition of next-generation electronic warfare suites');

    expect(isSocialPostStrategic(induction, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(commissioning, socialFeed)).toBe(true);
    expect(isSocialPostStrategic(aon, socialFeed)).toBe(true);
  });

  it('accepts posts matching verified military entities even without explicit action verbs', () => {
    const entityPost = createMockSocialItem('post-entity', 'Operational assessment of S-400 Triumf air defence missile squadrons in Punjab sector');
    expect(isSocialPostStrategic(entityPost, socialFeed)).toBe(true);
  });

  it('rejects generic or vague social posts without entities or strategic action verbs', () => {
    const vaguePost = createMockSocialItem('post-vague', 'Indian Army remains committed to the highest standards of professionalism and nation building');
    expect(isSocialPostStrategic(vaguePost, socialFeed)).toBe(false);
  });
});
