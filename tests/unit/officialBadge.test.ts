/**
 * Unit Tests for OfficialBadge Component & Parliament Q&A Citation UI
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderOfficialBadge, resolveOfficialType } from '../../src/components/OfficialBadge.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StorySourceItem, ParliamentQuestionMeta, StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('OfficialBadge & Primary Source Citations', () => {
  const baseParliamentMeta: ParliamentQuestionMeta = {
    house: 'Lok Sabha',
    questionNumber: 'USQ 2480',
    questionType: 'Unstarred',
    answeringDate: '2026-08-28',
    ministry: 'Ministry of Defence',
    minister: 'Raksha Rajya Mantri',
    subject: 'Progress of iDEX Scheme and Indigenisation Grants for Defence Startups',
    pdfUrl: 'https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf'
  };

  const mockLokSabhaSource: StorySourceItem = {
    id: 'src-sansad-ls-01',
    title: 'Lok Sabha Unstarred Question No. 2480: Progress of iDEX Scheme',
    url: 'https://sansad.in/ls/questions/questions-and-answers',
    sourceName: 'Lok Sabha Secretariat',
    sourceDomain: 'sansad.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-28T09:00:00Z',
    isPrimary: true,
    officialType: 'lok_sabha',
    parliamentMeta: baseParliamentMeta
  };

  const mockPibSource: StorySourceItem = {
    id: 'src-pib-01',
    title: 'MoD Reviews Tejas Mk1A Delivery Schedule',
    url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2048912',
    sourceName: 'Press Information Bureau (MoD)',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T06:30:00Z',
    isPrimary: true,
    officialType: 'pib_mod'
  };

  const mockTenderSource: StorySourceItem = {
    id: 'src-tender-01',
    title: 'Expression of Interest for High Altitude UAV Systems',
    url: 'https://defproc.gov.in/tenders/eoi-2026-09',
    sourceName: 'Department of Defence Production',
    sourceDomain: 'defproc.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-31T10:00:00Z',
    isPrimary: true,
    officialType: 'tender'
  };

  const mockIdexSource: StorySourceItem = {
    id: 'src-idex-01',
    title: 'DISC-12 Innovation Challenges Announced',
    url: 'https://idex.gov.in/challenges/disc-12',
    sourceName: 'iDEX Defence Innovation',
    sourceDomain: 'idex.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-31T11:00:00Z',
    isPrimary: true,
    officialType: 'idex'
  };

  const mockNonOfficialSource: StorySourceItem = {
    id: 'src-news-01',
    title: 'Fighter Jets Procured for Northern Sector',
    url: 'https://thehindu.com/news/national/jets',
    sourceName: 'The Hindu',
    sourceDomain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T07:15:00Z'
  };

  describe('resolveOfficialType', () => {
    it('resolves explicit officialType if defined', () => {
      expect(resolveOfficialType(mockLokSabhaSource)).toBe('lok_sabha');
      expect(resolveOfficialType(mockPibSource)).toBe('pib_mod');
      expect(resolveOfficialType(mockTenderSource)).toBe('tender');
      expect(resolveOfficialType(mockIdexSource)).toBe('idex');
    });

    it('infers officialType from parliamentMeta house if officialType is omitted', () => {
      const sourceWithoutType: StorySourceItem = {
        ...mockLokSabhaSource,
        officialType: undefined,
        parliamentMeta: { ...baseParliamentMeta, house: 'Rajya Sabha' }
      };
      expect(resolveOfficialType(sourceWithoutType)).toBe('rajya_sabha');
    });

    it('infers officialType from official domains when tier is official', () => {
      const pibItem: StorySourceItem = {
        ...mockPibSource,
        officialType: undefined
      };
      expect(resolveOfficialType(pibItem)).toBe('pib_mod');
    });

    it('returns null for standard commercial media sources', () => {
      expect(resolveOfficialType(mockNonOfficialSource)).toBeNull();
    });
  });

  describe('renderOfficialBadge', () => {
    it('returns null when given a non-official story source', () => {
      const badge = renderOfficialBadge(mockNonOfficialSource);
      expect(badge).toBeNull();
    });

    it('renders PIB MoD official badge with correct icon and class', () => {
      const badge = renderOfficialBadge(mockPibSource);
      expect(badge).not.toBeNull();
      expect(badge?.classList.contains('dw-official-badge-container')).toBe(true);
      const tag = badge?.querySelector('.dw-official-badge');
      expect(tag?.classList.contains('dw-official-badge--pib')).toBe(true);
      expect(tag?.textContent).toContain(STRINGS.badges.pibMod);
    });

    it('renders MoD Tender & RFP badge', () => {
      const badge = renderOfficialBadge(mockTenderSource);
      expect(badge).not.toBeNull();
      const tag = badge?.querySelector('.dw-official-badge');
      expect(tag?.classList.contains('dw-official-badge--tender')).toBe(true);
      expect(tag?.textContent).toContain(STRINGS.badges.tender);
    });

    it('renders iDEX Innovation badge', () => {
      const badge = renderOfficialBadge(mockIdexSource);
      expect(badge).not.toBeNull();
      const tag = badge?.querySelector('.dw-official-badge');
      expect(tag?.classList.contains('dw-official-badge--idex')).toBe(true);
      expect(tag?.textContent).toContain(STRINGS.badges.idex);
    });

    it('renders complete Parliament Lok Sabha Q&A citation block with PDF link', () => {
      const badge = renderOfficialBadge(mockLokSabhaSource);
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain(STRINGS.badges.lokSabha);
      expect(badge?.textContent).toContain('USQ 2480');
      expect(badge?.textContent).toContain('2026-08-28');
      expect(badge?.textContent).toContain('Raksha Rajya Mantri');

      const pdfLink = badge?.querySelector('a.dw-official-pdf-link') as HTMLAnchorElement | null;
      expect(pdfLink).not.toBeNull();
      expect(pdfLink?.href).toBe('https://sansad.in/getFile/loksabhaquestions/annex/18/AU2480.pdf');
      expect(pdfLink?.target).toBe('_blank');
      expect(pdfLink?.rel).toBe('noopener noreferrer');
      expect(pdfLink?.textContent).toContain(STRINGS.badges.pdfLabel);
    });

    it('renders Rajya Sabha Q&A citation badge', () => {
      const rsSource: StorySourceItem = {
        ...mockLokSabhaSource,
        officialType: 'rajya_sabha',
        parliamentMeta: {
          ...baseParliamentMeta,
          house: 'Rajya Sabha',
          questionNumber: 'SQ 142',
          questionType: 'Starred'
        }
      };
      const badge = renderOfficialBadge(rsSource);
      expect(badge).not.toBeNull();
      const tag = badge?.querySelector('.dw-official-badge');
      expect(tag?.classList.contains('dw-official-badge--rajya-sabha')).toBe(true);
      expect(tag?.textContent).toContain(STRINGS.badges.rajyaSabha);
      expect(badge?.textContent).toContain('SQ 142');
    });

    it('sanitizes malicious script tags and HTML inside parliament metadata', () => {
      const xssMeta: ParliamentQuestionMeta = {
        house: 'Lok Sabha',
        questionNumber: '<script>alert("xss")</script>USQ 999',
        questionType: 'Unstarred',
        answeringDate: '<img src=x onerror=alert(1)>2026-08-28',
        ministry: '<b>Ministry of Defence</b>',
        minister: '<script>evil()</script>Hon. Minister',
        pdfUrl: 'https://sansad.in/valid.pdf'
      };
      const maliciousSource: StorySourceItem = {
        ...mockLokSabhaSource,
        parliamentMeta: xssMeta
      };

      const badge = renderOfficialBadge(maliciousSource);
      expect(badge).not.toBeNull();
      expect(badge?.innerHTML).not.toContain('<script>');
      expect(badge?.innerHTML).not.toContain('<img');
      expect(badge?.textContent).toContain('USQ 999');
      expect(badge?.textContent).toContain('Hon. Minister');
    });

    it('sanitizes unsafe javascript: protocol in pdfUrl', () => {
      const unsafeSource: StorySourceItem = {
        ...mockLokSabhaSource,
        parliamentMeta: {
          ...baseParliamentMeta,
          pdfUrl: 'javascript:alert(document.cookie)'
        }
      };
      const badge = renderOfficialBadge(unsafeSource);
      expect(badge).not.toBeNull();
      const pdfLink = badge?.querySelector('a.dw-official-pdf-link') as HTMLAnchorElement | null;
      expect(pdfLink?.getAttribute('href')).toBe('#');
      expect(pdfLink?.target).toBe('_self');
    });
  });

  describe('Integration with StoryClusterView', () => {
    it('renders official badge prominently inside story cluster card when primary source is official', () => {
      const cluster: StoryCluster = {
        id: 'cluster-official-test',
        synthesizedHeadline: 'Ministry Informs Parliament on Defence Startups',
        primarySource: mockLokSabhaSource,
        relatedCoverage: [],
        discussions: [],
        categories: ['official', 'idex'],
        entities: ['iDEX'],
        defenceScore: 88,
        isLeadStory: false,
        createdAt: '2026-08-28T09:00:00Z',
        updatedAt: '2026-08-28T09:00:00Z'
      };

      const newsVm = new NewsViewModel();
      const card = renderStoryCluster(cluster, newsVm);
      const badgeContainer = card.querySelector('.dw-official-badge-container');
      expect(badgeContainer).not.toBeNull();
      expect(badgeContainer?.textContent).toContain(STRINGS.badges.lokSabha);
      expect(badgeContainer?.textContent).toContain('USQ 2480');
    });

    it('does not render official badge inside story cluster card when primary source is not official', () => {
      const cluster: StoryCluster = {
        id: 'cluster-regular-test',
        synthesizedHeadline: 'Fighter Jet Trials Continue in Desert Sector',
        primarySource: mockNonOfficialSource,
        relatedCoverage: [],
        discussions: [],
        categories: ['airforce'],
        entities: ['Tejas'],
        defenceScore: 72,
        isLeadStory: false,
        createdAt: '2026-08-30T07:15:00Z',
        updatedAt: '2026-08-30T07:15:00Z'
      };

      const newsVm = new NewsViewModel();
      const card = renderStoryCluster(cluster, newsVm);
      const badgeContainer = card.querySelector('.dw-official-badge-container');
      expect(badgeContainer).toBeNull();
    });
  });
});
