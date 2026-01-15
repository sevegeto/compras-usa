/**
 * Authentication module for Mercado Libre API
 * Handles secure token storage and automatic refreshing
 */

/**
 * Returns a valid access token for Mercado Libre API
 * Automatically refreshes the token if it's expired or about to expire
 *
 * @returns {string} Valid access token
 */
function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('ML_ACCESS_TOKEN');
  const refreshToken = props.getProperty('ML_REFRESH_TOKEN');
  
  // Check expiration (stored as milliseconds timestamp)
  const expiresAt = parseInt(props.getProperty('ML_EXPIRES_AT') || '0');
  const now = Date.now();
  
  // Buffer time: Refresh if expiring in less than 5 minutes
  if (accessToken && expiresAt > (now + 300000)) {
    return accessToken;
  }

  if (refreshToken) {
    Logger.log('🔄 Token expired or about to expire. Refreshing...');
    return refreshAccessToken();
  }

  if (accessToken) {
    Logger.log('⚠️ Warning: Using potentially expired token (No refresh token available)');
    return accessToken;
  }

  throw new Error('❌ Authentication Error: No access token or refresh token found. Please run setupCredentials()');
}

/**
 * Refreshes the access token using the stored refresh token
 */
function refreshAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('ML_REFRESH_TOKEN');
  const clientId = props.getProperty('ML_CLIENT_ID');
  const clientSecret = props.getProperty('ML_CLIENT_SECRET');

  if (!refreshToken) throw new Error('No refresh token available');
  if (!clientId || !clientSecret) throw new Error('Client ID/Secret not configured');

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
    const statusCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());

    if (statusCode !== 200) {
      Logger.log('❌ Token refresh failed (HTTP ' + statusCode + '): ' + JSON.stringify(result));
      throw new Error('Failed to refresh token: ' + (result.message || result.error));
    }

    props.setProperty('ML_ACCESS_TOKEN', result.access_token);
    if (result.refresh_token) {
      props.setProperty('ML_REFRESH_TOKEN', result.refresh_token);
    }

    const expiresIn = result.expires_in || 21600; 
    const expirationTime = Date.now() + (expiresIn * 1000);
    props.setProperty('ML_EXPIRES_AT', expirationTime.toString());

    Logger.log('✅ Token refreshed successfully.');
    return result.access_token;
  } catch (error) {
    Logger.log('❌ Critical Error in refreshAccessToken: ' + error.toString());
    throw error;
  }
}

/**
 * Initial setup to store your Mercado Libre credentials
 */
function setupCredentials() {
  const props = PropertiesService.getScriptProperties();

  // ==========================================
  // DATOS DE TU APP (YA CONFIGURADOS)
  // ==========================================
  const CLIENT_ID = '4093911268328479'; // Tu App ID
  const CLIENT_SECRET = 'TU_CLIENT_SECRET_AQUI'; // PEGA AQUÍ TU SECRET
  
  const ACCESS_TOKEN = 'TU_ACCESS_TOKEN_AQUI'; // PEGA AQUÍ TU TOKEN ACTUAL
  const REFRESH_TOKEN = 'TU_REFRESH_TOKEN_AQUI'; // PEGA AQUÍ TU REFRESH TOKEN

  // Guardar en Propiedades
  props.setProperty('ML_CLIENT_ID', CLIENT_ID);
  props.setProperty('ML_APP_ID', CLIENT_ID); // Guardamos ambos por si acaso
  props.setProperty('ML_CLIENT_SECRET', CLIENT_SECRET);
  props.setProperty('ML_ACCESS_TOKEN', ACCESS_TOKEN);
  props.setProperty('ML_REFRESH_TOKEN', REFRESH_TOKEN);
  props.setProperty('ML_EXPIRES_AT', '0'); 

  Logger.log('✅ Credenciales guardadas correctamente en Propiedades del Script.');
}