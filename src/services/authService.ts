/**
 * Authentication Service for Editorial Curator Desk
 * Integrates with Cloudflare Pages edge authentication (/api/curator/auth) and Zero Trust Access,
 * maintaining zero secrets in client bundles with verified identity tracking.
 * Hard limit: <= 300 LOC.
 */

export type AuthChangeListener = (isAuthenticated: boolean) => void;

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

export class AuthService {
  private authenticated: boolean = false;
  private curatorEmail: string | null = null;
  private authProvider: 'cloudflare_zero_trust' | 'edge_session' | null = null;
  private listeners: Set<AuthChangeListener> = new Set();
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
    this.checkSession();
  }

  /**
   * Verifies current session with edge endpoint and captures Zero Trust identity.
   */
  public async checkSession(): Promise<boolean> {
    try {
      const response = await this.fetchFn(resolveEndpoint('/api/curator/auth'), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const data = (await response.json()) as {
          authenticated?: boolean;
          userEmail?: string | null;
          provider?: 'cloudflare_zero_trust' | 'edge_session';
        };
        this.authenticated = Boolean(data.authenticated);
        this.curatorEmail = data.userEmail || (this.authenticated ? 'curator@institutional.internal' : null);
        this.authProvider = data.provider || (this.authenticated ? 'edge_session' : null);
        this.notifyListeners();
        return this.authenticated;
      }
    } catch {
      // Offline or local dev without function runner
    }
    return this.authenticated;
  }

  /**
   * Returns current authentication status.
   */
  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Returns verified curator email if authenticated via Zero Trust.
   */
  public getCuratorEmail(): string | null {
    return this.curatorEmail;
  }

  /**
   * Returns active authentication provider.
   */
  public getAuthProvider(): 'cloudflare_zero_trust' | 'edge_session' | null {
    return this.authProvider;
  }

  /**
   * Sets authentication state directly (primarily for testing/mocking).
   */
  public setAuthenticated(
    state: boolean,
    email: string | null = null,
    provider: 'cloudflare_zero_trust' | 'edge_session' | null = null
  ): void {
    this.authenticated = state;
    this.curatorEmail = email || (state ? 'curator@institutional.internal' : null);
    this.authProvider = provider || (state ? 'edge_session' : null);
    this.notifyListeners();
  }

  /**
   * Attempts login with the provided passcode against edge endpoint.
   */
  public async login(passcode: string, remember: boolean = true): Promise<boolean> {
    const trimmed = passcode.trim();
    if (!trimmed) return false;

    try {
      const response = await this.fetchFn(resolveEndpoint('/api/curator/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed, remember })
      });

      if (response.ok) {
        const data = (await response.json()) as { success?: boolean };
        if (data.success) {
          this.authenticated = true;
          this.curatorEmail = 'curator@institutional.internal';
          this.authProvider = 'edge_session';
          this.notifyListeners();
          return true;
        }
      }
    } catch {
      // Fallback
    }

    return false;
  }

  /**
   * Logs out and invalidates edge session cookie.
   */
  public logout(): void {
    this.authenticated = false;
    this.curatorEmail = null;
    this.authProvider = null;
    this.notifyListeners();
    try {
      const p = this.fetchFn(resolveEndpoint('/api/curator/auth'), {
        method: 'DELETE'
      });
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Suppress offline / mock errors
        });
      }
    } catch {
      // Best-effort
    }
  }

  /**
   * Subscribes to authentication state changes.
   */
  public onAuthChange(listener: AuthChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.authenticated);
    }
  }
}

export const defaultAuthService = new AuthService();
