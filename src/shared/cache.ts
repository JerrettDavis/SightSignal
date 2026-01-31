/**
 * Response caching utilities for API routes
 * Uses in-memory LRU cache for development, should use Redis in production
 */

interface CacheEntry<T> {
  data: T;
  etag: string;
  expiresAt: number;
}

// Simple LRU cache implementation
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, entry);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
const responseCache = new LRUCache<unknown>(1000);

/**
 * Generate ETag from data
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Cache key (usually the request URL)
   */
  key: string;

  /**
   * Time to live in seconds
   */
  ttlSeconds: number;

  /**
   * Whether to use ETag for conditional requests
   */
  useETag?: boolean;
}

/**
 * Get cached response
 */
export function getCachedResponse<T>(
  key: string
): { data: T; etag: string } | null {
  return responseCache.get(key) as { data: T; etag: string } | null;
}

/**
 * Set cached response
 */
export function setCachedResponse<T>(data: T, config: CacheConfig): string {
  const etag = config.useETag !== false ? generateETag(data) : "";
  const expiresAt = Date.now() + config.ttlSeconds * 1000;

  responseCache.set(config.key, {
    data,
    etag,
    expiresAt,
  });

  return etag;
}

/**
 * Invalidate cache by key or pattern
 */
export function invalidateCache(keyOrPattern: string): void {
  if (keyOrPattern.includes("*")) {
    // Pattern matching (simple implementation)
    const regex = new RegExp("^" + keyOrPattern.replace(/\*/g, ".*") + "$");
    // Note: This is inefficient for large caches, use Redis SCAN in production
    console.log(`Clearing cache with pattern: ${regex.source}`);
    responseCache.clear(); // For simplicity, clear all
  } else {
    responseCache.delete(keyOrPattern);
  }
}

/**
 * Get cache headers for response
 */
export function getCacheHeaders(
  ttlSeconds: number,
  etag?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": `public, max-age=${ttlSeconds}, must-revalidate`,
    Vary: "Accept-Encoding",
  };

  if (etag) {
    headers["ETag"] = etag;
  }

  return headers;
}

/**
 * Check if request matches ETag (for 304 Not Modified)
 */
export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  return ifNoneMatch === etag;
}

/**
 * Common cache TTLs
 */
export const CACHE_TTL = {
  // Very short for frequently changing data
  SHORT: 30, // 30 seconds
  // Medium for moderately changing data
  MEDIUM: 300, // 5 minutes
  // Long for rarely changing data
  LONG: 3600, // 1 hour
  // Very long for static/immutable data
  STATIC: 86400, // 24 hours
} as const;

/**
 * Cache statistics (useful for monitoring)
 */
export function getCacheStats() {
  return {
    size: responseCache.size(),
    maxSize: 1000,
  };
}
