function registerWebhook() {
  const ui = SpreadsheetApp.getUi();
  
  // 1. Pedir URL al usuario
  const response = ui.prompt(
    'Configurar Webhook', 
    'Pega aquí la URL de tu Web App (https://script.google.com/.../exec):', 
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const webhookUrl = response.getResponseText().trim();
  if (!webhookUrl) {
    ui.alert('❌ URL inválida');
    return;
  }

  // 2. Obtener Token y App ID
  const accessToken = getAccessToken();
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('ML_APP_ID'); // Asegúrate de tener esto configurado
  
  if (!appId) {
    ui.alert('❌ Error: ML_APP_ID no está configurado en Script Properties.');
    return;
  }

  // 3. Registrar en MercadoLibre
  const url = `https://api.mercadolibre.com/applications/${appId}/notifications`;
  
  Logger.log(`🔍 Intentando registrar Webhook...`);
  Logger.log(`🆔 App ID: ${appId}`);
  Logger.log(`🔗 Target URL: ${webhookUrl}`);
  Logger.log(`🔑 Token (primeros 10 chars): ${accessToken.substring(0, 10)}...`);

  const payload = {
    url: webhookUrl,
    topic: 'items'
  };

  try {
    const apiResponse = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { 
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (apiResponse.getResponseCode() === 200 || apiResponse.getResponseCode() === 201) {
      ui.alert('✅ Webhook registrado exitosamente en MercadoLibre.');
      Logger.log('Webhook Response: ' + apiResponse.getContentText());
    } else {
      ui.alert('❌ Error al registrar: ' + apiResponse.getContentText());
    }
  } catch (e) {
    ui.alert('❌ Excepción: ' + e.toString());
  }
}
