/**
 * Defense Event-Action Signature Taxonomy
 * Classifies defense headlines into standardized operational and programmatic actions.
 * Used by Two-Stage Techmeme Clustering to prevent false grouping of unrelated stories.
 * Hard limit: <= 300 LOC.
 */

export interface ActionSignatureConfig {
  name: string;
  pattern: RegExp;
}

export const DEFENCE_ACTION_SIGNATURES: ActionSignatureConfig[] = [
  {
    name: 'TRIAL_TEST',
    pattern: /\b(flight\s+tests?|test-?fires?|test-?firing|user\s+trials?|sea\s+trials?|weapon\s+trials?|successfully\s+(?:tested|fired|launched|validated)|trials?|tested|tests?|validat(?:es|ed|ing|ion)|launch(?:es|ed|ing)?)\b/i
  },
  {
    name: 'DAC_PROCUREMENT',
    pattern: /\b(dac\s+clearance|acceptance\s+of\s+necessity|aon|ccs\s+approval|defence\s+acquisition\s+council|procurement|acquisition|tender|rfp|eoi)\b/i
  },
  {
    name: 'INDUCTION_COMMISSION',
    pattern: /\b(commissioned|commissioning|induct(?:s|ed|ing)?|induction|handed\s+over|delivery|delivered|operationali[sz]ed|operationali[sz]ation)\b/i
  },

  {
    name: 'CONTRACT_DEAL',
    pattern: /\b(signed\s+contract|deal|orders?|contracts?|agreement|deal\s+worth|crore\s+deal|crore\s+order)\b/i
  },
  {
    name: 'BORDER_SECURITY',
    pattern: /\b(lac|loc|standoff|skirmish|border\s+talks|infiltration|deployment|corps\s+commander|line\s+of\s+actual\s+control)\b/i
  },
  {
    name: 'RND_UPGRADE',
    pattern: /\b(rollout|prototype|first\s+flight|indigenous\s+engine|upgrade|upgraded|moderni[sz]ation|stealth\s+design)\b/i
  },
  {
    name: 'CRASH_ACCIDENT',
    pattern: /\b(crashed?|emergency\s+landing|mishap|court\s+of\s+inquiry|pilot\s+ejected)\b/i
  },
  {
    name: 'STRATEGIC_EXERCISE',
    pattern: /\b(joint\s+exercise|war\s+games?|tri-service\s+exercise|milan|tarang\s+shakti|malabar|yudh\s+abhyas|exercise\b)/i
  }
];

/**
 * Extracts recognized military action signatures from headline/snippet text.
 */
export function extractActionSignatures(text: string): string[] {
  if (!text) return [];
  const signatures: string[] = [];
  for (const action of DEFENCE_ACTION_SIGNATURES) {
    if (action.pattern.test(text)) {
      signatures.push(action.name);
    }
  }
  return signatures;
}

/**
 * Checks if two text strings share at least one action signature.
 */
export function hasSharedActionSignature(textA: string, textB: string): boolean {
  const sigsA = extractActionSignatures(textA);
  if (sigsA.length === 0) return false;
  const sigsB = extractActionSignatures(textB);
  return sigsA.some((sig) => sigsB.includes(sig));
}
