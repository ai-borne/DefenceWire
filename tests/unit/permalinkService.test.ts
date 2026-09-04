/**
 * Unit Tests for Permalink Service & Deep-Linking Targets
 * Verifies story permalinks, hash targeting for corroborating sources drawers, and meta tag application.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildStorySourcesUrl,
  parseStoryTargetFromLocation,
  deepLinkToStoryFromLocation,
  copyStoryLink,
  applyStoryMeta
} from '../../src/services/permalinkService.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('permalinkService', () => {
  const mockCluster: StoryCluster = {
    id: 'cluster-deep-test',
    synthesizedHeadline: 'IAF Inducts Advanced Radar Grid',
    primarySource: {
      id: 'src-deep-test',
      title: 'IAF Radar Grid Active',
      url: 'https://example.com/radar',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-02T08:00:00Z',
      snippet: 'Next generation air defense radar system deployed.'
    },
    relatedCoverage: [
      {
        id: 'rel-1',
        title: 'Radar Grid Enhances Border Watch',
        url: 'https://example.com/rel-1',
        sourceName: 'ANI',
        sourceDomain: 'aninews.in',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-09-02T09:00:00Z'
      }
    ],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Strengthens airspace monitoring.',
      strategicAngle: 'Integrated command and control.'
    },
    categories: ['airforce'],
    entities: ['IAF Radar'],
    defenceScore: 92,
    isLeadStory: false,
    createdAt: '2026-09-02T08:00:00Z',
    updatedAt: '2026-09-02T08:00:00Z'
  };

  let newsVm: NewsViewModel;

  beforeEach(() => {
    document.body.innerHTML = '';
    newsVm = new NewsViewModel();
    newsVm.setClusters([mockCluster]);
  });

  describe('buildStorySourcesUrl', () => {
    it('generates canonical URL with #sources-${clusterId} fragment', () => {
      const url = buildStorySourcesUrl('cluster-deep-test');
      expect(url).toBe('https://www.defencewire.in/story/cluster-deep-test#sources-cluster-deep-test');
    });
  });

  describe('parseStoryTargetFromLocation', () => {
    it('detects #sources-${clusterId} hash pattern', () => {
      const target = parseStoryTargetFromLocation({
        pathname: '/',
        hash: '#sources-cluster-deep-test'
      });
      expect(target.clusterId).toBe('cluster-deep-test');
      expect(target.targetDrawer).toBe('sources');
    });

    it('detects #/sources/${clusterId} hash pattern', () => {
      const target = parseStoryTargetFromLocation({
        pathname: '/',
        hash: '#/sources/cluster-deep-test'
      });
      expect(target.clusterId).toBe('cluster-deep-test');
      expect(target.targetDrawer).toBe('sources');
    });

    it('detects path /story/:id with #sources hash', () => {
      const target = parseStoryTargetFromLocation({
        pathname: '/story/cluster-deep-test',
        hash: '#sources'
      });
      expect(target.clusterId).toBe('cluster-deep-test');
      expect(target.targetDrawer).toBe('sources');
    });

    it('detects standard /story/:id path targeting SSB drawer', () => {
      const target = parseStoryTargetFromLocation({
        pathname: '/story/cluster-deep-test',
        hash: ''
      });
      expect(target.clusterId).toBe('cluster-deep-test');
      expect(target.targetDrawer).toBe('ssb');
    });

    it('returns null for standard homepage route without story hash', () => {
      const target = parseStoryTargetFromLocation({
        pathname: '/',
        hash: ''
      });
      expect(target.clusterId).toBeNull();
      expect(target.targetDrawer).toBeNull();
    });
  });

  describe('deepLinkToStoryFromLocation', () => {
    it('expands sources drawer and scrolls to card when #sources- hash is present', () => {
      const articleEl = document.createElement('article');
      articleEl.id = `cluster-${mockCluster.id}`;
      const scrollSpy = vi.fn();
      articleEl.scrollIntoView = scrollSpy;
      document.body.appendChild(articleEl);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/', hash: `#sources-${mockCluster.id}` },
        writable: true
      });

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 1;
      });

      deepLinkToStoryFromLocation(newsVm);

      expect(newsVm.isSourcesExpanded(mockCluster.id)).toBe(true);
      expect(newsVm.isSSBExpanded(mockCluster.id)).toBe(false);
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('expands SSB summary drawer when standard /story/:id path is accessed', () => {
      const articleEl = document.createElement('article');
      articleEl.id = `cluster-${mockCluster.id}`;
      const scrollSpy = vi.fn();
      articleEl.scrollIntoView = scrollSpy;
      document.body.appendChild(articleEl);

      Object.defineProperty(window, 'location', {
        value: { pathname: `/story/${mockCluster.id}`, hash: '' },
        writable: true
      });

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 1;
      });

      deepLinkToStoryFromLocation(newsVm);

      expect(newsVm.isSSBExpanded(mockCluster.id)).toBe(true);
      expect(newsVm.isSourcesExpanded(mockCluster.id)).toBe(false);
      expect(scrollSpy).toHaveBeenCalled();
    });

    it('bails out gracefully when cluster ID is not found in ViewModel', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/story/non-existent-cluster', hash: '' },
        writable: true
      });

      expect(() => deepLinkToStoryFromLocation(newsVm)).not.toThrow();
      expect(newsVm.hasExpandedSSBDrawers()).toBe(false);
    });
  });

  describe('applyStoryMeta and copyStoryLink', () => {
    it('sets document title and meta tags correctly', () => {
      const descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);

      applyStoryMeta(mockCluster);

      expect(document.title).toContain('IAF Inducts Advanced Radar Grid');
      expect(descMeta.getAttribute('content')).toContain('Next generation air defense');
    });

    it('copies story link to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true
      });

      const success = await copyStoryLink('cluster-123');
      expect(success).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith('https://www.defencewire.in/story/cluster-123');
    });
  });
});
