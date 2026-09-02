/**
 * Unit Tests for Centralized Resource Management (Strings & Colors SSOT)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { STRINGS } from '../../src/resources/strings.js';
import { COLOR_PALETTE, CSS_VARS } from '../../src/resources/colors.js';

describe('Resource Management: Strings SSOT', () => {
  it('should have complete app branding strings', () => {
    expect(STRINGS.app.name).toBe('DefenceWire.in');
    expect(STRINGS.app.tagline).toBeDefined();
    expect(STRINGS.app.tagline.length).toBeGreaterThan(10);
    expect(STRINGS.app.institutionalBadge).toBe('🌏 Intelligent Wire');
  });

  it('should have all navigation tab labels defined including MOAT tabs', () => {
    expect(STRINGS.nav.all).toBe('Top Stories');
    expect(STRINGS.nav.official).toBe('Official & Parliament');
    expect(STRINGS.nav.programs).toBe('Programs');
    expect(STRINGS.nav.tenders).toBe('Tenders & RFPs');
    expect(STRINGS.nav.idex).toBe('iDEX & Startups');
    expect(STRINGS.nav.tech).toBe('Defence Tech');
    expect(STRINGS.nav.strategic).toBe('Geopolitics');
    expect(STRINGS.nav.procurement).toBe('Procurement');
    expect(STRINGS.nav.ssb).toBe('SSB Intel');
    expect(STRINGS.nav.river).toBe('River of News');
    expect(STRINGS.nav.archive).toBe('Archive');
  });

  it('should have all category descriptions defined', () => {
    expect(STRINGS.categories.all).toBe('All Domains');
    expect(STRINGS.categories.official).toBe('Official Communiques & Parliament Q&A');
    expect(STRINGS.categories.programs).toBe('Strategic Defence Programs');
    expect(STRINGS.categories.tenders).toBe('Tenders, RFPs & Procurement Pipelines');
    expect(STRINGS.categories.idex).toBe('iDEX & Defence Innovation Startups');
  });

  it('should have official government and primary source badge strings defined', () => {
    expect(STRINGS.badges.lokSabha).toBe('🏛️ Lok Sabha Q&A');
    expect(STRINGS.badges.rajyaSabha).toBe('🏛️ Rajya Sabha Q&A');
    expect(STRINGS.badges.pibMod).toBe('📄 PIB MoD Official');
    expect(STRINGS.badges.tender).toBe('📑 MoD Tender & RFP');
    expect(STRINGS.badges.idex).toBe('🚀 iDEX Innovation');
    expect(STRINGS.badges.pdfLabel).toBe('Official PDF');
    expect(STRINGS.badges.pdfAria).toBe('Download official PDF document');
    expect(STRINGS.badges.answeredByPrefix).toBe('Answered by');
    expect(STRINGS.badges.questionPrefix).toBe('Q. No.');
    expect(STRINGS.story.lokSabhaBadge).toBe('🏛️ Lok Sabha Q&A');
    expect(STRINGS.story.rajyaSabhaBadge).toBe('🏛️ Rajya Sabha Q&A');
    expect(STRINGS.story.pibModBadge).toBe('📄 PIB MoD Official');
  });

  it('should have all strategic programs strings defined', () => {
    expect(STRINGS.programs.heading).toBe('Strategic Defence Programs');
    expect(STRINGS.programs.subheading).toBeDefined();
    expect(STRINGS.programs.domainAll).toContain('43');
    expect(STRINGS.programs.domainAerospace).toContain('11');
    expect(STRINGS.programs.domainNaval).toContain('9');
    expect(STRINGS.programs.domainLand).toContain('8');
    expect(STRINGS.programs.domainMissiles).toContain('10');
    expect(STRINGS.programs.domainUnmanned).toContain('5');
    expect(STRINGS.programs.stageConcept).toBeDefined();
    expect(STRINGS.programs.stageSanctioned).toBeDefined();
    expect(STRINGS.programs.stageDevelopment).toBeDefined();
    expect(STRINGS.programs.stageTrials).toBeDefined();
    expect(STRINGS.programs.stageProduction).toBeDefined();
    expect(STRINGS.programs.stageInduction).toBeDefined();
  });

  it('should have all default article summary drawer headings and collapse strings defined', () => {
    expect(STRINGS.summary.drawerTitle).toBe('Summary');
    expect(STRINGS.summary.whyItMattersHeading).toBeDefined();
    expect(STRINGS.summary.techTakeawayHeading).toBeDefined();
    expect(STRINGS.summary.strategicAngleHeading).toBeDefined();
    expect(STRINGS.summary.collapseDrawerBtn).toBe('Collapse Summary');
    expect(STRINGS.summary.collapseAriaLabel).toBe('Collapse article summary');
    expect(STRINGS.story.permalinkIcon).toBe('🔗');
    expect(STRINGS.story.permalinkCopiedIcon).toBe('✓');
    expect(STRINGS.story.permalinkTooltip).toBe('Copy share link');
    expect(STRINGS.story.permalinkCopiedTooltip).toBe('Link copied to clipboard');
    expect(STRINGS.story.permalinkLabel).toBe('🔗 Permalink');
    expect(STRINGS.story.permalinkCopied).toBe('✓ Link copied');
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

  it('should have valid non-empty values for all error, theme, search, and sync strings', () => {
    expect(STRINGS.errors.feedLoadFailed).toBeDefined();
    expect(STRINGS.errors.invalidUrl).toBeDefined();
    expect(STRINGS.theme.light).toBeDefined();
    expect(STRINGS.theme.dark).toBeDefined();
    expect(STRINGS.theme.iconLight).toBe('☀️');
    expect(STRINGS.theme.iconDark).toBe('🌙');
    expect(STRINGS.theme.iconSystem).toBe('⚙️');
    expect(STRINGS.search.toggleSearchAria).toBeDefined();
    expect(STRINGS.search.closeSearchAria).toBeDefined();
    expect(STRINGS.search.expandSearchTooltip).toBeDefined();
    expect(STRINGS.sync.buttonLabel).toBe('Sync');
    expect(STRINGS.sync.ariaSyncNow).toBeDefined();
    expect(STRINGS.sync.idleTooltip).toBeDefined();
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

  it('should define program stage and domain color palettes', () => {
    expect(COLOR_PALETTE.programStage.conceptBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.sanctionedBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.developmentBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.trialsBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.productionBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programStage.inductionBg).toMatch(/^#[0-9A-F]{6}$/i);

    expect(COLOR_PALETTE.programDomain.aerospace).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.naval).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.land).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.missiles).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COLOR_PALETTE.programDomain.unmanned).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should define tier labels and story badges in strings SSOT', () => {
    expect(STRINGS.tiers.tier1).toBe('Official / MoD');
    expect(STRINGS.tiers.tier1Social).toBe('Official Handle');
    expect(STRINGS.tiers.tier2).toBe('National Wire');
    expect(STRINGS.tiers.tier3).toBe('Specialized Defence');
    expect(STRINGS.tiers.tier4).toBe('Think Tank / OSINT');
    expect(STRINGS.story.officialSignalBadge).toBe('Verified Signal');
  });

  it('should define valid CSS variable mapping aliases including official badge tokens', () => {
    expect(CSS_VARS.bgCanvas).toBe('var(--dw-bg-canvas)');
    expect(CSS_VARS.textPrimary).toBe('var(--dw-text-primary)');
    expect(CSS_VARS.textAccent).toBe('var(--dw-text-accent)');
    expect(CSS_VARS.statusOfflineBg).toBe('var(--dw-status-offline-bg)');
    expect(CSS_VARS.statusOnlineBg).toBe('var(--dw-status-online-bg)');
    expect(CSS_VARS.officialLokSabhaBg).toBe('var(--dw-official-loksabha-bg)');
    expect(CSS_VARS.officialLokSabhaText).toBe('var(--dw-official-loksabha-text)');
    expect(CSS_VARS.officialRajyaSabhaBg).toBe('var(--dw-official-rajyasabha-bg)');
    expect(CSS_VARS.officialPibBg).toBe('var(--dw-official-pib-bg)');
    expect(CSS_VARS.officialTenderBg).toBe('var(--dw-official-tender-bg)');
    expect(CSS_VARS.officialIdexBg).toBe('var(--dw-official-idex-bg)');
  });
});
