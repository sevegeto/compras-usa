/**
 * PERFORMANCE CACHE MANAGER
 * Provides caching for API responses and sheet data to reduce redundant operations
 * Uses Google Apps Script CacheService for temporary storage
 */

const CACHE_CONFIG = {
  DEFAULT_TTL: 900, // 15 minutes in seconds
  API_CACHE_TTL: 600, // 10 minutes for API responses
  SHEET_CACHE_TTL: 300, // 5 minutes for sheet data
  MAX_CACHE_SIZE: 100000 // 100KB limit per cache entry
};

/**
 * Cache manager singleton
 */
class CacheManager {
  constructor() {
    this.scriptCache = CacheService.getScriptCache();
    this.userCache = CacheService.getUserCache();
  }

  /**
   * Gets a value from cache
   * @param {string} key - Cache key
   * @param {boolean} userLevel - Use user cache instead of script cache
   * @returns {*} Cached value or null
   */
  get(key, userLevel = false) {
    try {
      const cache = userLevel ? this.userCache : this.scriptCache;
      const cached = cache.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check if expired
        if (data.expiresAt && Date.now() > data.expiresAt) {
          this.remove(key, userLevel);
          return null;
        }
        
        Logger.log(`📦 Cache HIT: ${key}`);
        return data.value;
      }
      
      Logger.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      Logger.log(`Cache get error for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Sets a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @param {boolean} userLevel - Use user cache instead of script cache
   * @returns {boolean} Success status
   */
  set(key, value, ttl = CACHE_CONFIG.DEFAULT_TTL, userLevel = false) {
    try {
      const cache = userLevel ? this.userCache : this.scriptCache;
      
      const cacheData = {
        value: value,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000)
      };
      
      const serialized = JSON.stringify(cacheData);
      
      // Check size limit
      if (serialized.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
        Logger.log(`⚠️ Cache value too large for ${key}: ${serialized.length} bytes`);
        return false;
      }
      
      cache.put(key, serialized, ttl);
      Logger.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      Logger.log(`Cache set error for ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Removes a value from cache
   * @param {string} key - Cache key
   * @param {boolean} userLevel - Use user cache instead of script cache
   */
  remove(key, userLevel = false) {
    const cache = userLevel ? this.userCache : this.scriptCache;
    cache.remove(key);
    Logger.log(`🗑️ Cache REMOVE: ${key}`);
  }

  /**
   * Clears all cache entries
   * @param {boolean} userLevel - Clear user cache instead of script cache
   */
  clearAll(userLevel = false) {
    const cache = userLevel ? this.userCache : this.scriptCache;
    cache.removeAll();
    Logger.log(`🧹 Cache CLEARED (${userLevel ? 'user' : 'script'})`);
  }

  /**
   * Gets or sets cache with a fallback function
   * @param {string} key - Cache key
   * @param {Function} fallbackFn - Function to call if cache miss
   * @param {number} ttl - Time to live in seconds
   * @param {boolean} userLevel - Use user cache
   * @returns {*} Cached or fetched value
   */
  getOrSet(key, fallbackFn, ttl = CACHE_CONFIG.DEFAULT_TTL, userLevel = false) {
    const cached = this.get(key, userLevel);
    
    if (cached !== null) {
      return cached;
    }
    
    Logger.log(`⚙️ Cache FALLBACK: Executing function for ${key}`);
    const value = fallbackFn();
    
    if (value !== null && value !== undefined) {
      this.set(key, value, ttl, userLevel);
    }
    
    return value;
  }

  /**
   * Caches an API response
   * @param {string} url - API URL (used as key)
   * @param {Function} apiFn - Function that makes the API call
   * @returns {*} API response
   */
  cacheApiCall(url, apiFn) {
    const cacheKey = `api:${url}`;
    return this.getOrSet(cacheKey, apiFn, CACHE_CONFIG.API_CACHE_TTL);
  }

  /**
   * Caches sheet data
   * @param {string} sheetName - Sheet name
   * @param {string} range - Range (e.g., "A1:Z100")
   * @param {Function} fetchFn - Function to fetch data
   * @returns {Array<Array>} Sheet data
   */
  cacheSheetData(sheetName, range, fetchFn) {
    const cacheKey = `sheet:${sheetName}:${range}`;
    return this.getOrSet(cacheKey, fetchFn, CACHE_CONFIG.SHEET_CACHE_TTL);
  }

  /**
   * Invalidates all cache entries matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "api:", "sheet:Productos")
   * @param {boolean} userLevel - Use user cache
   */
  invalidatePattern(pattern, userLevel = false) {
    // Note: CacheService doesn't support pattern matching
    // This is a placeholder for future implementation
    Logger.log(`⚠️ Pattern invalidation not fully supported by CacheService: ${pattern}`);
    Logger.log(`💡 Consider clearing all cache or using specific keys`);
  }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * Gets cached sheet data or fetches it
 * @param {string} sheetName - Sheet name
 * @param {string} range - Optional range (default: all data)
 * @returns {Array<Array>} Sheet data
 */
function getCachedSheetData(sheetName, range = null) {
  const cacheKey = range ? `${sheetName}:${range}` : sheetName;
  
  return cacheManager.cacheSheetData(sheetName, cacheKey, () => {
    const sheet = safeGetSheet(sheetName);
    if (!sheet) return [];
    
    if (range) {
      return sheet.getRange(range).getValues();
    } else {
      // Optimize: Only get actual data, not entire range
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      if (lastRow === 0 || lastCol === 0) return [];
      
      return sheet.getRange(1, 1, lastRow, lastCol).getValues();
    }
  });
}

/**
 * Clears cache for a specific sheet (call after updates)
 * @param {string} sheetName - Sheet name
 */
function invalidateSheetCache(sheetName) {
  // Clear all related cache entries
  cacheManager.clearAll(); // Simplified approach
  Logger.log(`🔄 Invalidated cache for sheet: ${sheetName}`);
}

/**
 * Menu function to clear all caches
 */
function clearAllCaches() {
  cacheManager.clearAll(false); // Script cache
  cacheManager.clearAll(true);  // User cache
  
  SpreadsheetApp.getUi().alert('✅ All caches cleared');
}

/**
 * Gets cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  // CacheService doesn't provide size/count APIs
  // This is a placeholder for logging
  return {
    message: 'Cache statistics not available through CacheService API',
    suggestion: 'Monitor cache hits/misses in execution logs'
  };
}
