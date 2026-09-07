/**
 * Unit Tests for Emergent Pattern Synthesizer (Phase 5)
 * Tests prompt construction, dual-engine cascade, response parsing,
 * and deterministic heuristic fallback.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildPatternPrompt,
  generateHeuristicPatternSynthesis,
  parsePatternSynthesisResponse,
  synthesizeEmergentPattern
} from '../../crawler/patternSynthesizer.js';
import { PatternCandidate } from '../../src/types/patterns.js';

function createMockCandidate(overrides: Partial<PatternCandidate> = {}): PatternCandidate {
  return {
    id: 'pat_delhi_air_defence',
    title: 'Delhi Air Defence Convergence',
    nodeIds: ['node_delhi', 'node_l-70-guns', 'node_red-fort'],
    clusterIds: ['c-1', 'c-2', 'c-3'],
    confidence: 0.82,
    anchorCategory: 'threat',
    timeWindowHours: 72,
    sharedEntities: ['Delhi', 'L-70 Guns', 'Red Fort'],
    clusterHeadlines: [
      'Drone Threat Detected Near Delhi NCR',
      'Red Fort Security Grid Sanitized',
      'Army Positions L-70 Air Defence Batteries'
    ],
    ...overrides
  };
}

describe('Emergent Pattern Synthesizer', () => {
  it('builds a structured analyst prompt containing signals, anchors, and 2-sentence constraints', () => {
    const candidate = createMockCandidate();
    const prompt = buildPatternPrompt(candidate);

    expect(prompt).toContain('You are a strategic military intelligence analyst for DefenceWire');
    expect(prompt).toContain('3 co-occurring defence signals observed within a 72-hour window');
    expect(prompt).toContain('Drone Threat Detected Near Delhi NCR');
    expect(prompt).toContain('Delhi, L-70 Guns, Red Fort');
    expect(prompt).toContain('Exactly two sentences');
  });

  it('generates a deterministic 2-sentence situational assessment on heuristic fallback', () => {
    const candidate = createMockCandidate();
    const result = generateHeuristicPatternSynthesis(candidate);

    expect(result.title).toBe('Delhi Air Defence Convergence');
    expect(result.synthesis).toContain('Multi-axis activity observed across Delhi');
    expect(result.synthesis).toContain('72-hour operational window');

    // Count sentences (should be exactly 2 sentences)
    const sentences = result.synthesis.split(/(?<=[.?!])\s+/).filter(Boolean);
    expect(sentences.length).toBe(2);
  });

  it('parses structured JSON responses from LLM output correctly', () => {
    const rawJson = JSON.stringify({
      title: 'NCR Layered Counter-UAS Grid Activation',
      synthesis:
        'Coordinated repositioning of anti-aircraft artillery and perimeter sanitization observed across the National Capital Region. Signals point to the establishment of an active anti-drone security matrix ahead of forthcoming state events.'
    });

    const parsed = parsePatternSynthesisResponse(rawJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('NCR Layered Counter-UAS Grid Activation');
    expect(parsed?.synthesis).toContain('Coordinated repositioning');
  });

  it('parses markdown-fenced JSON responses seamlessly', () => {
    const fenced = '```json\n{"title": "Border Air Alert", "synthesis": "Tactical aircraft patrols have increased along the Line of Actual Control. Movement indicates operational deterrence postures by forward strike squadrons."}\n```';
    const parsed = parsePatternSynthesisResponse(fenced);

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Border Air Alert');
    expect(parsed?.synthesis).toContain('Tactical aircraft patrols');
  });

  it('synthesizes pattern using Gemini Flash when API key is available', async () => {
    const candidate = createMockCandidate();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Delhi Counter-UAS Shield',
                    synthesis: 'Unmanned threats along Delhi perimeter prompted emergency deployment of L-70 gun networks. The convergence indicates deployment of a multi-tier air defense screen for critical infrastructure.'
                  })
                }
              ]
            }
          }
        ]
      })
    });

    const pattern = await synthesizeEmergentPattern(candidate, {
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(pattern.id).toBe('pat_delhi_air_defence');
    expect(pattern.title).toBe('Delhi Counter-UAS Shield');
    expect(pattern.synthesis).toContain('emergency deployment of L-70 gun networks');
    expect(pattern.status).toBe('draft');
    expect(pattern.confidence).toBe(0.82);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to heuristic synthesis when network or LLM API fails', async () => {
    const candidate = createMockCandidate();
    const mockFailingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const pattern = await synthesizeEmergentPattern(candidate, {
      apiKey: 'test-key',
      fetchFn: mockFailingFetch as unknown as typeof fetch
    });

    expect(pattern.id).toBe('pat_delhi_air_defence');
    expect(pattern.title).toBe('Delhi Air Defence Convergence');
    expect(pattern.synthesis).toContain('Multi-axis activity observed across Delhi');
    expect(pattern.status).toBe('draft');
  });
});
