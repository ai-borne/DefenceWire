/**
 * Unit Tests for Centralized Resource Management (Strings & Colors SSOT)
 */

import { describe, it, expect } from 'vitest';
import { STRINGS } from '../../src/resources/strings.js';
import { COLOR_PALETTE, CSS_VARS } from '../../src/resources/colors.js';

describe('Resource Management: Strings SSOT', () => {
  it('should have complete app branding strings', () => {
    expect(STRINGS.app.name).toBe('DefenceWire.in');
    expect(STRINGS.app.tagline).toBeDefined();
    expect(STRINGS.app.tagline.length).toBeGreaterThan(10);
    expect(STRINGS.app.institutionalBadge).toBe('INSTITUTIONAL INTELLIGENCE WIRE');
  });

  it('should have all navigation tab labels defined', () => {
    expect(STRINGS.nav.all).toBe('Top Stories');
    expect(STRINGS.nav.army).toBe('Army');
    expect(STRINGS.nav.navy).toBe('Navy');
    expect(STRINGS.nav.airforce).toBe('Air Force');
    expect(STRINGS.nav.tech).toBe('Defence Tech');
    expect(STRINGS.nav.strategic).toBe('Geopolitics');
    expect(STRINGS.nav.procurement).toBe('Procurement');
    expect(STRINGS.nav.ssb).toBe('SSB Intel');
    expect(STRINGS.nav.river).toBe('River of News');
  });

  it('should have all default article summary drawer headings defined', () => {
    expect(STRINGS.summary.drawerTitle).toBe('Summary');
    expect(STRINGS.summary.whyItMattersHeading).toBeDefined();
    expect(STRINGS.summary.techTakeawayHeading).toBeDefined();
    expect(STRINGS.summary.strategicAngleHeading).toBeDefined();
  });

  it('should have all opt-in SSB insight box strings defined, reserved for ssb-tagged clusters', () => {
    expect(STRINGS.ssb.insightBadge).toBeDefined();
    expect(STRINGS.ssb.gdTopicsHeading).toBeDefined();
    expect(STRINGS.ssb.interviewQuestionsHeading).toBeDefined();
    expect(STRINGS.ssb.ctaButton).toBeDefined();
    expect(STRINGS.ssb.ctaLink).toBe('https://ssbmax.ai');
  });

  it('should have all ecosystem sponsor modules configured with lowercase ai-borne.in branding', () => {
    expect(STRINGS.ecosystem.ssbMaxTitle).toBeDefined();
    expect(STRINGS.ecosystem.ssbMaxUrl).toBe('https://ssbmax.ai');
    expect(STRINGS.ecosystem.ssbMaxDestinationId).toBe('SSBMax.ai');
    expect(STRINGS.ecosystem.aiBorneTitle).toContain('ai-borne.in');
    expect(STRINGS.ecosystem.aiBorneTitle).not.toContain('AI-Borne.in');
    expect(STRINGS.ecosystem.aiBorneUrl).toBe('https://ai-borne.in');
    expect(STRINGS.ecosystem.aiBorneDestinationId).toBe('ai-borne.in');
  });

  it('should have all editor curation desk strings defined', () => {
    expect(STRINGS.editor.dashboardTitle).toBe('Editorial Curation Control');
    expect(STRINGS.editor.openDashboard).toBeDefined();
    expect(STRINGS.editor.promoteToLead).toBeDefined();
    expect(STRINGS.editor.demoteStory).toBeDefined();
    expect(STRINGS.editor.editHeadline).toBeDefined();
    expect(STRINGS.editor.editSSBBrief).toBeDefined();
    expect(STRINGS.editor.ignoreCluster).toBeDefined();
    expect(STRINGS.editor.authTitle).toBeDefined();
    expect(STRINGS.editor.unlockButton).toBeDefined();
    expect(STRINGS.editor.publishToProduction).toBeDefined();
    expect(STRINGS.editor.exportJson).toBeDefined();
    expect(STRINGS.editor.copyJson).toBeDefined();
    expect(STRINGS.editor.lockDesk).toBeDefined();
  });

  it('should have PWA and Funnel configuration strings defined', () => {
    expect(STRINGS.pwa.installPrompt).toBeDefined();
    expect(STRINGS.pwa.installButton).toBeDefined();
    expect(STRINGS.funnel.utmSource).toBe('defencewire');
    expect(STRINGS.funnel.utmMediumSSB).toBe('ssb_drawer');
  });

  it('should have valid non-empty values for all error and theme strings', () => {
    expect(STRINGS.errors.feedLoadFailed).toBeDefined();
    expect(STRINGS.errors.invalidUrl).toBeDefined();
    expect(STRINGS.theme.light).toBeDefined();
    expect(STRINGS.theme.dark).toBeDefined();
  });
});

describe('Resource Management: Colors & Token SSOT', () => {
  it('should have defined brand crimson and tactical olive palettes', () => {
    expect(COLOR_PALETTE.crimson.primary).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tacticalOlive.base).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tacticalAmber.glow).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should provide matching token sets for light and dark themes', () => {
    const lightKeys = Object.keys(COLOR_PALETTE.light);
    const darkKeys = Object.keys(COLOR_PALETTE.dark);

    expect(lightKeys.sort()).toEqual(darkKeys.sort());

    // Verify each color is a valid hex code
    for (const key of lightKeys) {
      const lightVal = (COLOR_PALETTE.light as Record<string, string>)[key];
      const darkVal = (COLOR_PALETTE.dark as Record<string, string>)[key];
      expect(lightVal).toMatch(/^#[0-9A-F]{6}$/i);
      expect(darkVal).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('should define distinct colors for all source tiers including official social', () => {
    expect(COLOR_PALETTE.tier.tier1).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tier.tier1Social).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tier.tier2).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tier.tier3).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.tier.tier4).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should define tier labels and story badges in strings SSOT', () => {
    expect(STRINGS.tiers.tier1).toBe('Official / MoD');
    expect(STRINGS.tiers.tier1Social).toBe('Official Handle');
    expect(STRINGS.tiers.tier2).toBe('National Wire');
    expect(STRINGS.tiers.tier3).toBe('Specialized Defence');
    expect(STRINGS.tiers.tier4).toBe('Think Tank / OSINT');
    expect(STRINGS.story.officialSignalBadge).toBe('Verified Signal');
  });

  it('should define valid CSS variable mapping aliases', () => {
    expect(CSS_VARS.bgCanvas).toBe('var(--dw-bg-canvas)');
    expect(CSS_VARS.textPrimary).toBe('var(--dw-text-primary)');
    expect(CSS_VARS.textAccent).toBe('var(--dw-text-accent)');
    expect(CSS_VARS.statusOfflineBg).toBe('var(--dw-status-offline-bg)');
    expect(CSS_VARS.statusOnlineBg).toBe('var(--dw-status-online-bg)');
  });
});

