/**
 * Ecosystem Rail Component for DefenceWire.in
 * Techmeme-style minimalist text modules for SSBMax.ai and ai-borne.in.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { getSafeLinkAttributes } from '../utils/security.js';
import { buildFunnelUrl, trackOutboundClick } from '../services/funnelService.js';

export function renderEcosystemRail(): HTMLElement {
  const container = document.createElement('aside');
  container.className = 'dw-rail-card';
  container.setAttribute('aria-label', STRINGS.footer.ecosystemHeading);

  const header = document.createElement('h3');
  header.className = 'dw-rail-header';
  header.textContent = `🌐 ${STRINGS.ecosystem.sponsorTag}`;
  container.appendChild(header);

  // 1. SSBMax.ai Module
  const ssbModule = document.createElement('div');
  ssbModule.className = 'dw-ecosystem-card';

  const ssbTitle = document.createElement('div');
  ssbTitle.className = 'dw-ecosystem-title';
  ssbTitle.textContent = STRINGS.ecosystem.ssbMaxTitle;

  const ssbDesc = document.createElement('p');
  ssbDesc.className = 'dw-ecosystem-desc';
  ssbDesc.textContent = STRINGS.ecosystem.ssbMaxDesc;

  const ssbLink = document.createElement('a');
  ssbLink.className = 'dw-ecosystem-link';
  const ssbUrl = buildFunnelUrl(STRINGS.ecosystem.ssbMaxUrl, {
    medium: STRINGS.funnel.utmMediumEcosystem,
    campaign: 'sidebar'
  });
  const ssbAttrs = getSafeLinkAttributes(ssbUrl);
  ssbLink.href = ssbAttrs.href;
  ssbLink.target = ssbAttrs.target;
  ssbLink.rel = ssbAttrs.rel;
  ssbLink.textContent = `${STRINGS.ecosystem.ssbMaxCta} →`;

  ssbLink.addEventListener('click', () => {
    trackOutboundClick({
      url: ssbUrl,
      destination: STRINGS.ecosystem.ssbMaxDestinationId,
      medium: STRINGS.funnel.utmMediumEcosystem,
      campaign: 'sidebar'
    });
  });

  ssbModule.appendChild(ssbTitle);
  ssbModule.appendChild(ssbDesc);
  ssbModule.appendChild(ssbLink);
  container.appendChild(ssbModule);

  // 2. ai-borne.in Module
  const aiModule = document.createElement('div');
  aiModule.className = 'dw-ecosystem-card';

  const aiTitle = document.createElement('div');
  aiTitle.className = 'dw-ecosystem-title';
  aiTitle.textContent = STRINGS.ecosystem.aiBorneTitle;

  const aiDesc = document.createElement('p');
  aiDesc.className = 'dw-ecosystem-desc';
  aiDesc.textContent = STRINGS.ecosystem.aiBorneDesc;

  const aiLink = document.createElement('a');
  aiLink.className = 'dw-ecosystem-link';
  const aiUrl = buildFunnelUrl(STRINGS.ecosystem.aiBorneUrl, {
    medium: STRINGS.funnel.utmMediumEcosystem,
    campaign: 'sidebar'
  });
  const aiAttrs = getSafeLinkAttributes(aiUrl);
  aiLink.href = aiAttrs.href;
  aiLink.target = aiAttrs.target;
  aiLink.rel = aiAttrs.rel;
  aiLink.textContent = `${STRINGS.ecosystem.aiBorneCta} →`;

  aiLink.addEventListener('click', () => {
    trackOutboundClick({
      url: aiUrl,
      destination: STRINGS.ecosystem.aiBorneDestinationId,
      medium: STRINGS.funnel.utmMediumEcosystem,
      campaign: 'sidebar'
    });
  });

  aiModule.appendChild(aiTitle);
  aiModule.appendChild(aiDesc);
  aiModule.appendChild(aiLink);
  container.appendChild(aiModule);

  return container;
}

