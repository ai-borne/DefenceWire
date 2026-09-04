/**
 * Unit Tests for StoryDossierSlideOver Component & Modal Lifecycle
 * Validates rendering, security escaping, and accessible modal integration.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  renderStoryDossierPanel,
  openStoryDossierSlideOver,
  closeStoryDossierSlideOver
} from '../../src/components/StoryDossierSlideOver.js';
import * as EntityModalModule from '../../src/components/EntityDossierModal.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('StoryDossierSlideOver Component', () => {
  const mockCluster: StoryCluster = {
    id: 'cluster-dossier-1',
    synthesizedHeadline: 'India Approves Indigenous Stealth Fighter Development',
    primarySource: {
      id: 'src-pib-1',
      title: 'CCS Clears AMCA 5th Gen Fighter',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=12345',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      snippet: 'Cabinet Committee on Security sanctions full-scale engineering development.',
      publishedAt: '2026-09-04T02:00:00Z'
    },
    relatedCoverage: [
      {
        id: 'rel-1',
        title: 'DRDO Readies First AMCA Prototype Rollout',
        url: 'https://thehindu.com/amca-rollout',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-09-04T03:00:00Z'
      }
    ],
    discussions: [
      {
        id: 'disc-1',
        author: 'Chief of Air Staff',
        handleOrTitle: '@IAF_MCC',
        quote: 'AMCA is pivotal for 5th-gen air superiority.',
        sourcePlatform: 'X/Twitter',
        url: 'https://x.com/IAF_MCC/status/999'
      }
    ],
    entities: ['AMCA', 'DRDO', 'IAF'],
    ssbIntel: {
      whyItMatters: 'Decisive sovereign deterrence against stealth threats.',
      strategicAngle: 'Strategic self-reliance under Make in India.',
      defenceTechTakeaway: {
        platformOrSystem: 'AMCA Mk1',
        indigenousContentPercentage: 90,
        specifications: ['Internal weapons bay', 'DSI intakes'],
        keySignificance: 'First 5th-generation stealth combat aircraft.'
      },
      gdLecturettePoints: ['Indigenisation vs direct acquisition'],
      potentialInterviewQuestions: ['What are radar cross section reduction techniques?']
    },
    categories: ['programs', 'tech'],
    defenceScore: 94,
    isLeadStory: true,
    createdAt: '2026-09-04T02:00:00Z',
    updatedAt: '2026-09-04T03:30:00Z'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders header with back button, lead badge, headline, and primary snippet', () => {
    const onClose = vi.fn();
    const panel = renderStoryDossierPanel(mockCluster, onClose, true);

    expect(panel.classList.contains('dw-story-dossier-panel')).toBe(true);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe(STRINGS.story.dossierTitle);

    const backBtn = panel.querySelector<HTMLButtonElement>('.dw-dossier-back-btn');
    expect(backBtn).not.toBeNull();
    expect(backBtn?.textContent).toContain(STRINGS.story.dossierBackBtn);
    backBtn?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(panel.querySelector('.dw-lead-tag')?.textContent).toContain('LEAD BRIEFING');
    const headline = panel.querySelector('.dw-dossier-headline a');
    expect(headline?.textContent).toBe(mockCluster.synthesizedHeadline);
    expect(headline?.getAttribute('target')).toBe('_blank');
    expect(headline?.getAttribute('rel')).toContain('noopener');

    const snippet = panel.querySelector('.dw-dossier-snippet');
    expect(snippet?.textContent).toContain('Cabinet Committee on Security');
  });

  it('renders related coverage, discussion quotes with verified badge, and entity chips', () => {
    const dummyModal = document.createElement('div');
    const spyModal = vi.spyOn(EntityModalModule, 'openEntityDossierModal').mockReturnValue(dummyModal);
    const panel = renderStoryDossierPanel(mockCluster, () => {});

    const related = panel.querySelectorAll('.dw-dossier-related-item');
    expect(related.length).toBe(1);
    expect(related[0]?.textContent).toContain('DRDO Readies First AMCA');
    expect(related[0]?.textContent).toContain('The Hindu');

    const quote = panel.querySelector('.dw-discussion-quote');
    expect(quote?.textContent).toContain('AMCA is pivotal for 5th-gen');
    expect(panel.querySelector('.dw-verified-badge')?.textContent).toContain(STRINGS.story.officialSignalBadge);

    const chips = panel.querySelectorAll('.dw-entity-chip');
    expect(chips.length).toBe(3);
    expect(chips[0]?.textContent).toBe('#AMCA');

    const firstChip = chips[0] as HTMLButtonElement | undefined;
    firstChip?.click();
    expect(spyModal).toHaveBeenCalledWith('AMCA');
  });

  it('renders summary takeaways when ssbIntel is present', () => {
    const panel = renderStoryDossierPanel(mockCluster, () => {});
    const summarySection = panel.querySelector('.dw-dossier-summary');
    expect(summarySection).not.toBeNull();
    expect(summarySection?.textContent).toContain(STRINGS.summary.drawerTitle);
    expect(summarySection?.textContent).toContain(STRINGS.summary.whyItMattersHeading);
  });

  it('sanitizes malicious markup in headline, quotes, and links (cybersecurity check)', () => {
    const xssCluster: StoryCluster = {
      ...mockCluster,
      synthesizedHeadline: '<script>alert("hacked")</script>Unsafe Headline',
      primarySource: {
        ...mockCluster.primarySource,
        snippet: '<img src="x" onerror="alert(1)">Unsafe Snippet',
        url: 'javascript:alert("xss")'
      },
      discussions: [
        {
          id: 'disc-xss',
          author: '<b onmouseover="alert(1)">Malicious</b>',
          handleOrTitle: '@evil',
          quote: '<iframe src="evil.com"></iframe>Hostile quote',
          sourcePlatform: 'X/Twitter',
          url: 'javascript:evil()'
        }
      ]
    };

    const panel = renderStoryDossierPanel(xssCluster, () => {});
    expect(panel.innerHTML).not.toContain('<script>');
    expect(panel.innerHTML).not.toContain('<iframe');
    expect(panel.innerHTML).not.toContain('onerror=');
    expect(panel.innerHTML).not.toContain('onmouseover=');

    const links = panel.querySelectorAll('a');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      expect(href.startsWith('javascript:')).toBe(false);
    }
  });

  it('integrates with modalManager: attaches to body, locks scroll, and handles back button dismissal', () => {
    const onClose = vi.fn();
    const overlay = openStoryDossierSlideOver(mockCluster, { onClose });

    expect(document.body.contains(overlay)).toBe(true);
    expect(overlay.id).toBe('dw-story-dossier-overlay');
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.position).toBe('fixed'); // scroll locked

    const backBtn = overlay.querySelector<HTMLButtonElement>('.dw-dossier-back-btn');
    expect(backBtn).not.toBeNull();
    backBtn?.click();

    expect(overlay.classList.contains('dw-modal-closing')).toBe(true);
    vi.advanceTimersByTime(200);

    expect(document.body.contains(overlay)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.style.position).toBe(''); // scroll restored
  });

  it('dismisses via Escape key press', () => {
    const onClose = vi.fn();
    const overlay = openStoryDossierSlideOver(mockCluster, { onClose });

    expect(document.body.contains(overlay)).toBe(true);

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(escEvent);

    vi.advanceTimersByTime(200);
    expect(document.body.contains(overlay)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses via backdrop tap and cleans up existing instances on reopen', () => {
    const overlay1 = openStoryDossierSlideOver(mockCluster);
    expect(document.body.contains(overlay1)).toBe(true);

    const overlay2 = openStoryDossierSlideOver(mockCluster);
    expect(document.querySelectorAll('#dw-story-dossier-overlay').length).toBe(1);

    // Simulate backdrop click
    overlay2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(200);
    expect(document.body.contains(overlay2)).toBe(false);
  });

  it('supports explicit programmatic close via closeStoryDossierSlideOver', () => {
    const onClose = vi.fn();
    const overlay = openStoryDossierSlideOver(mockCluster, { onClose });
    expect(document.body.contains(overlay)).toBe(true);

    closeStoryDossierSlideOver(overlay);
    vi.advanceTimersByTime(200);
    expect(document.body.contains(overlay)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
