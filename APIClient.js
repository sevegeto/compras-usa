/**
 * API CLIENT FOR MERCADO LIBRE
 * Handles API requests with retry logic and rate limiting
 * File named to load before main.js alphabetically
 */

const API_CONFIG = {
  BASE_URL: 'https://api.mercadolibre.com',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  BATCH_SIZE: 20
};

/**
 * Mercado Libre API Client with retry logic and error handling
 */
class MercadoLibreAPI {
  /**
   * @param {string} accessToken - ML API access token
   */
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Fetches data from ML API with automatic retry on failures
   * @param {string} url - Full API URL to fetch
   * @param {Object} options - UrlFetchApp options
   * @returns {HTTPResponse} Response object
   */
  fetchWithRetry(url, options = {}) {
    const maxRetries = API_CONFIG.MAX_RETRIES;
    let retryDelay = API_CONFIG.RETRY_DELAY;

    const defaultHeaders = {
      'Authorization': 'Bearer ' + this.accessToken,
      'Content-Type': 'application/json',
    };

    const headers = {
      ...defaultHeaders,
      ...(options.headers || {})
    };

    const params = {
      ...options,
      headers: headers,
      muteHttpExceptions: true,
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = UrlFetchApp.fetch(url, params);
        const responseCode = response.getResponseCode();

        if (responseCode >= 200 && responseCode < 300) {
          return response;
        } else if (responseCode === 429) {
          // Rate limited
          if (attempt < maxRetries) {
            Logger.log(`⚠️ Rate limited (429). Retrying in ${retryDelay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
            Utilities.sleep(retryDelay);
            retryDelay *= 2;
            continue;
          } else {
            throw new Error(`Rate limited after ${maxRetries} retries.`);
          }
        } else if (responseCode >= 400 && responseCode < 500) {
          // Client error
          const errorText = response.getContentText();
          throw new Error(`Client error (${responseCode}): ${errorText}`);
        } else if (responseCode >= 500) {
          // Server error
          if (attempt < maxRetries) {
            Logger.log(`⚠️ Server error (${responseCode}). Retrying in ${retryDelay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
            Utilities.sleep(retryDelay);
            retryDelay *= 2;
            continue;
          } else {
            throw new Error(`Server error (${responseCode}) after ${maxRetries} retries.`);
          }
        } else {
          throw new Error(`Unexpected HTTP status code: ${responseCode}`);
        }
      } catch (error) {
        if (attempt < maxRetries && error.message.indexOf('Client error') === -1) {
          Logger.log(`⚠️ Request failed. Retrying in ${retryDelay}ms... (Attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
          Utilities.sleep(retryDelay);
          retryDelay *= 2;
        } else {
          throw new Error(`Request failed after ${maxRetries} retries: ${error.message}`);
        }
      }
    }
    throw new Error("Unexpected error in fetchWithRetry.");
  }

  /**
   * Fetches multiple items in batch
   * @param {Array<string>} itemIds - Array of item IDs
   * @returns {Array} Array of item objects
   */
  fetchItemsBatch(itemIds) {
    if (!itemIds || itemIds.length === 0) return [];
    
    const url = `${API_CONFIG.BASE_URL}/items?ids=${itemIds.join(',')}`;
    const response = this.fetchWithRetry(url);
    return JSON.parse(response.getContentText());
  }

  /**
   * Fetches user items using scroll API
   * @param {string} userId - ML user ID
   * @param {string} scrollId - Scroll ID for pagination (optional)
   * @param {number} limit - Number of results per page
   * @returns {Object} Response with results and scroll_id
   */
  fetchUserItemsScroll(userId, scrollId = null, limit = 100) {
    let url = `${API_CONFIG.BASE_URL}/users/${userId}/items/search?search_type=scan&limit=${limit}`;
    
    if (scrollId) {
      url += `&scroll_id=${scrollId}`;
    }
    
    const response = this.fetchWithRetry(url);
    return JSON.parse(response.getContentText());
  }

  /**
   * Gets a single item details
   * @param {string} itemId - ML item ID
   * @returns {Object} Item object
   */
  getItem(itemId) {
    const url = `${API_CONFIG.BASE_URL}/items/${itemId}`;
    const response = this.fetchWithRetry(url);
    return JSON.parse(response.getContentText());
  }

  /**
   * Updates item stock
   * @param {string} itemId - ML item ID
   * @param {number} quantity - New stock quantity
   * @returns {Object} Update response
   */
  updateItemStock(itemId, quantity) {
    const url = `${API_CONFIG.BASE_URL}/items/${itemId}`;
    const payload = JSON.stringify({ available_quantity: quantity });
    
    const options = {
      method: 'put',
      payload: payload
    };
    
    const response = this.fetchWithRetry(url, options);
    return JSON.parse(response.getContentText());
  }
}
