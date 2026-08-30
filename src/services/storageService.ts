/**
 * Storage Service for DefenceWire.in
 * Manages IndexedDB local persistence for offline PWA feed caching and 7-day auto-pruning.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';

const DB_VERSION = 1;
const STORE_CLUSTERS = 'story_clusters';
const STORE_RIVER = 'river_news';
const DEFAULT_RETENTION_DAYS = 7;

export interface PruneResult {
  prunedClusters: number;
  prunedRiver: number;
}

export class StorageService {
  private dbName: string;
  private db: IDBDatabase | null = null;
  private memoryClusters: Map<string, StoryCluster> = new Map();
  private memoryRiver: Map<string, StorySourceItem> = new Map();

  constructor(dbName: string = 'defencewire_db') {
    this.dbName = dbName;
  }

  /**
   * Initializes the IndexedDB database instance.
   */
  public async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CLUSTERS)) {
            db.createObjectStore(STORE_CLUSTERS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_RIVER)) {
            db.createObjectStore(STORE_RIVER, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch {
        resolve(); // Graceful degradation to in-memory store
      }
    });
  }

  /**
   * Saves story clusters to cache.
   */
  public async saveClusters(clusters: StoryCluster[]): Promise<void> {
    for (const cluster of clusters) {
      this.memoryClusters.set(cluster.id, cluster);
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_CLUSTERS, 'readwrite');
        const store = tx.objectStore(STORE_CLUSTERS);

        for (const cluster of clusters) {
          store.put(cluster);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all cached story clusters.
   */
  public async getClusters(): Promise<StoryCluster[]> {
    if (!this.db) {
      return Array.from(this.memoryClusters.values());
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_CLUSTERS, 'readonly');
        const store = tx.objectStore(STORE_CLUSTERS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch {
        resolve(Array.from(this.memoryClusters.values()));
      }
    });
  }

  /**
   * Saves river news items to cache.
   */
  public async saveRiverItems(items: StorySourceItem[]): Promise<void> {
    for (const item of items) {
      this.memoryRiver.set(item.id, item);
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_RIVER, 'readwrite');
        const store = tx.objectStore(STORE_RIVER);

        for (const item of items) {
          store.put(item);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all cached river news items.
   */
  public async getRiverItems(): Promise<StorySourceItem[]> {
    if (!this.db) {
      return Array.from(this.memoryRiver.values());
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_RIVER, 'readonly');
        const store = tx.objectStore(STORE_RIVER);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch {
        resolve(Array.from(this.memoryRiver.values()));
      }
    });
  }

  /**
   * Prunes cached news items and clusters older than the retention threshold (default: 7 days).
   */
  public async pruneOldEntries(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<PruneResult> {
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let prunedClusters = 0;
    let prunedRiver = 0;

    // Prune in-memory fallback
    for (const [id, cluster] of this.memoryClusters.entries()) {
      const created = new Date(cluster.createdAt || cluster.primarySource.publishedAt).getTime();
      if (created < cutoffTimestamp) {
        this.memoryClusters.delete(id);
        prunedClusters++;
      }
    }

    for (const [id, item] of this.memoryRiver.entries()) {
      const published = new Date(item.publishedAt).getTime();
      if (published < cutoffTimestamp) {
        this.memoryRiver.delete(id);
        prunedRiver++;
      }
    }

    if (!this.db) {
      return { prunedClusters, prunedRiver };
    }

    // Prune IndexedDB clusters
    const allClusters = await this.getClusters();
    const clustersToDelete = allClusters.filter((c) => {
      const time = new Date(c.createdAt || c.primarySource.publishedAt).getTime();
      return time < cutoffTimestamp;
    });

    if (clustersToDelete.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(STORE_CLUSTERS, 'readwrite');
        const store = tx.objectStore(STORE_CLUSTERS);
        for (const c of clustersToDelete) {
          store.delete(c.id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // Prune IndexedDB river
    const allRiver = await this.getRiverItems();
    const riverToDelete = allRiver.filter((r) => {
      const time = new Date(r.publishedAt).getTime();
      return time < cutoffTimestamp;
    });

    if (riverToDelete.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(STORE_RIVER, 'readwrite');
        const store = tx.objectStore(STORE_RIVER);
        for (const r of riverToDelete) {
          store.delete(r.id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return {
      prunedClusters: clustersToDelete.length || prunedClusters,
      prunedRiver: riverToDelete.length || prunedRiver
    };
  }

  /**
   * Clears all stores in IndexedDB and in-memory caches.
   */
  public async clearAll(): Promise<void> {
    this.memoryClusters.clear();
    this.memoryRiver.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction([STORE_CLUSTERS, STORE_RIVER], 'readwrite');
        tx.objectStore(STORE_CLUSTERS).clear();
        tx.objectStore(STORE_RIVER).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export function createStorageService(dbName?: string): StorageService {
  return new StorageService(dbName);
}

export const defaultStorageService = new StorageService();
