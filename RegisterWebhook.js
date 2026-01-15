/**
 * WEBHOOK REGISTRATION FOR MERCADO LIBRE
 * Multiple methods to register webhooks
 */

/**
 * Method 1: Automatic Registration (Recommended)
 */
function registerWebhook() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  // 1. Get Web App URL
  let webhookUrl = props.getProperty('WEB_APP_URL');

  if (!webhookUrl) {
    const response = ui.prompt(
      'Configurar Webhook',
      'Pega aquí la URL de tu Web App (https://script.google.com/.../exec):',
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;
    webhookUrl = response.getResponseText().trim();

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      ui.alert('❌ URL inválida. Debe empezar con https://');
      return;
    }

    props.setProperty('WEB_APP_URL', webhookUrl);
  }

  // 2. Get credentials
  const accessToken = getAccessToken();
  const clientId = props.getProperty('ML_CLIENT_ID');

  if (!clientId) {
    ui.alert('❌ Error: ML_CLIENT_ID no está configurado.\n\nVe a Project Settings → Script Properties y agrega ML_CLIENT_ID');
    return;
  }

  // 3. Try to register webhook using the correct API
  const success = registerWebhookViaAPI(clientId, accessToken, webhookUrl);

  if (success) {
    ui.alert('✅ Webhook registrado exitosamente en Mercado Libre.\n\nURL: ' + webhookUrl);
  } else {
    // Show manual instructions
    showManualInstructions(clientId, webhookUrl);
  }
}

/**
 * Register webhook via API
 */
function registerWebhookViaAPI(appId, accessToken, webhookUrl) {
  try {
    // Method 1: Update application settings (PUT)
    const url = `https://api.mercadolibre.com/applications/${appId}`;

    const payload = {
      notification_url: webhookUrl
    };

    Logger.log('🔍 Registering webhook...');
    Logger.log('App ID: ' + appId);
    Logger.log('Webhook URL: ' + webhookUrl);

    const response = UrlFetchApp.fetch(url, {
      method: 'put',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('Response Code: ' + statusCode);
    Logger.log('Response: ' + responseText);

    if (statusCode === 200 || statusCode === 201) {
      Logger.log('✅ Webhook registered successfully');
      return true;
    } else if (statusCode === 403) {
      Logger.log('❌ 403 Forbidden - App needs notification permissions');
      return false;
    } else {
      Logger.log('❌ Error: ' + responseText);
      return false;
    }
  } catch (e) {
    Logger.log('❌ Exception: ' + e.toString());
    return false;
  }
}

/**
 * Show manual registration instructions
 */
function showManualInstructions(appId, webhookUrl) {
  const ui = SpreadsheetApp.getUi();

  const instructions =
    '📋 REGISTRO MANUAL DE WEBHOOK\n\n' +
    'Tu app necesita configurarse manualmente. Sigue estos pasos:\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'OPCIÓN 1: Portal de Desarrolladores\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '1. Ve a: https://developers.mercadolibre.com/\n' +
    '2. Login y selecciona tu app\n' +
    '3. Busca la sección "Notificaciones" o "Webhooks"\n' +
    '4. Pega esta URL:\n' +
    '   ' + webhookUrl + '\n' +
    '5. Selecciona estos tópicos:\n' +
    '   ✓ items\n' +
    '   ✓ orders_v2\n' +
    '   ✓ questions\n' +
    '   ✓ payments (opcional)\n' +
    '   ✓ messages (opcional)\n' +
    '   ✓ shipments (opcional)\n' +
    '6. Guarda los cambios\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'OPCIÓN 2: API con CURL\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Abre una terminal y ejecuta:\n\n' +
    'curl -X PUT \\\n' +
    '  "https://api.mercadolibre.com/applications/' + appId + '" \\\n' +
    '  -H "Authorization: Bearer TU_ACCESS_TOKEN" \\\n' +
    '  -H "Content-Type: application/json" \\\n' +
    '  -d \'{"notification_url": "' + webhookUrl + '"}\'\n\n' +
    'Reemplaza TU_ACCESS_TOKEN con tu token actual.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Después de registrar manualmente:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Ejecuta: 🔗 Webhooks → ✅ Verificar Estado Webhook\n' +
    '• Haz un cambio en ML y espera 1-2 minutos\n' +
    '• Revisa RAW_Webhook_Log\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '¿Por qué el error 403?\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Tu app puede estar en modo "Test"\n' +
    '• Falta el scope "notifications"\n' +
    '• Necesitas aprobar la app en producción\n' +
    '• El token necesita refresh\n\n' +
    'Usa el portal de desarrolladores (Opción 1) es más fácil.';

  ui.alert('Registro Manual Requerido', instructions, ui.ButtonSet.OK);

  // Also log to console
  Logger.log(instructions);
}

/**
 * Alternative: Register using Topics API
 */
function registerWebhookTopics() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const webhookUrl = props.getProperty('WEB_APP_URL');
  const accessToken = getAccessToken();
  const clientId = props.getProperty('ML_CLIENT_ID');

  if (!webhookUrl || !clientId) {
    ui.alert('❌ Faltan configuraciones. Ejecuta registerWebhook() primero.');
    return;
  }

  const topics = ['items', 'orders_v2', 'questions'];

  topics.forEach(topic => {
    try {
      const url = `https://api.mercadolibre.com/applications/${clientId}/topics/${topic}`;

      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ url: webhookUrl }),
        muteHttpExceptions: true
      });

      Logger.log(`Topic ${topic}: ${response.getResponseCode()} - ${response.getContentText()}`);
    } catch (e) {
      Logger.log(`Error registering ${topic}: ${e.toString()}`);
    }
  });

  ui.alert('Registro de tópicos completado. Revisa los logs para ver resultados.');
}

/**
 * Generate curl command for manual registration
 */
function generateCurlCommand() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const webhookUrl = props.getProperty('WEB_APP_URL');
  const accessToken = getAccessToken();
  const clientId = props.getProperty('ML_CLIENT_ID');

  if (!webhookUrl) {
    ui.alert('❌ Primero configura la URL del Web App.');
    return;
  }

  const curlCommand =
    'curl -X PUT \\\n' +
    `  "https://api.mercadolibre.com/applications/${clientId}" \\\n` +
    `  -H "Authorization: Bearer ${accessToken}" \\\n` +
    '  -H "Content-Type: application/json" \\\n' +
    `  -d '{"notification_url": "${webhookUrl}"}'`;

  Logger.log('CURL Command:');
  Logger.log(curlCommand);

  ui.alert('Comando CURL', 'Comando copiado a los logs. Ve a View → Logs para copiarlo.\n\nTambién puedes usar el portal web de ML.', ui.ButtonSet.OK);
}
