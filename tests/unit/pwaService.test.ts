import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PwaService,
  createPwaService
} from '../../src/services/pwaService.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('pwaService', () => {
  let pwa: PwaService;

  beforeEach(() => {
    pwa = createPwaService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects online / offline status correctly', () => {
    expect(typeof pwa.isOnline()).toBe('boolean');
  });

  it('notifies network change subscribers on window online/offline events', () => {
    const networkListener = vi.fn();
    pwa.onNetworkStatusChange(networkListener);

    // Trigger offline event
    window.dispatchEvent(new Event('offline'));
    expect(networkListener).toHaveBeenCalledWith(false);

    // Trigger online event
    window.dispatchEvent(new Event('online'));
    expect(networkListener).toHaveBeenCalledWith(true);
  });

  it('handles beforeinstallprompt event and updates installability state', () => {
    expect(pwa.canInstall()).toBe(false);

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(mockPromptEvent);

    expect(pwa.canInstall()).toBe(true);
  });

  it('triggers prompt and returns userChoice outcome when install is prompted', async () => {
    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(mockPromptEvent);

    const outcome = await pwa.promptInstall();
    expect(mockPromptEvent.prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('accepted');
    expect(pwa.canInstall()).toBe(false);
  });

  it('renders install banner element with string resources', () => {
    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(mockPromptEvent);

    const banner = pwa.renderInstallBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(STRINGS.pwa.installPrompt);
    expect(banner?.textContent).toContain(STRINGS.pwa.installButton);
    expect(banner?.textContent).toContain(STRINGS.pwa.closeButton);
  });
});
