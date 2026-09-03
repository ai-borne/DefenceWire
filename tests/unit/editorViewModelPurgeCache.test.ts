/**
 * Unit Tests for EditorViewModel: Purge Edge Cache Action
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('EditorViewModel: Purge Edge Cache', () => {
  function makeEditorVm(): EditorViewModel {
    const newsVm = new NewsViewModel();
    return new EditorViewModel(newsVm);
  }

  it('defaults isPurgingCache to false', () => {
    const vm = makeEditorVm();
    expect(vm.getIsPurgingCache()).toBe(false);
  });

  it('updates state and succeeds when edge cache purge succeeds', async () => {
    const vm = makeEditorVm();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Successfully purged 7 edge cache tags.' })
    } as unknown as Response);

    let observedPurgingStateDuringCall = false;
    vm.subscribe(() => {
      if (vm.getIsPurgingCache()) {
        observedPurgingStateDuringCall = true;
      }
    });

    const success = await vm.purgeEdgeCache(undefined, mockFetch as unknown as typeof fetch);

    expect(success).toBe(true);
    expect(observedPurgingStateDuringCall).toBe(true);
    expect(vm.getIsPurgingCache()).toBe(false);
    expect(vm.getPublishStatusMessage()).toBe('Successfully purged 7 edge cache tags.');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/purge-cache',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('passes specific tags in the request body when supplied', async () => {
    const vm = makeEditorVm();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as unknown as Response);

    await vm.purgeEdgeCache(['dw-llms-txt', 'dw-sitemap'], mockFetch as unknown as typeof fetch);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/purge-cache',
      expect.objectContaining({
        body: JSON.stringify({ tags: ['dw-llms-txt', 'dw-sitemap'] })
      })
    );
  });

  it('handles API failure gracefully and updates status message', async () => {
    const vm = makeEditorVm();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Zone credentials invalid' })
    } as unknown as Response);

    const success = await vm.purgeEdgeCache(undefined, mockFetch as unknown as typeof fetch);

    expect(success).toBe(false);
    expect(vm.getIsPurgingCache()).toBe(false);
    expect(vm.getPublishStatusMessage()).toContain(STRINGS.editor.purgeCacheError);
    expect(vm.getPublishStatusMessage()).toContain('Zone credentials invalid');
  });

  it('handles network failure gracefully without throwing and restores state', async () => {
    const vm = makeEditorVm();
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const success = await vm.purgeEdgeCache(undefined, mockFetch as unknown as typeof fetch);

    expect(success).toBe(false);
    expect(vm.getIsPurgingCache()).toBe(false);
    expect(vm.getPublishStatusMessage()).toContain(STRINGS.editor.purgeCacheError);
    expect(vm.getPublishStatusMessage()).toContain('Network disconnected');
  });
});
