import { describe, it, expect, beforeEach } from 'vitest';
import { renderEditorDashboard } from '../../src/components/EditorDashboard.js';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { STRINGS } from '../../src/resources/strings.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('EditorDashboard Component Integration', () => {
  let newsVm: NewsViewModel;
  let editorVm: EditorViewModel;

  const mockCluster: StoryCluster = {
    id: 'cluster-mod-1',
    synthesizedHeadline: 'HAL Delivers First Batch of Tejas Mk1A to IAF',
    primarySource: {
      id: 'src-1',
      title: 'HAL delivers Tejas',
      url: 'https://pib.gov.in/news/1',
      sourceName: 'PIB India',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z'
    },
    relatedCoverage: [
      {
        id: 'src-2',
        title: 'Tejas Mk1A delivery starts',
        url: 'https://thehindu.com/news/2',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T09:30:00Z'
      }
    ],


    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 88,
    isLeadStory: false,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  };

  beforeEach(() => {
    newsVm = new NewsViewModel([mockCluster], []);
    editorVm = new EditorViewModel(newsVm);
    editorVm.setOpen(true);
  });

  it('renders dashboard title and candidate cluster items', () => {
    const el = renderEditorDashboard(editorVm);
    expect(el.textContent).toContain(STRINGS.editor.dashboardTitle);
    expect(el.textContent).toContain('HAL Delivers First Batch of Tejas Mk1A to IAF');
    expect(el.textContent).toContain('88'); // score
  });

  it('handles promote button click and updates lead status', () => {
    const el = renderEditorDashboard(editorVm);
    const promoteBtn = el.querySelector('.dw-editor-btn--promote') as HTMLButtonElement | null;
    expect(promoteBtn).not.toBeNull();

    promoteBtn?.click();
    expect(editorVm.getClusterById('cluster-mod-1')?.isLeadStory).toBe(true);
  });

  it('handles ignore button click and toggles ignored status', () => {
    const el = renderEditorDashboard(editorVm);
    const ignoreBtn = el.querySelector('.dw-editor-btn--ignore') as HTMLButtonElement | null;
    expect(ignoreBtn).not.toBeNull();

    ignoreBtn?.click();
    expect(editorVm.getClusterById('cluster-mod-1')?.isIgnored).toBe(true);
  });

  it('switches filter mode tabs when clicked', () => {
    const el = renderEditorDashboard(editorVm);
    const filterTabs = el.querySelectorAll('.dw-editor-filter-tab');
    expect(filterTabs.length).toBe(3);

    (filterTabs[1] as HTMLElement).click(); // Active only
    expect(editorVm.getFilterMode()).toBe('active');

    (filterTabs[2] as HTMLElement).click(); // Ignored only
    expect(editorVm.getFilterMode()).toBe('ignored');
  });
});
