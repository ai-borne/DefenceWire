/**
 * SSB Intelligence Drawer Component for DefenceWire.in
 * Expandable briefing card for SSB aspirants with GD points, interview questions, and tech specs.
 * Hard limit: <= 300 LOC.
 */

import { SSBIntelligence } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { buildFunnelUrl, trackOutboundClick } from '../services/funnelService.js';


export function renderSSBDrawer(intel: SSBIntelligence, clusterId: string): HTMLElement {
  const drawer = document.createElement('section');
  drawer.className = 'dw-ssb-drawer';
  drawer.setAttribute('aria-label', STRINGS.ssb.drawerTitle);

  // 1. Drawer Header
  const headerEl = document.createElement('div');
  headerEl.className = 'dw-ssb-section';

  const titleEl = document.createElement('h3');
  titleEl.className = 'dw-ssb-section-title';
  titleEl.textContent = `🎯 ${STRINGS.ssb.drawerTitle}`;

  const subtitleEl = document.createElement('p');
  subtitleEl.style.fontSize = '0.72rem';
  subtitleEl.style.color = 'var(--dw-text-muted)';
  subtitleEl.textContent = STRINGS.ssb.drawerSubtitle;

  headerEl.appendChild(titleEl);
  headerEl.appendChild(subtitleEl);
  drawer.appendChild(headerEl);

  // 2. Why it matters
  if (intel.whyItMatters) {
    const section = document.createElement('div');
    section.className = 'dw-ssb-section';

    const h4 = document.createElement('h4');
    h4.className = 'dw-ssb-section-title';
    h4.textContent = STRINGS.ssb.whyItMattersHeading;

    const p = document.createElement('p');
    p.style.fontSize = '0.82rem';
    p.style.lineHeight = '1.4';
    p.textContent = sanitizePlainText(intel.whyItMatters);

    section.appendChild(h4);
    section.appendChild(p);
    drawer.appendChild(section);
  }

  // 3. GD & Lecturette Points
  if (intel.gdLecturettePoints && intel.gdLecturettePoints.length > 0) {
    const section = document.createElement('div');
    section.className = 'dw-ssb-section';

    const h4 = document.createElement('h4');
    h4.className = 'dw-ssb-section-title';
    h4.textContent = STRINGS.ssb.gdTopicsHeading;

    const ul = document.createElement('ul');
    ul.className = 'dw-ssb-list';

    for (const pt of intel.gdLecturettePoints) {
      const li = document.createElement('li');
      li.textContent = sanitizePlainText(pt);
      ul.appendChild(li);
    }

    section.appendChild(h4);
    section.appendChild(ul);
    drawer.appendChild(section);
  }

  // 4. Interview Questions
  if (intel.potentialInterviewQuestions && intel.potentialInterviewQuestions.length > 0) {
    const section = document.createElement('div');
    section.className = 'dw-ssb-section';

    const h4 = document.createElement('h4');
    h4.className = 'dw-ssb-section-title';
    h4.textContent = STRINGS.ssb.interviewQuestionsHeading;

    const ul = document.createElement('ul');
    ul.className = 'dw-ssb-list';

    for (const q of intel.potentialInterviewQuestions) {
      const li = document.createElement('li');
      li.textContent = sanitizePlainText(q);
      ul.appendChild(li);
    }

    section.appendChild(h4);
    section.appendChild(ul);
    drawer.appendChild(section);
  }

  // 5. Tech Takeaways
  if (intel.defenceTechTakeaway) {
    const tech = intel.defenceTechTakeaway;
    const section = document.createElement('div');
    section.className = 'dw-ssb-section';

    const h4 = document.createElement('h4');
    h4.className = 'dw-ssb-section-title';
    h4.textContent = STRINGS.ssb.techTakeawayHeading;

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
    drawer.appendChild(section);
  }

  // 6. Strategic Angle
  if (intel.strategicAngle) {
    const section = document.createElement('div');
    section.className = 'dw-ssb-section';

    const h4 = document.createElement('h4');
    h4.className = 'dw-ssb-section-title';
    h4.textContent = STRINGS.ssb.strategicAngleHeading;

    const p = document.createElement('p');
    p.style.fontSize = '0.82rem';
    p.textContent = sanitizePlainText(intel.strategicAngle);

    section.appendChild(h4);
    section.appendChild(p);
    drawer.appendChild(section);
  }

  // 7. Funnel CTA to SSBMax.ai
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
      destination: 'SSBMax.ai',
      medium: STRINGS.funnel.utmMediumSSB,
      campaign: clusterId
    });
  });

  ctaBox.appendChild(ctaText);
  ctaBox.appendChild(ctaLink);
  drawer.appendChild(ctaBox);

  return drawer;
}

