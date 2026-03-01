import { ApiResponse } from '@/types';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  storage: 'memory' | 'localStorage' | 'sessionStorage';
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

// Cache storage interface
interface CacheStorage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
}

// Memory storage implementation
class MemoryStorage implements CacheStorage {
  private storage = new Map<string, string>();

  get(key: string): string | undefined {
    return this.storage.get(key);
  }

  set(key: string, value: string): void {
    this.storage.set(key, value);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// Browser storage implementation
class BrowserStorage implements CacheStorage {
  constructor(private storage: Storage) {}

  get(key: string): string | undefined {
    try {
      return this.storage.getItem(key) || undefined;
    } catch {
      return undefined;
    }
  }

  set(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // Storage full or disabled, ignore
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }

  clear(): void {
    try {
      this.storage.clear();
    } catch {
      // Ignore errors
    }
  }

  keys(): string[] {
    try {
      return Object.keys(this.storage);
    } catch {
      return [];
    }
  }
}

// Main cache class
export class APICache {
  private storage: CacheStorage;
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // 100 entries default
      storage: 'memory',
      ...config,
    };

    // Initialize storage based on config
    this.storage = this.createStorage();
  }

  private createStorage(): CacheStorage {
    switch (this.config.storage) {
      case 'localStorage':
        return typeof window !== 'undefined' && window.localStorage
          ? new BrowserStorage(window.localStorage)
          : new MemoryStorage();
      case 'sessionStorage':
        return typeof window !== 'undefined' && window.sessionStorage
          ? new BrowserStorage(window.sessionStorage)
          : new MemoryStorage();
      default:
        return new MemoryStorage();
    }
  }

  private generateKey(endpoint: string, params?: Record<string, any>): string {
    const baseKey = `api_cache:${endpoint}`;
    if (!params) return baseKey;

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${baseKey}?${sortedParams}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateStats(): void {
    this.stats.size = this.storage.keys().filter(key => 
      key.startsWith('api_cache:')
    ).length;
    
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
  }

  private evictOldEntries(): void {
    const keys = this.storage.keys().filter(key => key.startsWith('api_cache:'));
    
    if (keys.length <= this.config.maxSize) return;

    // Get all entries with timestamps
    const entries = keys
      .map(key => {
        try {
          const stored = this.storage.get(key);
          if (!stored) return null;
          
          const entry: CacheEntry<any> = JSON.parse(stored);
          return { key, timestamp: entry.timestamp };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp);

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.config.maxSize);
    toRemove.forEach(entry => {
      this.storage.remove(entry!.key);
      this.stats.evictions++;
    });
  }

  /**
   * Get cached data
   */
  get<T>(endpoint: string, params?: Record<string, any>): T | undefined {
    const key = this.generateKey(endpoint, params);
    
    try {
      const stored = this.storage.get(key);
      if (!stored) {
        this.stats.misses++;
        this.updateStats();
        return undefined;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      if (this.isExpired(entry)) {
        this.storage.remove(key);
        this.stats.misses++;
        this.updateStats();
        return undefined;
      }

      this.stats.hits++;
      this.updateStats();
      return entry.data;
    } catch {
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }
  }

  /**
   * Set cached data
   */
  set<T>(endpoint: string, data: T, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(endpoint, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      key,
    };

    try {
      this.storage.set(key, JSON.stringify(entry));
      this.evictOldEntries();
      this.updateStats();
    } catch {
      // Storage error, ignore
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string | RegExp): void {
    const keys = this.storage.keys().filter(key => {
      if (!key.startsWith('api_cache:')) return false;
      
      if (typeof pattern === 'string') {
        return key.includes(pattern);
      } else {
        return pattern.test(key);
      }
    });

    keys.forEach(key => this.storage.remove(key));
    this.updateStats();
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const keys = this.storage.keys().filter(key => key.startsWith('api_cache:'));
    keys.forEach(key => this.storage.remove(key));
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const keys = this.storage.keys().filter(key => key.startsWith('api_cache:'));
    
    keys.forEach(key => {
      try {
        const stored = this.storage.get(key);
        if (!stored) return;
        
        const entry: CacheEntry<any> = JSON.parse(stored);
        if (this.isExpired(entry)) {
          this.storage.remove(key);
        }
      } catch {
        // Invalid entry, remove it
        this.storage.remove(key);
      }
    });
    
    this.updateStats();
  }
}

// Cache configurations for different data types
export const cacheConfigs = {
  // Static data - cache for 1 hour
  static: {
    ttl: 60 * 60 * 1000,
    maxSize: 50,
    storage: 'localStorage' as const,
  },
  
  // User data - cache for 15 minutes
  user: {
    ttl: 15 * 60 * 1000,
    maxSize: 20,
    storage: 'sessionStorage' as const,
  },
  
  // Project data - cache for 5 minutes
  projects: {
    ttl: 5 * 60 * 1000,
    maxSize: 100,
    storage: 'memory' as const,
  },
  
  // Search results - cache for 2 minutes
  search: {
    ttl: 2 * 60 * 1000,
    maxSize: 50,
    storage: 'memory' as const,
  },
  
  // Real-time data - cache for 30 seconds
  realtime: {
    ttl: 30 * 1000,
    maxSize: 20,
    storage: 'memory' as const,
  },
};

// Create cache instances
export const apiCache = {
  static: new APICache(cacheConfigs.static),
  user: new APICache(cacheConfigs.user),
  projects: new APICache(cacheConfigs.projects),
  search: new APICache(cacheConfigs.search),
  realtime: new APICache(cacheConfigs.realtime),
};

// Cache invalidation patterns
export const cachePatterns = {
  // Invalidate all user-related cache when user data changes
  user: (userId?: number) => userId ? `/users/${userId}` : '/users',
  
  // Invalidate project cache when project data changes
  project: (projectId?: number) => projectId ? `/projects/${projectId}` : '/projects',
  
  // Invalidate proposal cache when proposal data changes
  proposal: (proposalId?: number) => proposalId ? `/proposals/${proposalId}` : '/proposals',
  
  // Invalidate auth cache when authentication changes
  auth: () => '/auth',
};

// Utility function to invalidate related caches
export const invalidateRelatedCaches = (type: keyof typeof cachePatterns, id?: number) => {
  const pattern = cachePatterns[type](id);
  
  Object.values(apiCache).forEach(cache => {
    cache.invalidate(pattern);
  });
};

// Auto-cleanup interval (run every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    Object.values(apiCache).forEach(cache => {
      cache.cleanup();
    });
  }, 5 * 60 * 1000);
} 