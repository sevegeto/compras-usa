/**
 * Authentication module for Mercado Libre API
 * This file should contain your access token management logic
 *
 * IMPORTANT: Replace with your actual implementation
 */

/**
 * Returns a valid access token for Mercado Libre API
 *
 * This is a placeholder. Your actual implementation should:
 * 1. Store tokens securely in PropertiesService
 * 2. Handle token refresh automatically
 * 3. Return a valid access token
 *
 * @returns {string} Valid access token
 */
function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('ML_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('Access token not configured. Please set ML_ACCESS_TOKEN in Script Properties.');
  }

  // TODO: Add token refresh logic if needed
  // If token is expired, refresh it using the refresh token

  return accessToken;
}

/**
 * Initial setup to store your Mercado Libre credentials
 * Run this once with your actual tokens
 *
 * To get your tokens:
 * 1. Go to https://developers.mercadolibre.com.mx/
 * 2. Create an app
 * 3. Get your access token through OAuth flow
 */
function setupCredentials() {
  const props = PropertiesService.getScriptProperties();

  // Replace these with your actual tokens
  const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE';
  const REFRESH_TOKEN = 'YOUR_REFRESH_TOKEN_HERE'; // Optional

  props.setProperty('ML_ACCESS_TOKEN', ACCESS_TOKEN);

  if (REFRESH_TOKEN) {
    props.setProperty('ML_REFRESH_TOKEN', REFRESH_TOKEN);
  }

  Logger.log('Credentials stored successfully');
}

/**
 * Advanced: Refresh the access token using refresh token
 * Implement this if you want automatic token renewal
 */
function refreshAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('ML_REFRESH_TOKEN');
  const clientId = props.getProperty('ML_CLIENT_ID');
  const clientSecret = props.getProperty('ML_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Refresh token or client credentials not configured');
  }

  const url = 'https://api.mercadolibre.com/oauth/token';
  const payload = {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  };

  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.access_token) {
      props.setProperty('ML_ACCESS_TOKEN', result.access_token);

      if (result.refresh_token) {
        props.setProperty('ML_REFRESH_TOKEN', result.refresh_token);
      }

      return result.access_token;
    }
  } catch (error) {
    Logger.log('Token refresh failed: ' + error.toString());
    throw error;
  }
}
