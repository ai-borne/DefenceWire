/**
 * Small debounce helper extracted from SuppliersViewModel to stay within its
 * ~170 LOC target (see Phase 2.3 plan note on ProgramsViewModel-sized budgets).
 * Hard limit: <= 300 LOC.
 */

const SEARCH_DEBOUNCE_MS = 250;

export class SearchDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  public schedule(callback: () => void, delayMs: number = SEARCH_DEBOUNCE_MS): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      callback();
    }, delayMs);
  }

  public cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
