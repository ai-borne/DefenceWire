/**
 * Theme ViewModel for DefenceWire.in
 * Synchronizes light, tactical dark, and system color preferences.
 * Hard limit: <= 300 LOC.
 */

import { ThemeMode } from '../types/viewState.js';

export type ThemeChangeListener = (theme: ThemeMode, effectiveTheme: 'light' | 'dark') => void;

const THEME_STORAGE_KEY = 'defencewire_theme_mode';

export class ThemeViewModel {
  private currentTheme: ThemeMode = 'system';
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQueryList: MediaQueryList | null = null;
  private mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(initialTheme?: ThemeMode) {
    if (initialTheme) {
      this.currentTheme = initialTheme;
    } else {
      this.currentTheme = this.loadSavedTheme();
    }
    this.initSystemListener();
    this.applyToDOM();
  }

  /**
   * Loads persisted theme from localStorage safely.
   */
  private loadSavedTheme(): ThemeMode {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'system';
    }
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore localStorage access errors
    }
    return 'system';
  }

  /**
   * Persists theme preference to localStorage safely.
   */
  private persistTheme(theme: ThemeMode): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage access errors
    }
  }

  /**
   * Initializes system dark mode preference change listener.
   */
  private initSystemListener(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQueryHandler = () => {
        if (this.currentTheme === 'system') {
          this.applyToDOM();
          this.notifyListeners();
        }
      };

      if (typeof this.mediaQueryList.addEventListener === 'function') {
        this.mediaQueryList.addEventListener('change', this.mediaQueryHandler);
      } else if (typeof this.mediaQueryList.addListener === 'function') {
        // Fallback for older browsers
        this.mediaQueryList.addListener(this.mediaQueryHandler);
      }
    } catch {
      // Ignore media query initialization errors
    }
  }

  /**
   * Computes effective visual theme ('light' or 'dark').
   */
  public getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'light') return 'light';
    if (this.currentTheme === 'dark') return 'dark';

    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Gets current selected theme setting ('light' | 'dark' | 'system').
   */
  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Sets new theme mode and updates DOM.
   */
  public setTheme(theme: ThemeMode): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.persistTheme(theme);
    this.applyToDOM();
    this.notifyListeners();
  }

  /**
   * Toggles through themes: light -> dark -> system -> light.
   */
  public toggleTheme(): void {
    if (this.currentTheme === 'light') {
      this.setTheme('dark');
    } else if (this.currentTheme === 'dark') {
      this.setTheme('system');
    } else {
      this.setTheme('light');
    }
  }

  /**
   * Applies the theme attribute to the HTML document element.
   */
  public applyToDOM(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (this.currentTheme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', this.currentTheme);
    }
  }

  /**
   * Subscribes to theme changes.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of a theme update.
   */
  private notifyListeners(): void {
    const effective = this.getEffectiveTheme();
    for (const listener of this.listeners) {
      listener(this.currentTheme, effective);
    }
  }

  /**
   * Cleans up event listeners.
   */
  public destroy(): void {
    if (this.mediaQueryList && this.mediaQueryHandler) {
      if (typeof this.mediaQueryList.removeEventListener === 'function') {
        this.mediaQueryList.removeEventListener('change', this.mediaQueryHandler);
      } else if (typeof this.mediaQueryList.removeListener === 'function') {
        this.mediaQueryList.removeListener(this.mediaQueryHandler);
      }
    }
    this.listeners.clear();
  }
}
