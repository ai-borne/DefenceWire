/**
 * Unit Tests for FooterView link-group separation (policy vs ecosystem network).
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { renderFooter } from '../../src/components/FooterView.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('renderFooter', () => {
  it('renders policy links and ecosystem links as two distinct groups', () => {
    const footer = renderFooter();

    const policyGroup = footer.querySelector('.dw-footer-links');
    const ecosystemGroup = footer.querySelector('.dw-footer-ecosystem-links');

    expect(policyGroup).not.toBeNull();
    expect(ecosystemGroup).not.toBeNull();
    expect(policyGroup).not.toBe(ecosystemGroup);
  });

  it('keeps policy links (editorial, privacy, contact) out of the ecosystem group', () => {
    const footer = renderFooter();
    const policyGroup = footer.querySelector('.dw-footer-links') as HTMLElement;
    const policyTexts = Array.from(policyGroup.querySelectorAll('a')).map((a) => a.textContent);

    expect(policyTexts).toEqual([
      STRINGS.footer.editorialPolicy,
      STRINGS.footer.privacyPolicy,
      STRINGS.footer.contact
    ]);
  });

  it('groups the affiliated ecosystem links under their own labeled section', () => {
    const footer = renderFooter();
    const ecosystemSection = footer.querySelector('.dw-footer-ecosystem') as HTMLElement;
    const label = ecosystemSection.querySelector('.dw-footer-ecosystem-label');
    const ecosystemLinks = Array.from(
      ecosystemSection.querySelectorAll('.dw-footer-ecosystem-links a')
    ).map((a) => a.textContent);

    expect(label?.textContent).toBe(STRINGS.footer.ecosystemHeading);
    expect(ecosystemLinks).toEqual([STRINGS.ecosystem.ssbMaxTitle, STRINGS.ecosystem.aiBorneTitle]);
  });

  it('does not hardcode presentation via inline styles (SSOT: colors/typography live in CSS)', () => {
    const footer = renderFooter();
    const elementsWithInlineStyle = Array.from(footer.querySelectorAll('*')).filter(
      (el) => el.getAttribute('style') !== null
    );

    expect(elementsWithInlineStyle).toHaveLength(0);
  });

  it('still opens external ecosystem links safely in a new tab', () => {
    const footer = renderFooter();
    const ecosystemLinks = Array.from(footer.querySelectorAll('.dw-footer-ecosystem-links a')) as HTMLAnchorElement[];

    for (const link of ecosystemLinks) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    }
  });
});
