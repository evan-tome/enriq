interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/** A simple in-memory cache that recomputes a value once its TTL has elapsed. */
export class TtlCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();

  constructor(private ttlMs: number) {}

  /** Returns the cached value for `key`, or computes, caches, and returns it via `fetcher`. */
  async getOrSet(key: K, fetcher: () => Promise<V>): Promise<V> {
    const cached = this.store.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await fetcher();
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }
}
