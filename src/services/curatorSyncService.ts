/**
 * Worldwide Curator Git Sync Service for DefenceWire.in
 * Commits curated intelligence directly to GitHub Contents API to trigger edge deployments.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';

export interface CuratorSyncPayload {
  clusters: StoryCluster[];
  river: StorySourceItem[];
}

export interface CuratorSyncResult {
  success: boolean;
  commitUrl?: string;
  error?: string;
}

const PAT_STORAGE_KEY = 'dw_curator_github_pat';
const REPO_OWNER = 'ai-borne';
const REPO_NAME = 'DefenceWire';
const TARGET_FILE_PATH = 'public/data/news.json';
const GITHUB_API_BASE = 'https://api.github.com';

export class CuratorSyncService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  /**
   * Retrieves securely stored Personal Access Token.
   */
  public getStoredToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(PAT_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  /**
   * Persists Personal Access Token for 1-click updates.
   */
  public setStoredToken(token: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PAT_STORAGE_KEY, token.trim());
      }
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Clears stored Personal Access Token.
   */
  public clearStoredToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(PAT_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Checks if a token is configured.
   */
  public hasToken(): boolean {
    return Boolean(this.getStoredToken());
  }

  /**
   * Encodes a string to Base64 safely supporting Unicode.
   */
  public encodeBase64Unicode(str: string): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Fetches the current SHA of public/data/news.json on the target repo.
   */
  public async fetchCurrentFileSha(token: string): Promise<string | null> {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${TARGET_FILE_PATH}`;
    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid GitHub Token or missing repo scope.');
      }

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = (await response.json()) as { sha?: string };
      return data.sha || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch file metadata: ${message}`);
    }
  }

  /**
   * Commits the curated snapshot directly to the repository.
   */
  public async publishCuratedSnapshot(
    token: string,
    payload: CuratorSyncPayload
  ): Promise<CuratorSyncResult> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return { success: false, error: 'GitHub Personal Access Token is required.' };
    }

    try {
      const currentSha = await this.fetchCurrentFileSha(trimmedToken);
      const jsonContent = JSON.stringify(payload, null, 2);
      const base64Content = this.encodeBase64Unicode(jsonContent);

      const commitUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${TARGET_FILE_PATH}`;
      const commitBody: Record<string, unknown> = {
        message: 'chore(curator): 1-click curated editorial intelligence update [skip ci]',
        content: base64Content,
        branch: 'main'
      };

      if (currentSha) {
        commitBody.sha = currentSha;
      }

      const response = await this.fetchFn(commitUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(commitBody)
      });

      if (response.status === 200 || response.status === 201) {
        const resData = (await response.json()) as { commit?: { html_url?: string } };
        return {
          success: true,
          commitUrl: resData.commit?.html_url || 'https://github.com/ai-borne/DefenceWire'
        };
      }

      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Invalid GitHub Token or missing repo scope.' };
      }

      if (response.status === 409) {
        return { success: false, error: 'Conflict: File was updated concurrently. Please retry.' };
      }

      const errText = await response.text();
      return { success: false, error: `GitHub API error (${response.status}): ${errText}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const defaultCuratorSyncService = new CuratorSyncService();
