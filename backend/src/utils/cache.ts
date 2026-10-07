interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Retrieve item from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store item in cache with TTL in seconds (default: 30 seconds)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete keys matching a prefix (e.g. 'dashboard_', 'workers_')
   */
  delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Delete a specific key
   */
  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.store.clear();
  }
}

export const memoryCache = new MemoryCache();
