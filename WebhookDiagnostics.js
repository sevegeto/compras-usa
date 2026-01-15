/**
 * WEBHOOK DIAGNOSTICS
 * Complete diagnostic tool to troubleshoot webhook notification issues
 */

function diagnoseWebhookIssues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  let report = '🔍 DIAGNÓSTICO DE WEBHOOK - REPORTE COMPLETO\n\n';
  let issues = [];
  let warnings = [];

  // ============================================================
  // 1. CHECK WEB APP DEPLOYMENT
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '1️⃣ ESTADO DEL WEB APP\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const webAppUrl = getWebAppUrl();
  if (!webAppUrl) {
    issues.push('❌ Web App NO DESPLEGADO');
    report += '❌ Web App: NO DESPLEGADO\n';
    report += '   ACCIÓN REQUERIDA:\n';
    report += '   1. Ve a Apps Script Editor\n';
    report += '   2. Deploy → New deployment\n';
    report += '   3. Type: Web app\n';
    report += '   4. Execute as: Me\n';
    report += '   5. Who has access: Anyone\n';
    report += '   6. Deploy y copia la URL\n\n';
  } else {
    report += '✅ Web App: DESPLEGADO\n';
    report += '   URL: ' + webAppUrl + '\n\n';
  }

  // ============================================================
  // 2. CHECK SCRIPT PROPERTIES
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '2️⃣ CREDENCIALES Y CONFIGURACIÓN\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const accessToken = props.getProperty('ML_ACCESS_TOKEN');
  const refreshToken = props.getProperty('ML_REFRESH_TOKEN');
  const clientId = props.getProperty('ML_CLIENT_ID');
  const clientSecret = props.getProperty('ML_CLIENT_SECRET');
  const sellerId = props.getProperty('SELLER_ID');
  const webhookSecret = props.getProperty('WEBHOOK_SECRET');

  if (!accessToken) {
    issues.push('❌ ML_ACCESS_TOKEN faltante');
    report += '❌ Access Token: NO CONFIGURADO\n';
  } else {
    report += '✅ Access Token: Configurado\n';
    // Test if token is valid
    try {
      const testUrl = 'https://api.mercadolibre.com/users/me';
      const response = UrlFetchApp.fetch(testUrl, {
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() === 200) {
        report += '   ✅ Token VÁLIDO\n';
      } else if (response.getResponseCode() === 401) {
        issues.push('⚠️ Access Token EXPIRADO');
        report += '   ⚠️ Token EXPIRADO - requiere refresh\n';
      } else {
        warnings.push('⚠️ Token status desconocido');
        report += '   ⚠️ Status: ' + response.getResponseCode() + '\n';
      }
    } catch (e) {
      warnings.push('⚠️ No se pudo validar token');
      report += '   ⚠️ Error validando token: ' + e.toString() + '\n';
    }
  }

  if (!refreshToken) {
    warnings.push('⚠️ ML_REFRESH_TOKEN faltante');
    report += '⚠️ Refresh Token: NO CONFIGURADO\n';
  } else {
    report += '✅ Refresh Token: Configurado\n';
  }

  if (!clientId) {
    warnings.push('⚠️ ML_CLIENT_ID faltante');
    report += '⚠️ Client ID: NO CONFIGURADO\n';
  } else {
    report += '✅ Client ID: Configurado\n';
  }

  if (!clientSecret) {
    warnings.push('⚠️ ML_CLIENT_SECRET faltante');
    report += '⚠️ Client Secret: NO CONFIGURADO\n';
  } else {
    report += '✅ Client Secret: Configurado\n';
  }

  if (!sellerId) {
    warnings.push('⚠️ SELLER_ID faltante');
    report += '⚠️ Seller ID: NO CONFIGURADO\n';
  } else {
    report += '✅ Seller ID: ' + sellerId + '\n';
  }

  if (!webhookSecret) {
    report += '⚠️ Webhook Secret: NO CONFIGURADO (opcional)\n';
  } else {
    report += '✅ Webhook Secret: Configurado\n';
  }

  report += '\n';

  // ============================================================
  // 3. CHECK WEBHOOK REGISTRATION
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '3️⃣ REGISTRO DE WEBHOOK EN MERCADO LIBRE\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  if (accessToken && clientId) {
    try {
      const appId = clientId; // In ML, client_id is the app_id
      const webhooksUrl = `https://api.mercadolibre.com/applications/${appId}`;
      const response = UrlFetchApp.fetch(webhooksUrl, {
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        const appData = JSON.parse(response.getContentText());

        if (appData.notification_url) {
          report += '✅ Webhook URL Registrada:\n';
          report += '   ' + appData.notification_url + '\n';

          // Check if it matches current web app URL
          if (webAppUrl && appData.notification_url !== webAppUrl) {
            warnings.push('⚠️ URL registrada no coincide con Web App actual');
            report += '   ⚠️ NO COINCIDE con Web App actual\n';
            report += '   Web App actual: ' + webAppUrl + '\n';
          } else if (webAppUrl) {
            report += '   ✅ Coincide con Web App actual\n';
          }

          // Check subscribed topics
          if (appData.topics) {
            report += '\n   📋 Tópicos Suscritos:\n';
            appData.topics.forEach(topic => {
              report += '   • ' + topic + '\n';
            });

            if (appData.topics.indexOf('items') === -1) {
              warnings.push('⚠️ No suscrito a "items"');
              report += '   ⚠️ NO está suscrito a "items"\n';
            }
          } else {
            warnings.push('⚠️ Sin tópicos suscritos');
            report += '   ⚠️ Sin tópicos configurados\n';
          }
        } else {
          issues.push('❌ Webhook NO registrado en ML');
          report += '❌ NO HAY WEBHOOK REGISTRADO en Mercado Libre\n';
          report += '   ACCIÓN: Usar "🔗 Webhooks → 📝 Registrar Webhook en ML"\n';
        }
      } else {
        issues.push('❌ No se pudo verificar webhook');
        report += '❌ Error verificando webhook: ' + response.getResponseCode() + '\n';
        report += '   ' + response.getContentText() + '\n';
      }
    } catch (e) {
      issues.push('❌ Error consultando ML API');
      report += '❌ Error: ' + e.toString() + '\n';
    }
  } else {
    issues.push('❌ No se puede verificar webhook sin credenciales');
    report += '❌ No se puede verificar (falta access token o client ID)\n';
  }

  report += '\n';

  // ============================================================
  // 4. CHECK TRIGGERS
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '4️⃣ TRIGGERS DE PROCESAMIENTO\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const triggers = ScriptApp.getProjectTriggers();
  const queueTrigger = triggers.find(t => t.getHandlerFunction() === 'processQueuedNotifications');

  if (queueTrigger) {
    report += '✅ Trigger de Cola: ACTIVO\n';
    report += '   Función: processQueuedNotifications\n';
    report += '   Tipo: ' + queueTrigger.getEventType() + '\n';
  } else {
    issues.push('❌ Trigger de cola NO configurado');
    report += '❌ Trigger de Cola: NO CONFIGURADO\n';
    report += '   ACCIÓN: Ejecutar setup() o usar "🔗 Webhooks → 🔧 Configurar Trigger de Cola"\n';
  }

  report += '\n   📋 Todos los Triggers Activos:\n';
  if (triggers.length === 0) {
    report += '   (ninguno)\n';
  } else {
    triggers.forEach(trigger => {
      report += '   • ' + trigger.getHandlerFunction() + ' (' + trigger.getEventType() + ')\n';
    });
  }

  report += '\n';

  // ============================================================
  // 5. CHECK SHEETS
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '5️⃣ HOJAS Y LOGS\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const requiredSheets = [
    'RAW_Webhook_Log',
    'Log_Movimientos',
    'Snapshot_Inventario',
    'Dashboard',
    'Errores_API'
  ];

  requiredSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const rowCount = sheet.getLastRow();
      report += '✅ ' + sheetName + ': Existe (' + rowCount + ' filas)\n';

      if (sheetName === 'RAW_Webhook_Log' && rowCount <= 1) {
        warnings.push('⚠️ RAW_Webhook_Log vacío - no se han recibido webhooks');
      }
    } else {
      issues.push('❌ Hoja faltante: ' + sheetName);
      report += '❌ ' + sheetName + ': NO EXISTE\n';
    }
  });

  report += '\n';

  // ============================================================
  // 6. CHECK QUEUE
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '6️⃣ COLA DE NOTIFICACIONES\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const pendingQueue = props.getProperty('PENDING_NOTIFICATIONS') || '[]';
  const pending = JSON.parse(pendingQueue);

  report += 'Notificaciones en Cola: ' + pending.length + '\n';
  if (pending.length > 0) {
    report += '\n   📋 Pendientes:\n';
    pending.slice(0, 5).forEach((item, index) => {
      report += '   ' + (index + 1) + '. ' + item.notification.topic + ' - ' + item.notification.resource + '\n';
    });
    if (pending.length > 5) {
      report += '   ... y ' + (pending.length - 5) + ' más\n';
    }
  }

  report += '\n';

  // ============================================================
  // 7. SUMMARY
  // ============================================================
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '📊 RESUMEN\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  if (issues.length === 0 && warnings.length === 0) {
    report += '✅ TODO CONFIGURADO CORRECTAMENTE\n\n';
    report += '💡 Si aún no recibes notificaciones:\n';
    report += '   1. Haz un cambio en un producto en ML\n';
    report += '   2. Espera 1-2 minutos\n';
    report += '   3. Revisa RAW_Webhook_Log\n';
  } else {
    report += '🔴 PROBLEMAS CRÍTICOS (' + issues.length + '):\n';
    issues.forEach(issue => {
      report += '   ' + issue + '\n';
    });

    report += '\n🟡 ADVERTENCIAS (' + warnings.length + '):\n';
    warnings.forEach(warning => {
      report += '   ' + warning + '\n';
    });
  }

  report += '\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += 'Generado: ' + new Date().toLocaleString('es-MX') + '\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  // Log to console
  Logger.log(report);

  // Show in UI
  ui.alert('🔍 Diagnóstico de Webhook', report, ui.ButtonSet.OK);

  // Write to sheet for reference
  const diagSheet = ss.getSheetByName('Diagnostico_Webhook') || ss.insertSheet('Diagnostico_Webhook');
  diagSheet.clear();
  diagSheet.getRange('A1').setValue('DIAGNÓSTICO DE WEBHOOK');
  diagSheet.getRange('A2').setValue(new Date());
  diagSheet.getRange('A3').setValue(report);
  diagSheet.getRange('A1:A3').setWrap(true);
  diagSheet.setColumnWidth(1, 800);

  return report;
}

/**
 * Get current web app URL (if deployed)
 */
function getWebAppUrl() {
  const props = PropertiesService.getScriptProperties();
  let url = props.getProperty('WEB_APP_URL');

  if (!url) {
    // Try to get from script
    try {
      url = ScriptApp.getService().getUrl();
      if (url) {
        props.setProperty('WEB_APP_URL', url);
      }
    } catch (e) {
      // Not deployed
      return null;
    }
  }

  return url;
}

/**
 * Set web app URL manually
 */
function setWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Configurar URL del Web App',
    'Pega la URL de tu Web App desplegado:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const url = response.getResponseText().trim();
    if (url.startsWith('https://')) {
      PropertiesService.getScriptProperties().setProperty('WEB_APP_URL', url);
      ui.alert('✅ URL guardada: ' + url);
    } else {
      ui.alert('❌ URL inválida. Debe comenzar con https://');
    }
  }
}

/**
 * Test webhook endpoint with a manual POST
 */
function testWebhookEndpoint() {
  const ui = SpreadsheetApp.getUi();
  const webAppUrl = getWebAppUrl();

  if (!webAppUrl) {
    ui.alert('❌ Error', 'Web App no está desplegado. Deploy primero.', ui.ButtonSet.OK);
    return;
  }

  // Try to send a test POST
  ui.alert(
    '🧪 Test de Endpoint',
    'URL del Webhook:\n' + webAppUrl + '\n\n' +
    'Para testear desde fuera:\n' +
    '1. Usa Postman o curl\n' +
    '2. Método: POST\n' +
    '3. Body (JSON):\n' +
    '{\n' +
    '  "topic": "items",\n' +
    '  "resource": "/items/MLM123456",\n' +
    '  "user_id": 123456,\n' +
    '  "application_id": 123456\n' +
    '}',
    ui.ButtonSet.OK
  );
}

/**
 * Quick fix - Run all setup steps
 */
function quickFixWebhook() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    '🔧 Quick Fix',
    '¿Ejecutar configuración automática de webhook?\n\n' +
    'Esto hará:\n' +
    '1. Verificar/crear hojas\n' +
    '2. Configurar trigger de cola\n' +
    '3. Verificar credenciales\n\n' +
    'NOTA: Necesitas haber desplegado el Web App primero.',
    ui.ButtonSet.OK_CANCEL
  );

  if (result === ui.Button.OK) {
    try {
      // Run setup
      setup();
      ui.alert('✅ Setup completado. Ahora ejecuta el diagnóstico nuevamente.');
    } catch (e) {
      ui.alert('❌ Error: ' + e.toString());
    }
  }
}
