/**
 * Article Summary Drawer for DefenceWire.in
 * Expandable neutral summary (why it matters, tech snapshot, strategic angle) for every
 * article. The boxed SSB Insight sub-section (GD points, interview questions, SSBMax.ai
 * CTA) is opt-in via `showSSBInsight` — only the SSB Intel tab passes true.
 * Hard limit: <= 300 LOC.
 */

import { SSBIntelligence } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { buildFunnelUrl, trackOutboundClick } from '../services/funnelService.js';

function appendTextSection(parent: HTMLElement, heading: string, text: string): void {
  const section = document.createElement('div');
  section.className = 'dw-ssb-section';

  const h4 = document.createElement('h4');
  h4.className = 'dw-ssb-section-title';
  h4.textContent = heading;

  const p = document.createElement('p');
  p.style.fontSize = '0.82rem';
  p.style.lineHeight = '1.4';
  p.textContent = sanitizePlainText(text);

  section.appendChild(h4);
  section.appendChild(p);
  parent.appendChild(section);
}

function appendListSection(parent: HTMLElement, heading: string, items: string[]): void {
  const section = document.createElement('div');
  section.className = 'dw-ssb-section';

  const h4 = document.createElement('h4');
  h4.className = 'dw-ssb-section-title';
  h4.textContent = heading;

  const ul = document.createElement('ul');
  ul.className = 'dw-ssb-list';

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = sanitizePlainText(item);
    ul.appendChild(li);
  }

  section.appendChild(h4);
  section.appendChild(ul);
  parent.appendChild(section);
}

function appendTechTakeaway(parent: HTMLElement, tech: NonNullable<SSBIntelligence['defenceTechTakeaway']>): void {
  const section = document.createElement('div');
  section.className = 'dw-ssb-section';

  const h4 = document.createElement('h4');
  h4.className = 'dw-ssb-section-title';
  h4.textContent = STRINGS.summary.techTakeawayHeading;

  const box = document.createElement('div');
  box.className = 'dw-ssb-tech-box';

  const nameP = document.createElement('p');
  nameP.style.fontWeight = '700';
  nameP.style.marginBottom = '4px';
  nameP.textContent = `${sanitizePlainText(tech.platformOrSystem)} ${
    tech.indigenousContentPercentage ? `(${tech.indigenousContentPercentage}% Indigenous)` : ''
  }`;

  box.appendChild(nameP);

  if (tech.specifications && tech.specifications.length > 0) {
    const specUl = document.createElement('ul');
    specUl.style.paddingLeft = '14px';
    specUl.style.marginBottom = '4px';

    for (const spec of tech.specifications) {
      const specLi = document.createElement('li');
      specLi.textContent = sanitizePlainText(spec);
      specUl.appendChild(specLi);
    }
    box.appendChild(specUl);
  }

  if (tech.keySignificance) {
    const sigP = document.createElement('p');
    sigP.style.fontSize = '0.76rem';
    sigP.style.color = 'var(--dw-text-secondary)';
    sigP.textContent = sanitizePlainText(tech.keySignificance);
    box.appendChild(sigP);
  }

  section.appendChild(h4);
  section.appendChild(box);
  parent.appendChild(section);
}

function appendSSBInsightBox(parent: HTMLElement, intel: SSBIntelligence, clusterId: string, showSSBInsight: boolean): void {
  const gdPoints = intel.gdLecturettePoints;
  const interviewQuestions = intel.potentialInterviewQuestions;
  if (!showSSBInsight || !gdPoints || gdPoints.length === 0) return;

  const box = document.createElement('div');
  box.className = 'dw-ssb-insight-box';

  const badge = document.createElement('span');
  badge.className = 'dw-ssb-insight-badge';
  badge.textContent = `🎯 ${STRINGS.ssb.insightBadge}`;
  box.appendChild(badge);

  const subtitleEl = document.createElement('p');
  subtitleEl.style.fontSize = '0.72rem';
  subtitleEl.style.color = 'var(--dw-text-muted)';
  subtitleEl.textContent = STRINGS.ssb.drawerSubtitle;
  box.appendChild(subtitleEl);

  appendListSection(box, STRINGS.ssb.gdTopicsHeading, gdPoints);

  if (interviewQuestions && interviewQuestions.length > 0) {
    appendListSection(box, STRINGS.ssb.interviewQuestionsHeading, interviewQuestions);
  }

  // Funnel CTA to SSBMax.ai — only offered alongside genuinely SSB-relevant content.
  const ctaBox = document.createElement('div');
  ctaBox.className = 'dw-ssb-cta';

  const ctaText = document.createElement('span');
  ctaText.style.fontSize = '0.78rem';
  ctaText.style.fontWeight = '600';
  ctaText.textContent = STRINGS.ssb.ctaHeading;

  const ctaLink = document.createElement('a');
  ctaLink.className = 'dw-ssb-cta-btn';
  const ctaUrl = buildFunnelUrl(STRINGS.ssb.ctaLink, {
    medium: STRINGS.funnel.utmMediumSSB,
    campaign: clusterId
  });
  const linkAttrs = getSafeLinkAttributes(ctaUrl);
  ctaLink.href = linkAttrs.href;
  ctaLink.target = linkAttrs.target;
  ctaLink.rel = linkAttrs.rel;
  ctaLink.textContent = STRINGS.ssb.ctaButton;

  ctaLink.addEventListener('click', () => {
    trackOutboundClick({
      url: ctaUrl,
      destination: STRINGS.ecosystem.ssbMaxDestinationId,
      medium: STRINGS.funnel.utmMediumSSB,
      campaign: clusterId
    });
  });

  ctaBox.appendChild(ctaText);
  ctaBox.appendChild(ctaLink);
  box.appendChild(ctaBox);

  parent.appendChild(box);
}

export function renderSSBDrawer(
  intel: SSBIntelligence,
  clusterId: string,
  showSSBInsight: boolean = false
): HTMLElement {
  const drawer = document.createElement('section');
  drawer.className = 'dw-ssb-drawer';
  drawer.setAttribute('aria-label', STRINGS.summary.drawerTitle);

  // 1. Drawer Header
  const headerEl = document.createElement('div');
  headerEl.className = 'dw-ssb-section';

  const titleEl = document.createElement('h3');
  titleEl.className = 'dw-ssb-section-title';
  titleEl.textContent = STRINGS.summary.drawerTitle;

  headerEl.appendChild(titleEl);
  drawer.appendChild(headerEl);

  // 2. Why it matters
  if (intel.whyItMatters) {
    appendTextSection(drawer, STRINGS.summary.whyItMattersHeading, intel.whyItMatters);
  }

  // 3. Tech Takeaway
  if (intel.defenceTechTakeaway) {
    appendTechTakeaway(drawer, intel.defenceTechTakeaway);
  }

  // 4. Strategic Angle
  if (intel.strategicAngle) {
    appendTextSection(drawer, STRINGS.summary.strategicAngleHeading, intel.strategicAngle);
  }

  // 5. SSB Insight box (GD points, interview questions, SSBMax.ai CTA) — rendered only
  //    when explicitly viewing the SSB Intel tab, never inline in general article feeds.
  appendSSBInsightBox(drawer, intel, clusterId, showSSBInsight);

  return drawer;
}
