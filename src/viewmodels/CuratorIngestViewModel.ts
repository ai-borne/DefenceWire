/**
 * Curator Desk Ad-Hoc Ingest Panel ViewModel (Phase 4).
 * State for the "Ingest Story" tab: URL/text mode toggle, form fields,
 * submission state. Follows the EditorViewModel pub/sub convention.
 * Hard limit: <= 300 LOC.
 */

import { CuratorIngestService, defaultCuratorIngestService } from '../services/curatorIngestService.js';

export type CuratorIngestMode = 'url' | 'text';
export type CuratorIngestListener = () => void;

export class CuratorIngestViewModel {
  private ingestService: CuratorIngestService;
  private mode: CuratorIngestMode = 'url';
  private urlValue: string = '';
  private textValue: string = '';
  private sourceNameValue: string = '';
  private isSubmitting: boolean = false;
  private statusMessage: string | null = null;
  private isError: boolean = false;
  private listeners: Set<CuratorIngestListener> = new Set();

  constructor(ingestService?: CuratorIngestService) {
    this.ingestService = ingestService || defaultCuratorIngestService;
  }

  public getMode(): CuratorIngestMode {
    return this.mode;
  }

  public setMode(mode: CuratorIngestMode): void {
    this.mode = mode;
    this.statusMessage = null;
    this.notifyListeners();
  }

  public getUrlValue(): string {
    return this.urlValue;
  }

  public setUrlValue(value: string): void {
    this.urlValue = value;
  }

  public getTextValue(): string {
    return this.textValue;
  }

  public setTextValue(value: string): void {
    this.textValue = value;
  }

  public getSourceNameValue(): string {
    return this.sourceNameValue;
  }

  public setSourceNameValue(value: string): void {
    this.sourceNameValue = value;
  }

  public getIsSubmitting(): boolean {
    return this.isSubmitting;
  }

  public getStatusMessage(): string | null {
    return this.statusMessage;
  }

  public getIsError(): boolean {
    return this.isError;
  }

  public async submit(): Promise<void> {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.statusMessage = null;
    this.isError = false;
    this.notifyListeners();

    const result =
      this.mode === 'url'
        ? await this.ingestService.ingest({ mode: 'url', url: this.urlValue.trim() })
        : await this.ingestService.ingest({
            mode: 'text',
            text: this.textValue,
            sourceName: this.sourceNameValue.trim() || undefined
          });

    this.isSubmitting = false;
    this.isError = !result.success;
    this.statusMessage = result.success ? result.message || 'Ingested.' : result.error || 'Ingestion failed.';

    if (result.success) {
      this.urlValue = '';
      this.textValue = '';
      this.sourceNameValue = '';
    }

    this.notifyListeners();
  }

  public subscribe(listener: CuratorIngestListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) listener();
  }
}
