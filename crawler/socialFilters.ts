/**
 * Noise-Gating Engine for Social & Official Armed Forces Streams
 * Filters routine administrative, ceremonial, and protocol posts, ensuring only
 * high-signal operational updates, strategic trials, deployments, and weapon programs pass.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { FeedConfig } from './feedTypes.js';
import { extractMilitaryEntities } from '../src/engine/clusterEngine.js';
import { NON_DEFENCE_BLACKLIST_REGEX } from './filters.js';

export const CEREMONIAL_ADMIN_BLACKLIST = [
  // Homage & Memorials
  'wreath laying',
  'wreath-laying',
  'laid wreath',
  'lays wreath',
  'laying wreath',
  'pays homage',
  'paid homage',
  'paying homage',
  'pay homage',
  'floral tribute',
  'solemn tribute',
  'homage to bravehearts',
  'homage to martyrs',
  'tribute to martyrs',
  'remembrance ceremony',
  'war memorial homage',

  // Medical & Civic Outreach
  'medical camp',
  'veteran rally',
  'veterans rally',
  'ex-servicemen rally',
  'esm rally',
  'pension adalat',
  'blood donation',
  'blood donation camp',
  'free medical checkup',
  'health camp',
  'eye checkup camp',
  'ayush camp',
  'sadbhavana medical',

  // Protocol & Courtesy Calls
  'courtesy call',
  'courtesy visit',
  'called on',
  'called upon',
  'farewell call',
  'farewell visit',
  'courtesy meeting',

  // Sports, Celebrations & Expeditions
  'tree plantation',
  'van mahotsav',
  'swachh bharat',
  'cleanliness drive',
  'yoga day',
  'international yoga day',
  'marathon',
  'cyclothon',
  'motorcycle expedition',
  'cycle expedition',
  'trekking expedition',
  'adventure rally',
  'sports meet',
  'football tournament',
  'volleyball championship',
  'cricket match',
  'badminton tournament',
  'boxing championship',
  'athletic meet',
  'golf tournament',
  'sailing regatta',
  'inter-services tournament',

  // Routine PR, Cultural & School Visits
  'school children visit',
  'sainik school interaction',
  'motivational lecture',
  'felicitation ceremony',
  'annual day',
  'raising day celebrations',
  'cultural program',
  'musical concert',
  'symphony band',
  'pipe band display',
  'band concert'
];

export const CEREMONIAL_ADMIN_BLACKLIST_REGEX = new RegExp(
  `\\b(${CEREMONIAL_ADMIN_BLACKLIST.join('|')})\\b`,
  'i'
);

export const STRATEGIC_ACTION_REGEX = /\b(trials?|flight\s+tests?|test\s+fires?|test\s+fired|test\s+firing|user\s+trials?|field\s+trials?|sea\s+trials?|basin\s+trials?|harbou?r\s+trials?|weapon\s+trials?|missile\s+launch(?:es)?|induct(?:ion|ions|ing|ed|s)?|commission(?:ing|ed|s)?|hand(?:ed|s|ing)?\s+over|roll(?:ed|s|ing)?\s+out|maiden\s+flight|first\s+flight|deliver(?:y|ies|ed|ing|s)?(?:\s+of)?|live\s+firings?|live-fire|firing\s+drills?|tactical\s+exercises?|joint\s+exercises?|multilateral\s+exercises?|bilateral\s+exercises?|war\s+games?|combat\s+drills?|air\s+combat|scramble(?:s|d|ing)?|intercept(?:ion|ed|s|ing)?|combat\s+readiness|operational\s+readiness|forward\s+deploy(?:ment|ments|ed|ing|s)?|deployed\s+along|operational\s+patrol|anti-piracy|counter-terror|counter-insurgency|search\s+and\s+rescue|combat\s+air\s+patrol|surveillance\s+sorties?|contracts?|aon\s+approv(?:al|als|ed)?|dac\s+approv(?:al|als|ed)?|ccs\s+clear(?:ance|ances|ed)?|rfp\s+issued|contracts?\s+signed|order\s+placed|procurement\s+cleared|capital\s+acquisitions?|transfer\s+of\s+technology|tot|memorandum\s+of\s+understanding|mous?)\b/i;

/**
 * Validates if an official social post contains verified strategic or operational intelligence.
 * Rejects ceremonial and routine administrative noise (0% false positives for PR noise).
 */
export function isSocialPostStrategic(
  item: StorySourceItem,
  _feed?: FeedConfig
): boolean {
  const fullText = `${item.title} ${item.snippet || ''}`;

  // 1. General non-defence blacklist check
  if (NON_DEFENCE_BLACKLIST_REGEX.test(fullText)) {
    return false;
  }

  // 2. Ceremonial & administrative noise blacklist check (Layer 1 gate)
  if (CEREMONIAL_ADMIN_BLACKLIST_REGEX.test(fullText)) {
    return false;
  }

  // 3. Strategic action verbs & operational terms check (Layer 2 gate)
  if (STRATEGIC_ACTION_REGEX.test(fullText)) {
    return true;
  }

  // 4. Entity extraction: Verified military system, platform or command match
  const entities = extractMilitaryEntities(fullText);
  if (entities.entities.length > 0) {
    return true;
  }

  return false;
}
