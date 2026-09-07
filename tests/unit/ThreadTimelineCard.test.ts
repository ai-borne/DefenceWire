/**
 * Unit Tests for ThreadTimelineCard Component (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderThreadTimelineCard } from '../../src/components/threads/ThreadTimelineCard.js';
import { StoryThreadEvent } from '../../src/types/threads.js';

const MOCK_EVENT: StoryThreadEvent = {
  id: 'evt-test-1',
  threadId: 'thread-tejas',
  clusterId: 'cluster-123',
  sequenceCode: 'x1.1.2',
  sequenceIndex: 2,
  headline: 'HAL Hands Over 1st Serial LCA Mk1A to Indian Air Force',
  deltaSummary: 'First operational squadron formation begins at Nal airbase.',
  primarySourceName: 'Press Information Bureau',
  primarySourceUrl: 'https://pib.gov.in/test-lca',
  publishedAt: '2026-03-01T10:30:00Z',
  entities: ['IAF', 'HAL', 'LCA Tejas'],
  createdAt: '2026-03-01T10:30:00Z'
};

describe('ThreadTimelineCard Component', () => {
  it('should render article container with sequence code and event ID dataset', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT);

    expect(card.tagName.toLowerCase()).toBe('article');
    expect(card.className).toContain('dw-timeline-card');
    expect(card.getAttribute('data-sequence-code')).toBe('x1.1.2');
    expect(card.getAttribute('data-event-id')).toBe('evt-test-1');
  });

  it('should render stem dot and git-style sequence badge', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT);

    const stemDot = card.querySelector('.dw-timeline-stem-dot');
    expect(stemDot).not.toBeNull();

    const seqBadge = card.querySelector('.dw-timeline-seq-badge');
    expect(seqBadge).not.toBeNull();
    expect(seqBadge?.textContent).toBe('x1.1.2');
    expect(seqBadge?.getAttribute('aria-label')).toContain('x1.1.2');
  });

  it('should format date and render primary source link with safe rel and target attributes', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT);

    const dateEl = card.querySelector('time.dw-timeline-date');
    expect(dateEl).not.toBeNull();
    expect(dateEl?.getAttribute('datetime')).toBe('2026-03-01T10:30:00Z');

    const sourceLink = card.querySelector('a.dw-timeline-source-pill') as HTMLAnchorElement | null;
    expect(sourceLink).not.toBeNull();
    expect(sourceLink?.textContent).toContain('Press Information Bureau');
    expect(sourceLink?.href).toBe('https://pib.gov.in/test-lca');
    expect(sourceLink?.target).toBe('_blank');
    expect(sourceLink?.rel).toBe('noopener noreferrer');
  });

  it('should render headline as link when primarySourceUrl is present', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT);

    const headline = card.querySelector('.dw-timeline-headline');
    expect(headline).not.toBeNull();
    const link = headline?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe('HAL Hands Over 1st Serial LCA Mk1A to Indian Air Force');
    expect(link?.href).toBe('https://pib.gov.in/test-lca');
  });

  it('should render synthesized key delta box with label and text', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT);

    const deltaBox = card.querySelector('.dw-timeline-delta-box');
    expect(deltaBox).not.toBeNull();

    const label = deltaBox?.querySelector('.dw-timeline-delta-label');
    expect(label?.textContent).toBe('Key Delta');

    const text = deltaBox?.querySelector('.dw-timeline-delta-text');
    expect(text?.textContent).toBe('First operational squadron formation begins at Nal airbase.');
  });

  it('should render entities as interactive pills and trigger onSelectEntity callback', () => {
    const onSelect = vi.fn();
    const card = renderThreadTimelineCard(MOCK_EVENT, { onSelectEntity: onSelect });

    const entityTags = card.querySelectorAll('.dw-timeline-entity-tag');
    expect(entityTags.length).toBe(3);
    expect(entityTags[0]?.textContent).toBe('IAF');
    expect(entityTags[1]?.textContent).toBe('HAL');
    expect(entityTags[2]?.textContent).toBe('LCA Tejas');

    (entityTags[0] as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenCalledWith('IAF');
  });

  it('should apply is-latest styling when isLatest option is true', () => {
    const card = renderThreadTimelineCard(MOCK_EVENT, { isLatest: true });
    expect(card.classList.contains('is-latest')).toBe(true);
  });

  it('should sanitize headline and delta text against script injections', () => {
    const unsafeEvent: StoryThreadEvent = {
      ...MOCK_EVENT,
      headline: 'Unsafe <script>alert("xss")</script> Headline',
      deltaSummary: 'Unsafe <img src=x onerror=alert(1)> Delta',
      primarySourceName: '<b onclick="malicious()">Source</b>'
    };

    const card = renderThreadTimelineCard(unsafeEvent);
    expect(card.innerHTML).not.toContain('<script>');
    expect(card.innerHTML).not.toContain('<img');
    expect(card.innerHTML).not.toContain('onerror=');
  });
});
