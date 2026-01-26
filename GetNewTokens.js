/**
 * GET NEW TOKENS FOR MERCADO LIBRE
 * Run this after creating a new app
 */

/**
 * Step 1: Generate Authorization URL
 * This will show you the URL to visit in your browser
 */
function generateAuthorizationURL() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const clientId = props.getProperty('ML_CLIENT_ID');
  const redirectUri = props.getProperty('WEB_APP_URL') || 'https://script.google.com/macros/s/AKfycbwGUBTlrlI1KZ6X8j_BB5QlQSy-g4t_qByq3PKBZvrVYSJXS2i6DeUNL_r2wkwuyYKIqg/exec';

  if (!clientId) {
    ui.alert('❌ Error', 'ML_CLIENT_ID no está configurado.\n\nVe a Project Settings → Script Properties y agrega tu nuevo Client ID.', ui.ButtonSet.OK);
    return;
  }

  // Generate random state for security
  const state = Utilities.getUuid();
  props.setProperty('OAUTH_STATE', state);

  // Build authorization URL
  const authUrl = 'https://auth.mercadolibre.com.mx/authorization?' +
    'response_type=code&' +
    'client_id=' + encodeURIComponent(clientId) + '&' +
    'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
    'state=' + encodeURIComponent(state);

  Logger.log('Authorization URL:');
  Logger.log(authUrl);

  const message =
    '🔐 AUTORIZACIÓN DE MERCADO LIBRE\n\n' +
    '1. Copia esta URL (también está en los logs):\n\n' +
    authUrl + '\n\n' +
    '2. Pégala en tu navegador y presiona Enter\n\n' +
    '3. Acepta los permisos que solicita la app\n\n' +
    '4. Serás redirigido a una página que dice "Success"\n\n' +
    '5. COPIA LA URL COMPLETA de esa página\n' +
    '   (debe contener "?code=TG-...")\n\n' +
    '6. Vuelve aquí y ejecuta: exchangeCodeForTokens()\n' +
    '   Pega el código cuando te lo pida\n\n' +
    'Presiona OK y se copiará la URL al portapapeles (si es posible).';

  ui.alert('Paso 1: Autorización', message, ui.ButtonSet.OK);

  // Try to show URL in a dialog for easy copying
  const htmlOutput = HtmlService
    .createHtmlOutput(
      '<html><body style="font-family: Arial; padding: 20px;">' +
      '<h2>🔐 Autoriza tu App de Mercado Libre</h2>' +
      '<p><strong>1. Haz clic en este enlace:</strong></p>' +
      '<p><a href="' + authUrl + '" target="_blank" style="color: #3483fa; font-size: 14px;">AUTORIZAR APP EN MERCADO LIBRE</a></p>' +
      '<p><strong>2. Copia esta URL (por si el enlace no funciona):</strong></p>' +
      '<textarea readonly style="width: 100%; height: 100px; font-size: 11px;">' + authUrl + '</textarea>' +
      '<p><strong>3. Después de autorizar:</strong></p>' +
      '<ul>' +
      '<li>Te redirigirá a una página (puede decir "Success" o mostrar un error - está bien)</li>' +
      '<li>COPIA LA URL COMPLETA de esa página</li>' +
      '<li>Debe contener "?code=TG-..." o "code=TG-..."</li>' +
      '<li>Vuelve a tu Sheet y ejecuta: <code>exchangeCodeForTokens()</code></li>' +
      '</ul>' +
      '</body></html>'
    )
    .setWidth(600)
    .setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Autorización Mercado Libre');
}

/**
 * Step 2: Exchange authorization code for tokens
 */
function exchangeCodeForTokens() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  // Ask for the code
  const response = ui.prompt(
    'Paso 2: Intercambiar Código',
    'Pega aquí la URL COMPLETA después de autorizar\n(debe contener "?code=TG-..." o solo pega el código):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  let codeInput = response.getResponseText().trim();

  // Extract code from URL if full URL was pasted
  let code = codeInput;
  if (codeInput.includes('code=')) {
    const match = codeInput.match(/code=([^&]+)/);
    if (match) {
      code = match[1];
    }
  }

  if (!code || code.length < 10) {
    ui.alert('❌ Error', 'Código inválido. Asegúrate de pegar la URL completa o el código.', ui.ButtonSet.OK);
    return;
  }

  Logger.log('Authorization code: ' + code);

  // Get credentials
  const clientId = props.getProperty('ML_CLIENT_ID');
  const clientSecret = props.getProperty('ML_CLIENT_SECRET');
  const redirectUri = props.getProperty('WEB_APP_URL') || 'https://script.google.com/macros/s/AKfycbwGUBTlrlI1KZ6X8j_BB5QlQSy-g4t_qByq3PKBZvrVYSJXS2i6DeUNL_r2wkwuyYKIqg/exec';

  if (!clientId || !clientSecret) {
    ui.alert('❌ Error', 'Faltan credenciales.\n\nAsegúrate de tener ML_CLIENT_ID y ML_CLIENT_SECRET configurados.', ui.ButtonSet.OK);
    return;
  }

  // Exchange code for tokens
  const tokenUrl = 'https://api.mercadolibre.com/oauth/token';

  const payload = {
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri
  };

  try {
    Logger.log('Exchanging code for tokens...');

    const tokenResponse = UrlFetchApp.fetch(tokenUrl, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: payload,
      muteHttpExceptions: true
    });

    const statusCode = tokenResponse.getResponseCode();
    const responseText = tokenResponse.getContentText();

    Logger.log('Response Code: ' + statusCode);
    Logger.log('Response: ' + responseText);

    if (statusCode === 200) {
      const tokens = JSON.parse(responseText);

      // Save tokens
      props.setProperty('ML_ACCESS_TOKEN', tokens.access_token);
      props.setProperty('ML_REFRESH_TOKEN', tokens.refresh_token);

      // Also save user_id if available
      if (tokens.user_id) {
        props.setProperty('SELLER_ID', tokens.user_id.toString());
      }

      Logger.log('✅ Tokens saved successfully!');
      Logger.log('Access Token: ' + tokens.access_token.substring(0, 20) + '...');
      Logger.log('Refresh Token: ' + tokens.refresh_token.substring(0, 20) + '...');
      Logger.log('User ID: ' + tokens.user_id);

      ui.alert(
        '✅ ¡Tokens Obtenidos Exitosamente!',
        'Tokens guardados en Script Properties:\n\n' +
        '✅ ML_ACCESS_TOKEN\n' +
        '✅ ML_REFRESH_TOKEN\n' +
        '✅ SELLER_ID: ' + tokens.user_id + '\n\n' +
        'Ahora puedes:\n' +
        '1. Registrar el webhook\n' +
        '2. Ejecutar la auditoría de inventario\n' +
        '3. Hacer pruebas\n\n' +
        'Siguiente paso:\n' +
        'Menu: 🔗 Webhooks → 📝 Registrar Webhook en ML',
        ui.ButtonSet.OK
      );

    } else {
      ui.alert(
        '❌ Error al Obtener Tokens',
        'Error ' + statusCode + ':\n\n' +
        responseText + '\n\n' +
        'Posibles causas:\n' +
        '• Código expirado (genera uno nuevo)\n' +
        '• Client Secret incorrecto\n' +
        '• Redirect URI no coincide',
        ui.ButtonSet.OK
      );
    }

  } catch (e) {
    Logger.log('❌ Exception: ' + e.toString());
    ui.alert('❌ Excepción', e.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Quick Start - Run both steps
 */
function getNewTokensQuickStart() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    '🚀 Obtener Nuevos Tokens',
    'Este asistente te ayudará a obtener tus tokens de acceso.\n\n' +
    '¿Estás listo para comenzar?\n\n' +
    'Nota: Necesitas haber configurado ML_CLIENT_ID y ML_CLIENT_SECRET primero.',
    ui.ButtonSet.OK_CANCEL
  );

  if (result === ui.Button.OK) {
    generateAuthorizationURL();
  }
}

/**
 * Helper: Show current credentials
 */
function showCurrentCredentials() {
  const props = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  const clientId = props.getProperty('ML_CLIENT_ID') || '(no configurado)';
  const clientSecret = props.getProperty('ML_CLIENT_SECRET') || '(no configurado)';
  const accessToken = props.getProperty('ML_ACCESS_TOKEN') || '(no configurado)';
  const refreshToken = props.getProperty('ML_REFRESH_TOKEN') || '(no configurado)';
  const sellerId = props.getProperty('SELLER_ID') || '(no configurado)';
  const webAppUrl = props.getProperty('WEB_APP_URL') || '(no configurado)';

  const message =
    '🔑 CREDENCIALES ACTUALES\n\n' +
    'CLIENT_ID:\n' + clientId + '\n\n' +
    'CLIENT_SECRET:\n' + (clientSecret !== '(no configurado)' ? clientSecret.substring(0, 20) + '...' : clientSecret) + '\n\n' +
    'ACCESS_TOKEN:\n' + (accessToken !== '(no configurado)' ? accessToken.substring(0, 30) + '...' : accessToken) + '\n\n' +
    'REFRESH_TOKEN:\n' + (refreshToken !== '(no configurado)' ? refreshToken.substring(0, 30) + '...' : refreshToken) + '\n\n' +
    'SELLER_ID:\n' + sellerId + '\n\n' +
    'WEB_APP_URL:\n' + webAppUrl;

  Logger.log(message);
  ui.alert('Credenciales Actuales', message, ui.ButtonSet.OK);
}
