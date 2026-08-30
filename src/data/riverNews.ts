/**
 * Real-Time Chronological River of News Wire Items
 * Unfiltered, fast-moving defence news updates.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../types/news.js';
import { SourceTier } from '../types/source.js';

export const INITIAL_RIVER_ITEMS: StorySourceItem[] = [
  {
    id: 'river-01',
    title: 'MoD issues RFI for 114 Multi-Role Fighter Aircraft (MRFA) under Make in India guidelines',
    url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2049101',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T09:10:00Z',
    snippet: 'Comprehensive RFI issued to global aerospace majors with 60% mandatory indigenous content.'
  },
  {
    id: 'river-02',
    title: 'Indian Army conducts joint amphibious drill "Varuna Prahar" along Western Seaboard',
    url: 'https://indianarmy.nic.in/press-release/varuna-prahar-2026',
    sourceName: 'Indian Army',
    sourceDomain: 'indianarmy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T08:50:00Z',
    snippet: 'Integrated tri-service beachhead landing and special forces coordination validated.'
  },
  {
    id: 'river-03',
    title: 'HAL & Safran finalize joint venture facility in Bengaluru for helicopter engine maintenance',
    url: 'https://www.thehindu.com/news/national/hal-safran-jv-facility-bengaluru/article6854210.ece',
    sourceName: 'The Hindu',
    sourceDomain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T08:25:00Z',
    snippet: 'New facility to service Shakti engines powering Dhruv, Prachand, and LUH fleets.'
  },
  {
    id: 'river-04',
    title: 'DRDO conducts user flight trials of indigenous VSHORADS (Very Short Range Air Defence) missile',
    url: 'https://drdo.gov.in/press-release/vshorads-flight-trial-successful',
    sourceName: 'DRDO',
    sourceDomain: 'drdo.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T07:55:00Z',
    snippet: 'Man-portable 4th-gen miniaturized infrared homing missile achieves 100% mission objectives.'
  },
  {
    id: 'river-05',
    title: 'Indian Navy frontline frigate INS Tarkash docks at Port Victoria, Seychelles for joint EEZ patrol',
    url: 'https://indiannavy.nic.in/press-release/ins-tarkash-seychelles-eez',
    sourceName: 'Indian Navy',
    sourceDomain: 'indiannavy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T07:10:00Z',
    snippet: 'Reinforcing India’s SAGAR (Security and Growth for All in the Region) maritime vision.'
  },
  {
    id: 'river-06',
    title: 'BEL secures ₹3,200 Cr order for Naval Anti-Drone Systems and Fire Control Radars',
    url: 'https://www.theprint.in/defence/bel-secures-3200-cr-naval-anti-drone-order/2219950/',
    sourceName: 'ThePrint',
    sourceDomain: 'theprint.in',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T06:40:00Z',
    snippet: 'Major order includes RF soft-kill jammers and hard-kill laser tracking systems.'
  },
  {
    id: 'river-07',
    title: 'IAF Chief reviews operational readiness at Eastern Air Command forward air bases in Tezpur and Hashimara',
    url: 'https://www.aninews.in/news/national/defence/iaf-chief-reviews-forward-bases-eastern-sector/',
    sourceName: 'ANI News',
    sourceDomain: 'aninews.in',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T06:05:00Z',
    snippet: 'Assessment of Rafale and Su-30MKI scramble readiness along the Line of Actual Control.'
  },
  {
    id: 'river-08',
    title: 'Kalyani Strategic Systems dispatches second battery of 155mm ATAGS Howitzers to friendly foreign nation',
    url: 'https://idrw.org/kalyani-dispatches-atags-export-battery/',
    sourceName: 'IDRW',
    sourceDomain: 'idrw.org',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-08-30T05:20:00Z',
    snippet: 'Indigenously designed advanced artillery gun system sees growing export traction.'
  },
  {
    id: 'river-09',
    title: 'US State Department approves potential sale of anti-submarine sonobuoys to Indian Navy',
    url: 'https://www.reuters.com/business/aerospace-defense/us-approves-sonobuoys-sale-india-navy/',
    sourceName: 'Reuters',
    sourceDomain: 'reuters.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T04:35:00Z',
    snippet: '$52.8M package supports MH-60R Seahawk and P-8I Poseidon ASW operations.'
  },
  {
    id: 'river-10',
    title: 'GRSE Kolkata lays keel for 5th Next Generation Offshore Patrol Vessel (NGOPV)',
    url: 'https://bharatshakti.in/grse-lays-keel-5th-ngopv-indian-navy/',
    sourceName: 'Bharat Shakti',
    sourceDomain: 'bharatshakti.in',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-08-30T03:50:00Z',
    snippet: 'Indigenous warship construction program progresses ahead of contractual milestones.'
  },
  {
    id: 'river-11',
    title: 'Adani Defence & Elbit inaugurate expanded Hermes 900 MRO and aerostructures facility in Hyderabad',
    url: 'https://forceindia.net/adani-elbit-expand-hermes-900-facility/',
    sourceName: 'Force India',
    sourceDomain: 'forceindia.net',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-08-30T02:40:00Z',
    snippet: 'Facility to support Drishti-10 Starliner medium-altitude long-endurance drones for Army and Navy.'
  },
  {
    id: 'river-12',
    title: 'MP-IDSA releases strategic assessment on PLA Western Theater Command modernization',
    url: 'https://idsa.in/strategic-assessment-pla-modernization-2026',
    sourceName: 'MP-IDSA',
    sourceDomain: 'idsa.in',
    tier: SourceTier.TIER_4_OSINT,
    publishedAt: '2026-08-30T01:30:00Z',
    snippet: 'Comprehensive analysis on infrastructure hardening and dual-use airfields across Tibet.'
  }
];
