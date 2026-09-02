/**
 * Curated High-Fidelity Indian Defence Story Clusters
 * Initial dataset with full multi-source coverage, SSB briefs, and discussions.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { SEED_STRATEGIC_CLUSTERS } from './seedClusters.js';

export const INITIAL_LEAD_CLUSTERS: StoryCluster[] = [
  // 1. Lead Story: Tejas Mk1A & GE Engines
  {
    id: 'cluster-tejas-mk1a-delivery-2026',
    synthesizedHeadline: 'IAF Prepares to Induct First Tejas Mk1A Squadron as GE Begins F404 Engine Shipments',
    primarySource: {
      id: 'src-pib-tejas-01',
      title: 'MoD Reviews Tejas Mk1A Delivery Schedule; First Squadron Operationalization Underway at Nal Air Base',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2048912',
      sourceName: 'Press Information Bureau (MoD)',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T06:30:00Z',
      snippet: 'Defence Minister reviews delivery timelines of the 83 LCA Tejas Mk1A fighters with HAL and IAF leadership.',
      isPrimary: true,
      officialType: 'pib_mod'
    },
    relatedCoverage: [
      {
        id: 'src-hindu-tejas-02',
        title: 'GE Aerospace Dispatches First Batch of F404-IN20 Turbofan Engines to HAL Bengaluru',
        url: 'https://www.thehindu.com/news/national/ge-aerospace-dispatches-f404-engines-hal/article6854120.ece',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T07:15:00Z'
      },
      {
        id: 'src-livefist-tejas-03',
        title: 'Inside IAF’s 83-Jet Tejas Mk1A Roadmap: Active Electronically Scanned Radar & EW Pods Integrated',
        url: 'https://www.livefistdefence.com/inside-iaf-tejas-mk1a-roadmap-radar-ew-integration/',
        sourceName: 'Livefist Defence',
        sourceDomain: 'livefistdefence.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T08:00:00Z'
      },
      {
        id: 'src-idrw-tejas-04',
        title: 'HAL Ready to Scale Tejas Mk1A Production to 24 Aircraft Annually with Nashik Line Active',
        url: 'https://idrw.org/hal-ready-to-scale-tejas-mk1a-production-to-24-aircraft/',
        sourceName: 'IDRW',
        sourceDomain: 'idrw.org',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T08:45:00Z'
      }
    ],
    discussions: [
      {
        id: 'disc-tejas-01',
        author: 'Air Marshal (Retd.) Anil Chopra',
        handleOrTitle: 'Former Director General, CAPS India',
        quote: 'The induction of Tejas Mk1A with Uttam AESA radar and indigenous Astra BVRAAM is pivotal to halting IAF squadron depletion.',
        url: 'https://capsindia.org/perspectives-lca-tejas-induction/',
        sourcePlatform: 'ThinkTank'
      },
      {
        id: 'disc-tejas-02',
        author: 'Shiv Aroor',
        handleOrTitle: 'Founder, Livefist Defence',
        quote: 'With GE engine logistics unblocked, the focus shifts entirely to HAL sustaining an uninterrupted delivery cadence of 16-24 jets per year.',
        sourcePlatform: 'X/Twitter'
      }
    ],
    ssbIntel: {
      whyItMatters: 'Directly addresses IAF fighter squadron deficit (currently ~31 vs 42 authorized) and demonstrates indigenous 4.5-gen aerospace manufacturing capability.',
      gdLecturettePoints: [
        'Squadron Depletion vs Indigenous Manufacturing: Balancing urgent operational requirements with Atmanirbhar Bharat.',
        'Aero-Engine Dependency: Why India must master sovereign gas turbine technology to eliminate foreign supply chain vulnerabilities.',
        '4.5-Gen Capabilities: Integration of Uttam AESA radar, Astra BVR missile, and advanced digital Electronic Warfare (EW) suite.'
      ],
      potentialInterviewQuestions: [
        'What is the current squadron strength of the Indian Air Force and why is the LCA Tejas Mk1A program critical?',
        'Differentiate between Tejas Mk1, Mk1A, and the planned Tejas Mk2 in terms of payload and capabilities.',
        'Why does India still import fighter jet engines, and what are the strategic implications of this dependency?'
      ],
      defenceTechTakeaway: {
        platformOrSystem: 'LCA Tejas Mk1A',
        specifications: [
          'Engine: GE F404-GE-IN20 Turbofan with afterburner (84 kN thrust)',
          'Radar: Indigenous Uttam Active Electronically Scanned Array (AESA)',
          'BVR Weapons: Astra Mk1 (110 km), ASRAAM Close Combat Missile',
          'Self-Protection: Advanced indigenous Unified Electronic Warfare Suite (UEWS)'
        ],
        indigenousContentPercentage: 65,
        keySignificance: 'Replaces aging MiG-21 Bisons, providing IAF with network-centric 4.5-gen multirole fighter power.'
      },
      strategicAngle: 'Fortifies Western and Northern air defense sectors while establishing India as a serious aerospace exporter in Southeast Asia and South America.'
    },
    categories: ['official', 'programs', 'tech', 'procurement', 'airforce', 'ssb'],
    entities: ['Tejas Mk1A', 'DRDO', 'HAL'],
    programTags: ['tejas-mk1a'],
    defenceScore: 94.5,
    isLeadStory: true,
    createdAt: '2026-08-30T06:30:00Z',
    updatedAt: '2026-08-30T08:45:00Z'
  },

  // 2. Project 75I Submarine Program
  {
    id: 'cluster-project-75i-submarine-trials',
    synthesizedHeadline: 'Indian Navy Shortlists TKMS & Navantia for ₹43,000 Cr Project-75I Submarine Deal After Field AIP Trials',
    primarySource: {
      id: 'src-navy-p75i-01',
      title: 'Field Evaluation Trials of Air Independent Propulsion (AIP) Submarines Successfully Concluded in Germany & Spain',
      url: 'https://indiannavy.nic.in/press-release/project-75i-evaluation-trials',
      sourceName: 'Indian Navy (Official)',
      sourceDomain: 'indiannavy.nic.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T05:00:00Z',
      isPrimary: true,
      officialType: 'pib_mod'
    },
    relatedCoverage: [
      {
        id: 'src-reuters-p75i-02',
        title: 'India Advances $5.2 Billion Stealth Submarine Procurement with Tech Transfer Mandate',
        url: 'https://www.reuters.com/business/aerospace-defense/india-submarine-tender-tkms-navantia/',
        sourceName: 'Reuters',
        sourceDomain: 'reuters.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T06:10:00Z'
      },
      {
        id: 'src-navalnews-p75i-03',
        title: 'P-75I Submarine Contenders: Analysis of HDW Class 214 vs S-80 Plus Fuel Cell AIP Technologies',
        url: 'https://www.navalnews.com/naval-news/2026/08/p75i-india-submarine-analysis-tkms-navantia/',
        sourceName: 'Naval News',
        sourceDomain: 'navalnews.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T07:20:00Z'
      }
    ],
    discussions: [
      {
        id: 'disc-p75i-01',
        author: 'Commodore (Retd.) C. Uday Bhaskar',
        handleOrTitle: 'Director, Society for Aerospace Maritime & Defence Studies (SAMDeS)',
        quote: 'With PLAN submarines expanding presence in the Indian Ocean Region, Project 75I with proven fuel-cell AIP is an existential naval priority.',
        sourcePlatform: 'ThinkTank'
      }
    ],
    ssbIntel: {
      whyItMatters: 'Maintains underwater parity in the Indian Ocean Region against expanding Chinese PLAN submarine deployments.',
      gdLecturettePoints: [
        'Strategic Importance of Subsurface Deterrence in the IOR (Indian Ocean Region).',
        'Air Independent Propulsion (AIP) vs Nuclear Submarines (SSN/SSBN): Tactical deployment trade-offs.',
        'Strategic Partnership (SP) Model: Fostering domestic private shipyard capabilities (L&T and MDL).'
      ],
      potentialInterviewQuestions: [
        'What is Air Independent Propulsion (AIP) and how does it enhance submarine stealth and endurance?',
        'Explain the difference between conventional diesel-electric, AIP-equipped, and nuclear-powered submarines.',
        'What is India’s Maritime Security Strategy regarding Chinese naval presence around the Malacca Straits?'
      ],
      defenceTechTakeaway: {
        platformOrSystem: 'Project 75I Conventional Attack Submarine',
        specifications: [
          'Propulsion: Fuel-Cell based Air Independent Propulsion (AIP)',
          'Displacement: ~3,000 tonnes submerged',
          'Weapons: Heavyweight Wire-Guided Torpedoes, Submarine-Launched BrahMos/Club Cruise Missiles',
          'Endurance: Submerged endurance exceeding 2 weeks without snorkeling'
        ],
        indigenousContentPercentage: 60,
        keySignificance: 'Provides silent hunter-killer capability against adversary naval task forces in deep and littoral waters.'
      }
    },
    categories: ['programs', 'tenders', 'navy', 'tech', 'procurement', 'ssb'],
    entities: ['Project 75I', 'DAC Clearance'],
    programTags: ['project-75i'],
    defenceScore: 89.2,
    isLeadStory: false,
    createdAt: '2026-08-30T05:00:00Z',
    updatedAt: '2026-08-30T07:20:00Z'
  },

  // 3. Zorawar Light Tank
  {
    id: 'cluster-zorawar-light-tank-lac',
    synthesizedHeadline: 'Indian Army & DRDO Begin High-Altitude Winter Deployment Trials for Zorawar Light Tank in Eastern Ladakh',
    primarySource: {
      id: 'src-drdo-zorawar-01',
      title: 'DRDO & Larsen & Toubro Complete Firing & Mobility Trials of Indigenous Light Tank Zorawar',
      url: 'https://drdo.gov.in/drdo/press-release/zorawar-light-tank-trials',
      sourceName: 'DRDO (Official)',
      sourceDomain: 'drdo.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T04:15:00Z',
      isPrimary: true,
      officialType: 'pib_mod'
    },
    relatedCoverage: [
      {
        id: 'src-ani-zorawar-02',
        title: 'Zorawar Light Tank Tailored for High-Altitude Warfare Along LAC to Match Chinese Type 15 Tanks',
        url: 'https://www.aninews.in/news/national/defence/zorawar-light-tank-trials-ladakh-lac/',
        sourceName: 'ANI News',
        sourceDomain: 'aninews.in',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T05:30:00Z'
      },
      {
        id: 'src-bharatshakti-zorawar-03',
        title: 'How DRDO & L&T Designed and Built Zorawar in Record 24 Months: Tech Deep Dive',
        url: 'https://bharatshakti.in/zorawar-light-tank-drdo-lt-record-timeline/',
        sourceName: 'Bharat Shakti',
        sourceDomain: 'bharatshakti.in',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T06:45:00Z'
      }
    ],
    discussions: [
      {
        id: 'disc-zorawar-01',
        author: 'Lt. Gen. (Retd.) Rakesh Sharma',
        handleOrTitle: 'Distinguished Fellow, CLAWS & Former Corps Commander 14 Corps',
        quote: 'In super-high altitudes like Rinchen La and Depsang, a 25-tonne nimble tank with integrated anti-drone EW gives tactical commanders decisive armored punch.',
        sourcePlatform: 'ThinkTank'
      }
    ],
    ssbIntel: {
      whyItMatters: 'Directly counters Chinese PLA Type 15 (ZTQ-15) light tanks deployed along the Line of Actual Control (LAC) in Eastern Ladakh and Sikkim.',
      gdLecturettePoints: [
        'High Altitude Armored Warfare: Lessons from Eastern Ladakh 2020 standoff.',
        'Agile Co-development: Public-Private partnership model between DRDO and L&T.',
        'Anti-Drone and Active Protection Systems (APS) in modern mechanized warfare.'
      ],
      potentialInterviewQuestions: [
        'Why can’t heavy Main Battle Tanks like T-90 Bhishma and Arjun be used optimally in Ladakh?',
        'Who was General Zorawar Singh and why is this light tank named after him?',
        'What role does armor play in high-altitude mountain passes and plateaus?'
      ],
      defenceTechTakeaway: {
        platformOrSystem: 'Zorawar Light Tank',
        specifications: [
          'Weight: ~25 tonnes (amphibious & air-transportable via C-17 / Il-76)',
          'Main Gun: 105mm High-Pressure Cockerill Turret Gun',
          'Protection: Active Protection System (APS), explosive reactive armor, composite armor',
          'Integration: Loitering munition launcher & integrated Counter-UAS jammer'
        ],
        indigenousContentPercentage: 70,
        keySignificance: 'Enables rapid armored airlift and maneuverability across mountain passes without destroying high-altitude roads and bridges.'
      }
    },
    categories: ['programs', 'army', 'tech', 'strategic', 'ssb'],
    entities: ['Zorawar', 'DRDO', 'LAC'],
    programTags: ['zorawar-light-tank'],
    defenceScore: 86.8,
    isLeadStory: false,
    createdAt: '2026-08-30T04:15:00Z',
    updatedAt: '2026-08-30T06:45:00Z'
  }
];

export const INITIAL_STORY_CLUSTERS: StoryCluster[] = [
  ...INITIAL_LEAD_CLUSTERS,
  ...SEED_STRATEGIC_CLUSTERS
];
