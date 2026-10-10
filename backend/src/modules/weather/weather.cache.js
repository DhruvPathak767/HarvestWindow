/**
 * Bounded In-Memory Weather Cache.
 * Prevents redundant calls to Open-Meteo for the same geographic coordinates.
 * Keys are normalized to 2 decimal places (~1.1 km precision) to leverage weather grid consistency.
 */
export class WeatherCache {
  constructor(maxEntries = 200, defaultTtlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
  }

  generateKey(latitude, longitude) {
    const lat = Number(latitude).toFixed(2);
    const lon = Number(longitude).toFixed(2);
    return `${lat}:${lon}`;
  }

  get(latitude, longitude) {
    const key = this.generateKey(latitude, longitude);
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return {
      data: entry.data,
      fetchedAt: entry.fetchedAt,
      isCached: true,
    };
  }

  set(latitude, longitude, data, ttlMs = this.defaultTtlMs) {
    const key = this.generateKey(latitude, longitude);

    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const fetchedAt = new Date().toISOString();
    this.store.set(key, {
      data,
      fetchedAt,
      expiresAt: Date.now() + ttlMs,
    });

    return { data, fetchedAt, isCached: false };
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

export const weatherCache = new WeatherCache();
export default weatherCache;
