import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildFunnelUrl,
  trackOutboundClick,
  getRecordedEvents,
  clearRecordedEvents,
  onTrack,
  FunnelClickEvent
} from '../../src/services/funnelService.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('funnelService', () => {
  beforeEach(() => {
    clearRecordedEvents();
  });

  describe('buildFunnelUrl', () => {
    it('appends UTM parameters correctly to a clean URL', () => {
      const url = buildFunnelUrl('https://ssbmax.ai', {
        medium: 'ssb_drawer',
        campaign: 'tejas-mk1a'
      });

      expect(url).toContain('https://ssbmax.ai');
      expect(url).toContain(`utm_source=${STRINGS.funnel.utmSource}`);
      expect(url).toContain('utm_medium=ssb_drawer');
      expect(url).toContain('utm_campaign=tejas-mk1a');
    });

    it('merges UTM parameters when the base URL already has query parameters', () => {
      const url = buildFunnelUrl('https://ssbmax.ai/practice?ref=home', {
        medium: 'ecosystem_rail',
        campaign: 'sidebar'
      });

      expect(url).toContain('https://ssbmax.ai/practice?ref=home&');
      expect(url).toContain(`utm_source=${STRINGS.funnel.utmSource}`);
      expect(url).toContain('utm_medium=ecosystem_rail');
      expect(url).toContain('utm_campaign=sidebar');
    });

    it('sanitizes and encodes special characters in parameters', () => {
      const url = buildFunnelUrl('https://ai-borne.in', {
        medium: 'special_test',
        campaign: 'drone-uav-2026'
      });

      expect(url).toContain('utm_medium=special_test');
      expect(url).toContain('utm_campaign=drone-uav-2026');
    });


    it('falls back to safe URL if invalid URL is provided', () => {
      const url = buildFunnelUrl('javascript:alert(1)', {
        medium: 'ssb_drawer'
      });

      expect(url).toBe('#');
    });
  });

  describe('trackOutboundClick & event log', () => {
    it('records and retrieves outbound click events', () => {
      const eventData = {
        url: 'https://ssbmax.ai',
        destination: 'SSBMax.ai',
        medium: 'ssb_drawer',
        campaign: 'ins-vikrant'
      };

      trackOutboundClick(eventData);

      const events = getRecordedEvents();
      expect(events.length).toBe(1);
      expect(events[0]!.destination).toBe('SSBMax.ai');
      expect(events[0]!.medium).toBe('ssb_drawer');
      expect(events[0]!.campaign).toBe('ins-vikrant');
      expect(events[0]!.timestamp).toBeDefined();
    });

    it('notifies registered tracking listeners', () => {
      const mockListener = vi.fn();
      const unsubscribe = onTrack(mockListener);

      trackOutboundClick({
        url: 'https://ai-borne.in',
        destination: 'AI-Borne',
        medium: 'ecosystem_rail'
      });

      expect(mockListener).toHaveBeenCalledTimes(1);
      const passedEvent: FunnelClickEvent = mockListener.mock.calls[0]![0];
      expect(passedEvent.destination).toBe('AI-Borne');


      unsubscribe();
      trackOutboundClick({
        url: 'https://ssbmax.ai',
        destination: 'SSBMax.ai',
        medium: 'ssb_drawer'
      });

      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('clears recorded events on demand', () => {
      trackOutboundClick({
        url: 'https://ssbmax.ai',
        destination: 'SSBMax.ai',
        medium: 'ssb_drawer'
      });
      expect(getRecordedEvents().length).toBe(1);

      clearRecordedEvents();
      expect(getRecordedEvents().length).toBe(0);
    });
  });
});
