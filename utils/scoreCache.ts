import { Score } from '@/types';

/**
 * Score calculation cache strategy
 * 
 * PROBLEM: Score calculations run on every screen focus, even if data hasn't changed
 * SOLUTION: Cache scores by eventId/day and only recalculate when data actually changes
 * 
 * Usage:
 * 1. After calculating scores, store them: scoreCache.set('event123', 1, scoredPlayers)
 * 2. Before calculating, check cache: const cached = scoreCache.get('event123', 1)
 * 3. When data changes, clear: scoreCache.clear('event123', 1)
 */

interface CacheEntry {
  timestamp: number;
  data: Score[];
}

class ScoreCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  /**
   * Generate cache key from eventId and day
   */
  private getKey(eventId: string, day: number): string {
    return `${eventId}:day:${day}`;
  }

  /**
   * Store calculated scores in cache
   */
  set(eventId: string, day: number, scores: Score[]): void {
    const key = this.getKey(eventId, day);
    this.cache.set(key, {
      timestamp: Date.now(),
      data: scores,
    });
    console.log(`[scoreCache] Cached scores for ${key}`);
  }

  /**
   * Retrieve cached scores if valid (not expired)
   */
  get(eventId: string, day: number): Score[] | null {
    const key = this.getKey(eventId, day);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      console.log(`[scoreCache] Cache expired for ${key}`);
      return null;
    }

    console.log(`[scoreCache] Cache HIT for ${key}`);
    return entry.data;
  }

  /**
   * Clear cache for specific day (after scores are updated)
   */
  clear(eventId: string, day: number): void {
    const key = this.getKey(eventId, day);
    this.cache.delete(key);
    console.log(`[scoreCache] Cleared cache for ${key}`);
  }

  /**
   * Clear all cache for an event (when groupings change, etc.)
   */
  clearEvent(eventId: string): void {
    let cleared = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(eventId)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[scoreCache] Cleared ${cleared} cache entries for event ${eventId}`);
    }
  }

  /**
   * Get cache stats (for debugging)
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const scoreCache = new ScoreCache();
