/**
 * Sovereign Indian Military Platforms, Missiles, Warships & Strategic Agencies
 * SSOT entity taxonomy for the DefenceWire.in NLP extraction pipeline.
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory } from '../types/news.js';

export interface MilitaryEntityConfig {
  name: string;
  pattern: RegExp;
  categories: DomainCategory[];
}

export const KNOWN_MILITARY_ENTITIES: MilitaryEntityConfig[] = [
  // --- Fighter Jets & Aerospace Platforms ---
  { name: 'Tejas Mk1A', pattern: /\btejas\s*(mk1a|mk-1a|mark\s*1a)?\b/i, categories: ['airforce', 'tech'] },
  { name: 'AMCA', pattern: /\bamca\b|advanced\s+medium\s+combat\s+aircraft/i, categories: ['airforce', 'tech', 'strategic'] },
  { name: 'Rafale', pattern: /\brafale(-m)?\b/i, categories: ['airforce', 'navy', 'procurement'] },
  { name: 'Su-30MKI', pattern: /\b(su-30\s*mki|sukhoi-30|super\s*sukhoi)\b/i, categories: ['airforce', 'tech'] },
  { name: 'C-295', pattern: /\bc-?295\b/i, categories: ['airforce', 'procurement'] },
  { name: 'Ghatak UCAV', pattern: /\b(ghatak|aura)\b|stealth\s+ucav/i, categories: ['airforce', 'tech'] },
  { name: 'Netra AEW&C', pattern: /\b(netra|phalcon|aew&c|awacs)\b/i, categories: ['airforce', 'tech'] },
  { name: 'Prachand LCH', pattern: /\bprachand\b|light\s+combat\s+helicopter|lch/i, categories: ['airforce', 'army'] },
  { name: 'Rudra / ALH', pattern: /\b(rudra|alh\s*dhruv|dhruv\s*helicopter|luh)\b/i, categories: ['airforce', 'army', 'tech'] },
  { name: 'Tapas UAV', pattern: /\b(tapas(-bh-201)?|rustom(-[12])?|archer(-ng)?)\b/i, categories: ['tech', 'airforce'] },
  { name: 'MQ-9B SkyGuardian', pattern: /\bmq-9b\b|seaguardian|skyguardian|predator\s+drone/i, categories: ['navy', 'procurement', 'tech'] },

  // --- Missiles & Precision Air Defense ---
  { name: 'BrahMos', pattern: /\bbrahmos(-ng|-er)?\b/i, categories: ['tech', 'procurement', 'strategic'] },
  { name: 'Astra BVR', pattern: /\bastra\s*(mk-?[123]|mark\s*[123]|bvr|missile)?\b/i, categories: ['airforce', 'tech'] },
  { name: 'Akash-NG', pattern: /\bakash(-ng)?\b/i, categories: ['airforce', 'army', 'tech'] },
  { name: 'Pinaka', pattern: /\bpinaka\s*(mbrl)?\b/i, categories: ['army', 'tech'] },
  { name: 'S-400 Triumf', pattern: /\bs-400\b|triumf/i, categories: ['airforce', 'strategic'] },
  { name: 'QRSAM', pattern: /\b(qrsam|vshorads?|quick\s+reaction\s+surface-to-air)\b/i, categories: ['army', 'tech'] },
  { name: 'MRSAM / Barak-8', pattern: /\b(mrsam|barak-8)\b/i, categories: ['airforce', 'navy', 'tech'] },
  { name: 'Helina / Nag', pattern: /\b(helina|dhruvastra|nag\s+missile|sant\s+missile|atgm)\b/i, categories: ['army', 'tech'] },

  // --- Strategic Deterrence & Ballistic Missiles ---
  { name: 'Agni-V', pattern: /\bagni-?(v|5|prime|p|iv|4|iii|3)\b/i, categories: ['strategic', 'tech'] },
  { name: 'Pralay', pattern: /\bpralay\b/i, categories: ['strategic', 'tech'] },
  { name: 'Nirbhay / LRACM', pattern: /\b(nirbhay|lracm)\b/i, categories: ['strategic', 'tech'] },
  { name: 'Phase-II BMD', pattern: /\b(ad-1|ad-2|phase-ii\s+bmd|ballistic\s+missile\s+defence)\b/i, categories: ['strategic', 'tech'] },
  { name: 'Project Kusha', pattern: /\bproject\s+kusha\b|erads/i, categories: ['strategic', 'tech', 'airforce'] },

  // --- Warships & Submarines ---
  { name: 'INS Vikrant', pattern: /\bins\s+vikrant\b|iac-1/i, categories: ['navy', 'tech'] },
  { name: 'INS Arihant', pattern: /\bins\s+arihant\b|s-?4\s+ssbn|s-?5\s+ssbn/i, categories: ['navy', 'strategic'] },
  { name: 'INS Arighat', pattern: /\bins\s+arighat\b|ssbn/i, categories: ['navy', 'strategic'] },
  { name: 'Project 75I', pattern: /\b(project\s*75-?i|p-?75i)\b/i, categories: ['navy', 'tech', 'procurement'] },
  { name: 'Project 15B', pattern: /\b(project\s*15-?b|p-?15b|visakhapatnam\s*class|ins\s*(surat|imphal|mormugao|visakhapatnam))\b/i, categories: ['navy', 'tech'] },
  { name: 'Project 17A', pattern: /\b(project\s*17-?a|p-?17a|nilgiri\s*class|ins\s*(nilgiri|himgiri|taragiri|udaygiri|dunagiri|vindhyagiri|mahendragiri))\b/i, categories: ['navy', 'tech'] },
  { name: 'Kalvari-class', pattern: /\b(kalvari(-class)?|scorpene|ins\s*(khanderi|karanj|vela|vagir|vagsheer))\b/i, categories: ['navy', 'tech'] },
  { name: 'Varunastra', pattern: /\b(varunastra|smart\s+missile|heavyweight\s+torpedo)\b/i, categories: ['navy', 'tech'] },
  { name: 'INS Nipun', pattern: /\bins\s+(nipun|nistar)\b|diving\s+support\s+vessel/i, categories: ['navy', 'tech'] },

  // --- Land Warfare & Combat Vehicles ---
  { name: 'Zorawar', pattern: /\bzorawar\b|light\s+tank/i, categories: ['army', 'tech'] },
  { name: 'K9 Vajra', pattern: /\bk9\s*vajra\b/i, categories: ['army', 'tech'] },
  { name: 'ATAGS', pattern: /\batags\b|advanced\s+towed\s+artillery/i, categories: ['army', 'tech'] },
  { name: 'Arjun Mk-1A', pattern: /\b(arjun\s*(mk-?1a|mark\s*1a|tank)?|t-90\s*bhishma|t-72\s*ajeya)\b/i, categories: ['army', 'tech'] },
  { name: 'WhAP', pattern: /\b(whap|kestrel|ficv)\b/i, categories: ['army', 'tech'] },

  // --- Strategic Agencies & Procurement Bodies ---
  { name: 'DRDO', pattern: /\bdrdo\b/i, categories: ['tech'] },
  { name: 'HAL', pattern: /\bhal\b|hindustan\s+aeronautics/i, categories: ['tech', 'airforce'] },
  { name: 'DAC Clearance', pattern: /\bdac\b|defence\s+acquisition\s+council/i, categories: ['procurement'] },
  { name: 'CCS Approval', pattern: /\bccs\b|cabinet\s+committee\s+on\s+security/i, categories: ['procurement', 'strategic'] }
];

/**
 * Extracts recognized military entities and mapped categories from headline and text.
 */
export function extractMilitaryEntities(text: string): { entities: string[]; categories: DomainCategory[] } {
  const entities: string[] = [];
  const categoriesSet = new Set<DomainCategory>();

  for (const entity of KNOWN_MILITARY_ENTITIES) {
    if (entity.pattern.test(text)) {
      entities.push(entity.name);
      entity.categories.forEach((cat) => categoriesSet.add(cat));
    }
  }

  // Safe fallback category if no specific named platform detected
  if (categoriesSet.size === 0) {
    const lower = text.toLowerCase();
    const hasDefenceContext =
      lower.includes('defence') ||
      lower.includes('defense') ||
      lower.includes('military') ||
      lower.includes('mod') ||
      lower.includes('armed forces') ||
      lower.includes('drdo') ||
      lower.includes('weapon') ||
      lower.includes('missile') ||
      lower.includes('ammunition');

    if (lower.includes('army') || lower.includes('troop') || lower.includes('soldier')) categoriesSet.add('army');
    else if (lower.includes('navy') || lower.includes('ship') || lower.includes('submarine') || lower.includes('maritime')) categoriesSet.add('navy');
    else if (lower.includes('air force') || lower.includes('iaf') || lower.includes('aircraft') || lower.includes('jet')) categoriesSet.add('airforce');
    else if (
      hasDefenceContext &&
      (lower.includes('procurement') ||
        lower.includes('deal') ||
        lower.includes('crore') ||
        lower.includes('order') ||
        lower.includes('contract') ||
        lower.includes('acquisition') ||
        lower.includes('tender'))
    ) {
      categoriesSet.add('procurement');
    } else {
      categoriesSet.add('strategic');
    }
  }

  return {
    entities: Array.from(new Set(entities)),
    categories: Array.from(categoriesSet)
  };
}
