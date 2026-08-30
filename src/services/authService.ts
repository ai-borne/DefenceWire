/**
 * Authentication Service for Editorial Curator Desk
 * Provides SHA-256 passcode hashing, session persistence, and auth listeners.
 * Hard limit: <= 300 LOC.
 */

export type AuthChangeListener = (isAuthenticated: boolean) => void;

// Precomputed SHA-256 of default editorial passcode: "defencewire2026"
export const DEFAULT_PASSCODE_HASH = '322c41dfafb6e928d43e943beff0bda52e11436b9eef4530c6440152d4f5e28c';
const STORAGE_KEY = 'dw_curator_session_token';

export class AuthService {
  private authenticated: boolean = false;
  private expectedHash: string;
  private listeners: Set<AuthChangeListener> = new Set();

  constructor(customHash?: string) {
    this.expectedHash = customHash || DEFAULT_PASSCODE_HASH;
    this.restoreSession();
  }

  /**
   * Hashes a string using standard SHA-256.
   */
  public async hashPasscode(passcode: string): Promise<string> {
    const trimmed = passcode.trim();
    if (!trimmed) return '';

    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(trimmed);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return '';
  }

  /**
   * Verifies if the provided passcode matches the expected SHA-256 hash.
   */
  public async verifyPasscode(passcode: string): Promise<boolean> {
    if (!passcode) return false;
    const computed = await this.hashPasscode(passcode);
    return computed === this.expectedHash;
  }

  /**
   * Returns current authentication status.
   */
  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Attempts to login with the given passcode.
   */
  public async login(passcode: string, remember: boolean = true): Promise<boolean> {
    const valid = await this.verifyPasscode(passcode);
    if (valid) {
      this.authenticated = true;
      if (remember) {
        this.saveSessionToken(this.expectedHash);
      }
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Logs out and invalidates session token.
   */
  public logout(): void {
    this.authenticated = false;
    this.clearSessionToken();
    this.notifyListeners();
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

  private restoreSession(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === this.expectedHash) {
          this.authenticated = true;
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private saveSessionToken(token: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, token);
      }
    } catch {
      // Silently ignore storage errors
    }
  }

  private clearSessionToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Silently ignore storage errors
    }
  }
}

export const defaultAuthService = new AuthService();
