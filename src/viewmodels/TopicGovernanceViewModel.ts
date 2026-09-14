/**
 * ViewModel for the Topic Governance curator panel (Phase 13 Stage 4).
 * Manages review-queue state, evidence/diff detail lookups, and every
 * governed mutation with a fresh version read immediately before submit.
 * Hard limit: <= 300 LOC.
 */
import { TopicGovernanceService, defaultTopicGovernanceService } from '../services/topicGovernanceService.js';
import { QueueName, GovernanceResourceType } from '../services/topicGovernanceReadHandler.js';
import { TopicGovernanceRequest } from '../services/topicGovernanceHandler.js';

export type GovernanceStateListener = () => void;

const RESOURCE_TYPE_BY_ACTION: Record<TopicGovernanceRequest['action'], GovernanceResourceType> = {
  candidate: 'candidate', topic: 'topic', alias: 'alias', implication: 'implication',
  merge: 'topic', reverse_merge: 'topic', suppress: 'topic', restore: 'topic', assignment: 'assignment'
};

function resourceIdFor(request: TopicGovernanceRequest): string {
  if (request.action === 'candidate') return request.candidateId ?? '';
  if (request.action === 'alias') return `${request.alias ?? ''}:${request.topicId ?? ''}`;
  if (request.action === 'implication') return `${request.topicId ?? ''}:${request.targetTopicId ?? ''}`;
  if (request.action === 'assignment') return `${request.clusterId ?? ''}:${request.topicId ?? ''}`;
  return request.topicId ?? '';
}

export class TopicGovernanceViewModel {
  private service: TopicGovernanceService;
  private activeQueue: QueueName = 'pendingCandidates';
  private rows: Record<string, unknown>[] = [];
  private isLoading = false;
  private error: string | null = null;
  private selectedEvidence: Record<string, unknown>[] | null = null;
  private selectedIndependence: Record<string, unknown>[] | null = null;
  private selectedAssignmentDiff: Record<string, unknown>[] | null = null;
  private pendingPreview: Record<string, unknown> | null = null;
  private isSubmitting = false;
  private listeners: Set<GovernanceStateListener> = new Set();

  constructor(service: TopicGovernanceService = defaultTopicGovernanceService) {
    this.service = service;
  }

  public subscribe(listener: GovernanceStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch { /* guard against listener exceptions */ }
    }
  }

  public getActiveQueue(): QueueName { return this.activeQueue; }
  public getRows(): Record<string, unknown>[] { return this.rows; }
  public getIsLoading(): boolean { return this.isLoading; }
  public getError(): string | null { return this.error; }
  public getSelectedEvidence(): Record<string, unknown>[] | null { return this.selectedEvidence; }
  public getSelectedIndependence(): Record<string, unknown>[] | null { return this.selectedIndependence; }
  public getSelectedAssignmentDiff(): Record<string, unknown>[] | null { return this.selectedAssignmentDiff; }
  public getPendingPreview(): Record<string, unknown> | null { return this.pendingPreview; }
  public getIsSubmitting(): boolean { return this.isSubmitting; }

  public async setActiveQueue(queue: QueueName): Promise<void> {
    if (this.activeQueue === queue) return;
    this.activeQueue = queue;
    this.selectedEvidence = null;
    this.selectedIndependence = null;
    this.selectedAssignmentDiff = null;
    this.pendingPreview = null;
    await this.loadQueue();
  }

  public async loadQueue(): Promise<void> {
    this.isLoading = true; this.error = null; this.notify();
    const res = await this.service.loadQueue(this.activeQueue);
    this.isLoading = false;
    if (res.success) this.rows = res.rows;
    else this.error = res.error || 'Failed to load review queue.';
    this.notify();
  }

  public async loadEvidence(candidateId: string): Promise<void> {
    const res = await this.service.loadCandidateEvidence(candidateId);
    this.selectedEvidence = res.success ? res.rows : [];
    if (!res.success) this.error = res.error || 'Failed to load evidence.';
    this.notify();
  }

  public async loadSourceIndependence(topicId: string): Promise<void> {
    const res = await this.service.loadSourceIndependence(topicId);
    this.selectedIndependence = res.success ? res.rows : [];
    if (!res.success) this.error = res.error || 'Failed to load source independence.';
    this.notify();
  }

  public async loadAssignmentDiff(clusterId: string, topicId: string): Promise<void> {
    const res = await this.service.loadAssignmentDiff(clusterId, topicId);
    this.selectedAssignmentDiff = res.success ? res.rows : [];
    if (!res.success) this.error = res.error || 'Failed to load assignment history.';
    this.notify();
  }

  public clearDetail(): void {
    this.selectedEvidence = null;
    this.selectedIndependence = null;
    this.selectedAssignmentDiff = null;
    this.pendingPreview = null;
    this.notify();
  }

  public async preview(topicId: string, targetTopicId?: string): Promise<void> {
    const res = await this.service.preview(topicId, targetTopicId);
    if (res.success) this.pendingPreview = res.preview ?? {};
    else this.error = res.error || 'Failed to build preview.';
    this.notify();
  }

  /**
   * Reads the resource's current version immediately before submitting, so
   * the request carries as fresh an expectedVersion as this client can get —
   * the server's own check is still the authority that rejects a stale write.
   */
  public async submit(request: Omit<TopicGovernanceRequest, 'expectedVersion'>): Promise<boolean> {
    this.isSubmitting = true; this.error = null; this.notify();
    const resourceType = RESOURCE_TYPE_BY_ACTION[request.action];
    const expectedVersion = await this.service.getResourceVersion(resourceType, resourceIdFor(request as TopicGovernanceRequest));
    const res = await this.service.submit({ ...request, expectedVersion } as TopicGovernanceRequest);
    this.isSubmitting = false;
    if (res.success) {
      this.pendingPreview = null;
      await this.loadQueue();
      return true;
    }
    this.error = res.error || 'Governance action failed.';
    this.notify();
    return false;
  }
}
