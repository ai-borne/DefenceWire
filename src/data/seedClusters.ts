/**
 * Seed Strategic Defence Story Clusters for DefenceWire.in
 * Additional high-fidelity clusters for DAC clearances, missile systems, and strategic deterrence.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { SourceTier } from '../types/source.js';

export const SEED_STRATEGIC_CLUSTERS: StoryCluster[] = [
  // 4. DAC Mega Clearance
  {
    id: 'cluster-dac-mega-procurement-clearance',
    synthesizedHeadline: 'Defence Acquisition Council (DAC) Clears ₹70,000 Cr Procurement: BrahMos Extended Range, MQ-9B Drones & Pinaka Regiments',
    primarySource: {
      id: 'src-pib-dac-01',
      title: 'DAC Accords Acceptance of Necessity (AoN) for Capital Acquisition Proposals Totalling ₹70,000 Crore Under Buy (Indian-IDDM)',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2048876',
      sourceName: 'Press Information Bureau (MoD)',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-29T16:00:00Z',
      isPrimary: true
    },
    relatedCoverage: [
      {
        id: 'src-theprint-dac-02',
        title: 'DAC Approves 31 General Atomics MQ-9B Drones, Additional BrahMos Missiles for Navy Frontline Warships',
        url: 'https://theprint.in/defence/dac-approves-mq9b-drones-brahmos-missiles/2219800/',
        sourceName: 'ThePrint',
        sourceDomain: 'theprint.in',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-29T17:30:00Z'
      },
      {
        id: 'src-janes-dac-03',
        title: 'India Expands Artillery Firepower with 6 Additional Pinaka Multi-Barrel Rocket Launcher Regiments',
        url: 'https://www.janes.com/defence-news/news-detail/india-pinaka-mbrl-regiments-approval',
        sourceName: 'Janes Defence',
        sourceDomain: 'janes.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-29T18:45:00Z'
      }
    ],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Enhances long-range precision strike and persistent maritime/border surveillance architecture under indigenous production mandates.',
      gdLecturettePoints: [
        'Defence Procurement Procedure (DAP 2020): Buy (Indian-IDDM) vs Foreign Military Sales (FMS).',
        'Standoff Precision Fires: Role of BrahMos (450km range) and Pinaka rocket artillery in non-contact warfare.',
        'High-Altitude Long Endurance (HALE) UAVs in multi-domain border ISR (Intelligence, Surveillance, Reconnaissance).'
      ],
      potentialInterviewQuestions: [
        'What is the role of the Defence Acquisition Council (DAC) and who chairs it?',
        'Explain the categorization "Buy (Indian-IDDM)" in the Defence Acquisition Procedure.',
        'How will the MQ-9B SeaGuardian/SkyGuardian drones enhance India’s border surveillance capabilities?'
      ]
    },
    categories: ['official', 'tenders', 'procurement', 'strategic', 'tech', 'ssb'],
    entities: ['DAC Clearance', 'BrahMos', 'Pinaka', 'MQ-9B SkyGuardian'],
    defenceScore: 84.1,
    isLeadStory: false,
    createdAt: '2026-08-29T16:00:00Z',
    updatedAt: '2026-08-29T18:45:00Z'
  },

  // 5. DRDO Akash-NG Air Defence
  {
    id: 'cluster-drdo-akash-ng-trials',
    synthesizedHeadline: 'DRDO Successfully Completes Developmental Flight Tests of Akash-NG Surface-to-Air Missile at ITR Chandipur',
    primarySource: {
      id: 'src-drdo-akash-01',
      title: 'Successful Flight Test of New Generation Akash (Akash-NG) Missile System from Integrated Test Range, Chandipur',
      url: 'https://drdo.gov.in/drdo/press-release/akash-ng-flight-test',
      sourceName: 'DRDO (Official)',
      sourceDomain: 'drdo.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-29T10:00:00Z',
      isPrimary: true,
      officialType: 'pib_mod'
    },
    relatedCoverage: [
      {
        id: 'src-thehindu-akash-02',
        title: 'Akash-NG Validates Indigenous Active RF Seeker Against High-Speed Maneuvering Aerial Target',
        url: 'https://www.thehindu.com/news/national/akash-ng-validates-rf-seeker/article6853900.ece',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-29T11:20:00Z'
      }
    ],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Provides rapid multi-target engagement capability against agile enemy fighters, cruise missiles, and drones at 30-70 km range.',
      gdLecturettePoints: [
        'Multi-Tiered Integrated Air Defence: Layering S-400, MRSAM, Akash-NG, and VSHORADS.',
        'Indigenisation of Missile Seekers: Breaking reliance on imported Active Radio Frequency seekers.'
      ],
      potentialInterviewQuestions: [
        'How does Akash-NG differ from the legacy Akash-1S and Akash Prime air defence systems?',
        'What is an Integrated Air Defence System (IADS) and why is it vital in modern contested airspace?'
      ]
    },
    categories: ['programs', 'official', 'airforce', 'army', 'tech', 'ssb'],
    entities: ['Akash-NG', 'DRDO'],
    defenceScore: 78.4,
    isLeadStory: false,
    createdAt: '2026-08-29T10:00:00Z',
    updatedAt: '2026-08-29T11:20:00Z'
  },

  // 6. INS Arighat Commissioning
  {
    id: 'cluster-ins-arighat-ssbn-commissioned',
    synthesizedHeadline: 'India Commissions Second Nuclear Ballistic Missile Submarine INS Arighat at Visakhapatnam',
    primarySource: {
      id: 'src-pib-arighat-01',
      title: 'Raksha Mantri Commissions Second Nuclear Powered Submarine INS Arighat into Indian Navy at Visakhapatnam',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2048500',
      sourceName: 'Press Information Bureau (MoD)',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-28T12:00:00Z',
      isPrimary: true,
      officialType: 'pib_mod'
    },
    relatedCoverage: [
      {
        id: 'src-theprint-arighat-02',
        title: 'INS Arighat Induction Solidifies India’s Nuclear Triad Second-Strike Deterrence in Indo-Pacific',
        url: 'https://theprint.in/defence/ins-arighat-commissioned-nuclear-triad/2218000/',
        sourceName: 'ThePrint',
        sourceDomain: 'theprint.in',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-28T13:40:00Z'
      }
    ],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Validates Continuous At-Sea Deterrence (CASD) and strengthens India’s "No First Use" (NFU) nuclear doctrine.',
      gdLecturettePoints: [
        'India’s Nuclear Triad: Land, Air, and Sea-based delivery legs.',
        'Continuous At-Sea Deterrence (CASD) and credible second-strike capability.',
        'Strategic stability in South Asia in the context of China and Pakistan.'
      ],
      potentialInterviewQuestions: [
        'Explain the components of India’s Nuclear Doctrine and what is meant by "No First Use".',
        'Why is the sea-based leg (SSBN) considered the most survivable component of a nuclear triad?'
      ]
    },
    categories: ['programs', 'official', 'navy', 'strategic', 'ssb'],
    entities: ['INS Arighat', 'CCS Approval'],
    defenceScore: 76.5,
    isLeadStory: false,
    createdAt: '2026-08-28T12:00:00Z',
    updatedAt: '2026-08-28T13:40:00Z'
  },

  // 7. Lok Sabha Defence Q&A on iDEX & Defence Startups
  {
    id: 'cluster-lok-sabha-idex-procurement-qa',
    synthesizedHeadline: 'Ministry of Defence Informs Lok Sabha: Over 400 Startups Funded Under iDEX with ₹2,500 Cr Procurement Pipeline',
    primarySource: {
      id: 'src-sansad-ls-idex-01',
      title: 'Lok Sabha Unstarred Question No. 2480: Progress of iDEX Scheme and Indigenisation Grants for Defence Startups',
      url: 'https://sansad.in/ls/questions/questions-and-answers',
      sourceName: 'Lok Sabha Secretariat',
      sourceDomain: 'sansad.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-28T09:00:00Z',
      snippet: 'Raksha Rajya Mantri tables detailed status of Defence India Startup Challenge (DISC) grants and procurement pathways.',
      isPrimary: true,
      officialType: 'lok_sabha',
      parliamentMeta: {
        house: 'Lok Sabha',
        questionNumber: 'USQ 2480',
        questionType: 'Unstarred',
        answeringDate: '2026-08-28',
        ministry: 'Ministry of Defence',
        minister: 'Raksha Rajya Mantri',
        subject: 'Progress of iDEX Scheme and Indigenisation Grants for Defence Startups',
        pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf'
      }
    },
    relatedCoverage: [
      {
        id: 'src-pib-idex-02',
        title: 'iDEX Signs 350th Contract for Advanced Military AI & Counter-Drone Solutions Under DISC-10',
        url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2048400',
        sourceName: 'Press Information Bureau (MoD)',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-28T10:15:00Z'
      }
    ],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Demonstrates fast-tracked procurement pipelines for Indian deep-tech MSMEs and military AI startups.',
      gdLecturettePoints: [
        'Innovations for Defence Excellence (iDEX): Bridging academia, startups, and Armed Forces.',
        'Defence Innovation Organisation (DIO) and DRDO Technology Development Fund (TDF).'
      ],
      potentialInterviewQuestions: [
        'What is the objective of the iDEX initiative and how does it support Make-in-India in defence?',
        'How are start-ups contributing to niche technologies like loitering munitions and AI?'
      ]
    },
    categories: ['official', 'idex', 'tenders', 'procurement', 'tech', 'ssb'],
    entities: ['iDEX', 'DRDO', 'MoD'],
    defenceScore: 82.0,
    isLeadStory: false,
    createdAt: '2026-08-28T09:00:00Z',
    updatedAt: '2026-08-28T10:15:00Z'
  }
];

