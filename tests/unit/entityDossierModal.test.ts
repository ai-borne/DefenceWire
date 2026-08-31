/**
 * Unit Tests for Frontend Entity Dossier Modal Component
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { openEntityDossierModal, slugify } from '../../src/components/EntityDossierModal.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-test-modal',
  synthesizedHeadline: 'BrahMos Missile Extended Range Flight Test Successful',
  primarySource: {
    id: 'ps-test',
    title: 'BrahMos Extended Range Test',
    url: 'https://pib.gov.in/brahmos',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T10:00:00Z'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['tech', 'strategic'],
  entities: ['BrahMos'],
  defenceScore: 95,
  isLeadStory: true,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:00:00Z'
};

describe('Entity Dossier Modal Component', () => {
  it('correctly converts entity names to URL slugs', () => {
    expect(slugify('Tejas Mk1A')).toBe('tejas-mk1a');
    expect(slugify('INS Arihant (SSBN)')).toBe('ins-arihant-ssbn');
    expect(slugify('  BrahMos-NG  ')).toBe('brahmos-ng');
  });

  it('renders modal with dossier metrics and story timeline on successful API fetch', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          entity: {
            id: 'brahmos',
            name: 'BrahMos',
            category: 'strategic',
            sourceCount: 6,
            mentionCount: 15,
            isPromoted: true,
            firstSeenAt: '2026-08-01T00:00:00Z',
            lastSeenAt: '2026-08-30T10:00:00Z'
          },
          relatedStories: [MOCK_CLUSTER]
        }),
        { status: 200 }
      );

    const modalEl = openEntityDossierModal('BrahMos', mockFetch as unknown as typeof fetch);
    expect(modalEl).toBeDefined();
    expect(modalEl.querySelector('.dw-modal-title')?.textContent).toContain('BrahMos');

    // Wait microtask queue for fetch resolution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(modalEl.textContent).toContain('CORROBORATION');
    expect(modalEl.textContent).toContain('6 Sources');
    expect(modalEl.textContent).toContain('BrahMos Missile Extended Range Flight Test Successful');

    modalEl.remove();
  });

  it('handles offline fallback gracefully when edge API fails', async () => {
    const mockFailFetch = async () => {
      throw new Error('Network error');
    };

    const modalEl = openEntityDossierModal('Rudram-II', mockFailFetch as unknown as typeof fetch);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(modalEl.textContent).toContain('PLATFORM');
    expect(modalEl.textContent).toContain('Rudram-II');
    modalEl.remove();
  });
});
