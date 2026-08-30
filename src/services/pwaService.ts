/**
 * PWA & Offline Service for DefenceWire.in
 * Handles Service Worker registration, install prompt interception, and online/offline connectivity.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';

export type NetworkStatusListener = (isOnline: boolean) => void;
export type InstallableListener = (canInstall: boolean) => void;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private networkListeners: Set<NetworkStatusListener> = new Set();
  private installListeners: Set<InstallableListener> = new Set();
  private isOnlineStatus: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.notifyNetworkStatus(true);
      });

      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notifyNetworkStatus(false);
      });

      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEvent;
        this.notifyInstallable(true);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.notifyInstallable(false);
      });
    }
  }

  /**
   * Registers the application Service Worker.
   */
  public async registerServiceWorker(swPath: string = '/sw.js'): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register(swPath);
      return !!registration;
    } catch {
      return false;
    }
  }

  /**
   * Returns current connectivity status.
   */
  public isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return this.isOnlineStatus;
  }

  /**
   * Checks if app can be installed via browser prompt.
   */
  public canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Triggers the native install prompt dialog.
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.notifyInstallable(false);
      return choice.outcome;
    } catch {
      this.deferredPrompt = null;
      this.notifyInstallable(false);
      return 'unavailable';
    }
  }

  /**
   * Subscribes to network online/offline events.
   */
  public onNetworkStatusChange(listener: NetworkStatusListener): () => void {
    this.networkListeners.add(listener);
    return () => {
      this.networkListeners.delete(listener);
    };
  }

  /**
   * Subscribes to PWA installable state changes.
   */
  public onInstallableChange(listener: InstallableListener): () => void {
    this.installListeners.add(listener);
    return () => {
      this.installListeners.delete(listener);
    };
  }

  private notifyNetworkStatus(isOnline: boolean): void {
    for (const listener of this.networkListeners) {
      listener(isOnline);
    }
  }

  private notifyInstallable(canInstall: boolean): void {
    for (const listener of this.installListeners) {
      listener(canInstall);
    }
  }

  /**
   * Renders the PWA install prompt banner.
   */
  public renderInstallBanner(onDismiss?: () => void): HTMLElement | null {
    if (!this.canInstall()) {
      return null;
    }

    const banner = document.createElement('div');
    banner.className = 'dw-pwa-install-banner';
    banner.setAttribute('role', 'alert');

    const content = document.createElement('div');
    content.className = 'dw-pwa-banner-content';

    const icon = document.createElement('span');
    icon.className = 'dw-pwa-icon';
    icon.textContent = '⚡';

    const text = document.createElement('span');
    text.className = 'dw-pwa-text';
    text.textContent = STRINGS.pwa.installPrompt;

    content.appendChild(icon);
    content.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'dw-pwa-actions';

    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.className = 'dw-btn dw-btn--primary';
    installBtn.textContent = STRINGS.pwa.installButton;
    installBtn.addEventListener('click', async () => {
      await this.promptInstall();
      banner.remove();
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'dw-btn dw-btn--ghost';
    dismissBtn.textContent = STRINGS.pwa.closeButton;
    dismissBtn.addEventListener('click', () => {
      banner.remove();
      if (onDismiss) onDismiss();
    });

    actions.appendChild(installBtn);
    actions.appendChild(dismissBtn);

    banner.appendChild(content);
    banner.appendChild(actions);

    return banner;
  }

  /**
   * Renders the network connectivity banner (shown when offline or restored).
   */
  public renderNetworkStatusBanner(isOffline: boolean): HTMLElement {
    const banner = document.createElement('div');
    banner.className = isOffline ? 'dw-network-banner dw-network-banner--offline' : 'dw-network-banner dw-network-banner--online';
    banner.setAttribute('role', 'status');

    const icon = document.createElement('span');
    icon.textContent = isOffline ? '📡' : '🟢';

    const msg = document.createElement('span');
    msg.textContent = isOffline ? STRINGS.pwa.offlineBanner : STRINGS.pwa.onlineBanner;

    banner.appendChild(icon);
    banner.appendChild(msg);

    return banner;
  }
}

export function createPwaService(): PwaService {
  return new PwaService();
}

export const defaultPwaService = new PwaService();
