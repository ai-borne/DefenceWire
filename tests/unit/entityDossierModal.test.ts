/**
 * Unit Tests for Frontend Entity Dossier Modal Component
 * Verifies DOM XSS immunity, strict safe node construction, and SSOT strings.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { openEntityDossierModal, slugify } from '../../src/components/EntityDossierModal.js';
import { STRINGS } from '../../src/resources/strings.js';
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
    expect(slugify('<script>alert("xss")</script>')).toBe('script-alert-xss-script');
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
    expect(modalEl.querySelector('.dw-modal-title')?.textContent).toBe(
      `${STRINGS.dossier.modalTitlePrefix}BrahMos`
    );

    // Initial loading indicator
    expect(modalEl.querySelector('.dw-modal-loading')?.textContent).toBe(STRINGS.dossier.loading);

    // Wait for fetch resolution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(modalEl.textContent).toContain(STRINGS.dossier.domainLabel);
    expect(modalEl.textContent).toContain(STRINGS.dossier.corroborationLabel);
    expect(modalEl.textContent).toContain(`6 ${STRINGS.dossier.sourcesSuffix}`);
    expect(modalEl.textContent).toContain(STRINGS.dossier.wireMentionsLabel);
    expect(modalEl.textContent).toContain('15');
    expect(modalEl.textContent).toContain(STRINGS.dossier.timelineHeading);
    expect(modalEl.textContent).toContain('BrahMos Missile Extended Range Flight Test Successful');

    modalEl.remove();
  });

  it('neutralizes DOM XSS attempts in entityName and raw API payload', async () => {
    const xssPayload = '<img src=x onerror="alert(1)"><script>alert("xss")</script>';
    const xssLink = 'javascript:alert(document.cookie)';

    const maliciousCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'c-xss-cluster',
      synthesizedHeadline: '<script>alert(1)</script>Unsafe Headline &amp; Details',
      primarySource: {
        ...MOCK_CLUSTER.primarySource,
        sourceName: '<svg onload=alert(1)>Malicious Source',
        url: xssLink
      }
    };

    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          entity: {
            id: 'xss-entity',
            name: xssPayload,
            category: '<b onmouseover=alert(1)>Exploit</b>',
            sourceCount: 1,
            mentionCount: 1,
            isPromoted: false,
            firstSeenAt: '2026-08-01T00:00:00Z',
            lastSeenAt: '2026-08-30T10:00:00Z'
          },
          relatedStories: [maliciousCluster]
        }),
        { status: 200 }
      );

    const modalEl = openEntityDossierModal(xssPayload, mockFetch as unknown as typeof fetch);

    // Wait for fetch resolution
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify zero executable elements injected
    expect(modalEl.querySelector('script')).toBeNull();
    expect(modalEl.querySelector('img')).toBeNull();
    expect(modalEl.querySelector('svg')).toBeNull();

    // Verify title text contains the exact string safely
    const titleEl = modalEl.querySelector('.dw-modal-title');
    expect(titleEl?.textContent).toBe(`${STRINGS.dossier.modalTitlePrefix}${xssPayload}`);

    // Verify javascript link was sanitized to '#' with target='_self'
    const storyLink = modalEl.querySelector('.dw-dossier-story-item a') as HTMLAnchorElement;
    expect(storyLink).toBeDefined();
    expect(storyLink.getAttribute('href')).toBe('#');
    expect(storyLink.getAttribute('target')).toBe('_self');
    expect(storyLink.getAttribute('rel')).toBe('noopener noreferrer');

    modalEl.remove();
  });

  it('renders safe empty state without innerHTML when no records exist', async () => {
    const xssEntity = '<script>alert("empty")</script>';
    const mockEmptyFetch = async () =>
      new Response(
        JSON.stringify({
          entity: null,
          relatedStories: [],
          error: 'No entity found'
        }),
        { status: 200 }
      );

    const modalEl = openEntityDossierModal(xssEntity, mockEmptyFetch as unknown as typeof fetch);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const emptyDiv = modalEl.querySelector('.dw-modal-empty');
    expect(emptyDiv).toBeDefined();
    expect(emptyDiv?.querySelector('strong')?.textContent).toBe(xssEntity);
    expect(emptyDiv?.querySelector('script')).toBeNull();
    expect(modalEl.textContent).toContain(STRINGS.dossier.noRecordsPrefix);

    modalEl.remove();
  });

  it('handles network error fallback safely with SSOT strings and no innerHTML', async () => {
    const xssEntity = '<img src=x onerror=alert("fallback")>';
    const mockFailFetch = async () => {
      throw new Error('Network timeout');
    };

    const modalEl = openEntityDossierModal(xssEntity, mockFailFetch as unknown as typeof fetch);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(modalEl.querySelector('img')).toBeNull();
    expect(modalEl.textContent).toContain(STRINGS.dossier.platformLabel);
    expect(modalEl.textContent).toContain(STRINGS.dossier.monitoringLabel);
    expect(modalEl.textContent).toContain(STRINGS.dossier.liveWire247);
    expect(modalEl.textContent).toContain(STRINGS.dossier.statusLabel);
    expect(modalEl.textContent).toContain(STRINGS.dossier.activeTracking);
    expect(modalEl.textContent).toContain(STRINGS.dossier.activeWatchTitle);
    expect(modalEl.textContent).toContain(STRINGS.dossier.activeWatchFallbackBody);

    modalEl.remove();
  });

  it('closes modal on close button click, backdrop click, and Escape key', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ entity: null, relatedStories: [] }), { status: 200 });

    // 1. Close button
    const modal1 = openEntityDossierModal('Test-1', mockFetch as unknown as typeof fetch);
    const closeBtn = modal1.querySelector('.dw-modal-close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(modal1.classList.contains('dw-modal-closing')).toBe(true);
    modal1.remove();

    // 2. Backdrop click
    const modal2 = openEntityDossierModal('Test-2', mockFetch as unknown as typeof fetch);
    modal2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal2.classList.contains('dw-modal-closing')).toBe(true);
    modal2.remove();

    // 3. Escape key
    const modal3 = openEntityDossierModal('Test-3', mockFetch as unknown as typeof fetch);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal3.classList.contains('dw-modal-closing')).toBe(true);
    modal3.remove();
  });

  it('deduplicates stories in memory by cluster ID and normalized headline', async () => {
    const duplicateCluster1: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'dup-1',
      synthesizedHeadline: 'Tejas Mk1A Squadron Operationalized'
    };
    const duplicateCluster2: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'dup-2',
      synthesizedHeadline: '  tejas mk1a squadron operationalized  '
    };

    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          entity: {
            id: 'tejas',
            name: 'Tejas',
            category: 'airforce',
            sourceCount: 2,
            mentionCount: 2,
            isPromoted: false,
            firstSeenAt: '2026-08-01T00:00:00Z',
            lastSeenAt: '2026-08-30T10:00:00Z'
          },
          relatedStories: [duplicateCluster1, duplicateCluster2]
        }),
        { status: 200 }
      );

    const modalEl = openEntityDossierModal('Tejas', mockFetch as unknown as typeof fetch);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const storyItems = modalEl.querySelectorAll('.dw-dossier-story-item');
    expect(storyItems.length).toBe(1);
    modalEl.remove();
  });
});
