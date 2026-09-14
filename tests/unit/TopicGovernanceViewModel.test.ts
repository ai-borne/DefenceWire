import { describe, expect, it, vi } from 'vitest';
import { TopicGovernanceViewModel } from '../../src/viewmodels/TopicGovernanceViewModel.js';

function mockService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    loadQueue: vi.fn().mockResolvedValue({ success: true, rows: [{ id: 'candidate-a' }] }),
    loadCandidateEvidence: vi.fn().mockResolvedValue({ success: true, rows: [{ source_article_id: 'article-a' }] }),
    loadSourceIndependence: vi.fn().mockResolvedValue({ success: true, rows: [{ mention_count: 2 }] }),
    loadAssignmentDiff: vi.fn().mockResolvedValue({ success: true, rows: [] }),
    preview: vi.fn().mockResolvedValue({ success: true, preview: { topics: [] } }),
    getResourceVersion: vi.fn().mockResolvedValue(1),
    submit: vi.fn().mockResolvedValue({ success: true }),
    ...overrides
  };
}

describe('TopicGovernanceViewModel', () => {
  it('loads the default queue rows and notifies listeners', async () => {
    const service = mockService();
    const vm = new TopicGovernanceViewModel(service as never);
    const listener = vi.fn();
    vm.subscribe(listener);
    await vm.loadQueue();
    expect(vm.getRows()).toEqual([{ id: 'candidate-a' }]);
    expect(vm.getIsLoading()).toBe(false);
    expect(listener).toHaveBeenCalled();
  });

  it('surfaces a queue load error without throwing', async () => {
    const service = mockService({ loadQueue: vi.fn().mockResolvedValue({ success: false, error: 'boom', rows: [] }) });
    const vm = new TopicGovernanceViewModel(service as never);
    await vm.loadQueue();
    expect(vm.getError()).toBe('boom');
  });

  it('switching the active queue reloads rows and clears prior detail state', async () => {
    const service = mockService();
    const vm = new TopicGovernanceViewModel(service as never);
    await vm.preview('topic-a');
    expect(vm.getPendingPreview()).toEqual({ topics: [] });
    await vm.setActiveQueue('provisionalTopics');
    expect(vm.getActiveQueue()).toBe('provisionalTopics');
    expect(vm.getPendingPreview()).toBeNull();
    expect(service.loadQueue).toHaveBeenCalledWith('provisionalTopics');
  });

  it('reads a fresh resource version immediately before submitting a mutation', async () => {
    const service = mockService();
    const vm = new TopicGovernanceViewModel(service as never);
    const ok = await vm.submit({ action: 'suppress', topicId: 'auto-topic' });
    expect(ok).toBe(true);
    expect(service.getResourceVersion).toHaveBeenCalledWith('topic', 'auto-topic');
    expect(service.submit).toHaveBeenCalledWith({ action: 'suppress', topicId: 'auto-topic', expectedVersion: 1 });
  });

  it('surfaces a stale-version conflict from the server without hiding it', async () => {
    const service = mockService({ submit: vi.fn().mockResolvedValue({ success: false, error: 'Conflict: this record has changed; refresh and retry.' }) });
    const vm = new TopicGovernanceViewModel(service as never);
    const ok = await vm.submit({ action: 'suppress', topicId: 'auto-topic' });
    expect(ok).toBe(false);
    expect(vm.getError()).toMatch(/Conflict/);
  });

  it('reloads the queue after a successful mutation', async () => {
    const service = mockService();
    const vm = new TopicGovernanceViewModel(service as never);
    await vm.submit({ action: 'restore', topicId: 'auto-topic' });
    expect(service.loadQueue).toHaveBeenCalled();
  });
});
