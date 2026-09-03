/**
 * Program-to-iDEX Challenge Cross-Linking and Indexed Query Engine
 * Hard limit: <= 300 LOC.
 */

import { IdexChallenge } from '../types/programs.js';
import { ALL_IDEX_CHALLENGES } from './idexChallenges.js';

export { ALL_IDEX_CHALLENGES };

const CHALLENGES_BY_PROGRAM_ID = new Map<string, IdexChallenge[]>();
const CHALLENGES_BY_ID = new Map<string, IdexChallenge>();

// Build fast O(1) indices
for (const challenge of ALL_IDEX_CHALLENGES) {
  CHALLENGES_BY_ID.set(challenge.id, challenge);

  const list = CHALLENGES_BY_PROGRAM_ID.get(challenge.mappedProgramId) ?? [];
  list.push(challenge);
  CHALLENGES_BY_PROGRAM_ID.set(challenge.mappedProgramId, list);
}

/**
 * Retrieve all iDEX and ADITI challenges mapped to a specific strategic program ID.
 */
export function getChallengesByProgramId(programId: string): IdexChallenge[] {
  return [...(CHALLENGES_BY_PROGRAM_ID.get(programId) ?? [])];
}

/**
 * Retrieve a specific challenge by its unique identifier.
 */
export function getIdexChallengeById(id: string): IdexChallenge | undefined {
  return CHALLENGES_BY_ID.get(id);
}

/**
 * Return all registered iDEX and ADITI problem statements.
 */
export function getAllIdexChallenges(): IdexChallenge[] {
  return [...ALL_IDEX_CHALLENGES];
}
