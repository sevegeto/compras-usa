/**
 * SISTEMA INTEGRADO DE AUDITORÍA DE INVENTARIO - MERCADO LIBRE
 * Versión: 4.1 FINAL STABLE
 */

const ML_API_BASE = 'https://api.mercadolibre.com';
const MAX_EXECUTION_TIME = 270000;

// ============================================================================
// CONFIG APP - Now loaded from Script Properties for security
// ============================================================================
function getAppConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    APP_ID: props.getProperty('ML_APP_ID') || props.getProperty('ML_CLIENT_ID'),
    SECRET_KEY: props.getProperty('ML_CLIENT_SECRET'),
    REDIRECT_URI: props.getProperty('ml_redirectUri') || 'https://script.google.com/macros/s/AKfycbwGUBTlrlI1KZ6X8j_BB5QlQSy-g4t_qByq3PKBZvrVYSJXS2i6DeUNL_r2wkwuyYKIqg/exec'
  };
}

// ============================================================================
// MENÚ
// ============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('🔧 Mercado Libre');

  // Menú Principal
  menu.addItem('⚙️ Configurar Hojas y Sistema', 'setup')
      .addSeparator()
      .addItem('🔑 AUTORIZAR CONEXIÓN (Botón)', 'showAuthLink')
      .addItem('🔄 Refrescar Token Manualmente', 'forceRefreshToken')
      .addItem('👁️ Ver Credenciales', 'showCurrentCredentials');

  // Submenús de Inventario
  const inventoryMenu = ui.createMenu('📦 Inventario');
  inventoryMenu.addItem('🔄 Auditoría Completa (Scroll API)', 'fullInventoryAudit')
               .addItem('⚖️ Auditoría ML vs UpSeller', 'runSyncAudit')
               .addItem('📥 Descargar Reporte', 'downloadInventoryReport') // placeholder
               .addItem('📊 Resumen de Stock', 'generateStockSummary'); // placeholder

  // Submenús de Webhooks / Notificaciones
  const webhookMenu = ui.createMenu('🔗 Webhooks');
  webhookMenu.addItem('👁️ Ver Cola Pendiente', 'viewNotificationQueue')
             .addItem('⚙️ Procesar Cola AHORA', 'processQueuedNotifications')
             .addItem('📝 Registrar Webhook en ML', 'registerWebhook')
             .addItem('🔧 Reiniciar Trigger de Cola', 'setupNotificationTrigger');

  // Submenús de Mantenimiento / Utilidades
  const maintenanceMenu = ui.createMenu('🛠️ Utilidades');
  maintenanceMenu.addItem('✅ Verificar Estado Conexión', 'verificarEstado')
                 .addItem('✅ Validar Estructura de Hojas', 'validateAllSheets')
                 .addItem('📊 Ver Estadísticas de Cola', 'viewNotificationQueue')
                 .addItem('🛑 Detener Todos los Triggers', 'killAllTriggers')
                 .addItem('🧹 Limpiar Logs', 'clearLogs')
                 .addItem('🧹 Limpiar IDs Procesados', 'clearProcessedIds')
                 .addItem('🛠️ Reconfigurar Sistema', 'reconfigureSystem');

  // Combinar todo en menú principal
  menu.addSubMenu(inventoryMenu)
      .addSubMenu(webhookMenu)
      .addSubMenu(maintenanceMenu)
      .addToUi();
}


// ============================================================================
// AUTH
// ============================================================================
function showAuthLink() {
  const config = getAppConfig();
  const authUrl =
    `https://auth.mercadolibre.com.mx/authorization` +
    `?response_type=code&client_id=${config.APP_ID}&redirect_uri=${config.REDIRECT_URI}`;

  SpreadsheetApp.getUi().alert(
    'Abre este enlace para autorizar Mercado Libre:\n\n' + authUrl
  );
}

function doGet(e) {
  if (e.parameter.code) {
    const ok = exchangeCodeForToken(e.parameter.code);
    return HtmlService.createHtmlOutput(
      ok
        ? '<h2 style="color:green">✅ Autorizado correctamente</h2>'
        : '<h2 style="color:red">❌ Error guardando token</h2>'
    );
  }

  return HtmlService.createHtmlOutput('OAuth endpoint activo.');
}

// ============================================================================
// WEBHOOK - With Idempotency & Queue Management
// ============================================================================
function doPost(e) {
  const response = ContentService.createTextOutput(
    JSON.stringify({ status: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e?.postData?.contents) return response;

    const notification = JSON.parse(e.postData.contents);
    
    // Use NotificationQueue.js for idempotency and size management
    const result = addNotificationToQueue(notification);
    
    if (!result.success) {
      Logger.log(`⚠️ Notification not queued: ${result.message}`);
    }
    
  } catch (err) {
    Logger.log('Webhook error: ' + err);
  }

  return response;
}

// ============================================================================
// TOKENS
// ============================================================================
function exchangeCodeForToken(code) {
  try {
    const config = getAppConfig();
    const res = UrlFetchApp.fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'post',
      payload: {
        grant_type: 'authorization_code',
        client_id: config.APP_ID,
        client_secret: config.SECRET_KEY,
        code,
        redirect_uri: config.REDIRECT_URI
      },
      muteHttpExceptions: true
    });

    const data = JSON.parse(res.getContentText());
    if (!data.access_token) return false;

    saveTokens(data);
    return true;
  } catch (e) {
    Logger.log(e);
    return false;
  }
}

function saveTokens(data) {
  const p = PropertiesService.getScriptProperties();
  p.setProperty('ML_ACCESS_TOKEN', data.access_token);
  p.setProperty('ML_REFRESH_TOKEN', data.refresh_token);
  p.setProperty('SELLER_ID', String(data.user_id));
  
  // Save expiration time with buffer (from tokenz.js logic)
  const expiresIn = data.expires_in || 21600;
  const expirationTime = Date.now() + (expiresIn * 1000);
  p.setProperty('ML_EXPIRES_AT', expirationTime.toString());
}

// ============================================================================
// TOKEN MANAGEMENT - Uses tokenz.js functions (see tokenz.js for implementation)
// ============================================================================
// NOTE: getAccessToken() and refreshAccessToken() are now in tokenz.js
// These functions are kept here for backward compatibility but delegate to tokenz.js

function forceRefreshToken() {
  const ok = refreshAccessToken();
  SpreadsheetApp.getUi().alert(ok ? 'Token renovado' : 'Error renovando token');
}

// ============================================================================
// COLA SEGURA (NO PIERDE EVENTOS)
// ============================================================================
function processQueuedNotifications() {
  // Use NotificationQueue.js for idempotency and proper retry logic
  const stats = processQueueWithIdempotency();
  
  SpreadsheetApp.getUi().alert(
    `Queue Processing Complete:\n` +
    `✅ Processed: ${stats.processed}\n` +
    `❌ Failed: ${stats.failed}\n` +
    `⏭️ Skipped (duplicates): ${stats.skipped}`
  );
  
  return stats;
}

function viewNotificationQueue() {
  const stats = getQueueStats();
  
  SpreadsheetApp.getUi().alert(
    `Notification Queue Status:\n\n` +
    `📊 Pending: ${stats.pending}\n` +
    `✅ Processed: ${stats.processed}\n` +
    `📈 Capacity: ${stats.utilizationPercent}% (${stats.pending}/${stats.maxCapacity})`
  );
}

// ============================================================================
// ROUTER
// ============================================================================
function processNotification(notification, token) {
  const topic = notification.topic;

  if (topic === 'items') {
    const id = notification.resource.split('/').pop();
    processItemDetails([id], token);
  }

  if (topic === 'orders' || topic === 'orders_v2') {
    processOrderNotification(notification, token);
  }
}

// ============================================================================
// INVENTARIO - Using centralized SheetConfig
// ============================================================================
function processItemDetails(ids, token) {
  if (!ids.length) return;

  const url = `${ML_API_BASE}/items?ids=${ids.join(',')}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });

  const data = JSON.parse(res.getContentText());
  const items = data.map(d => d.body || d);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG.SNAPSHOT_INVENTARIO.NAME);
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  const idIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'ID');
  const stockIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'STOCK');
  const updateIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'LAST_UPDATE');
  
  const index = {};
  values.forEach((r, i) => index[r[idIdx]] = i + 1);

  items.forEach(it => {
    const row = index[it.id];
    if (row) {
      sheet.getRange(row, stockIdx + 1).setValue(it.available_quantity);
      sheet.getRange(row, updateIdx + 1).setValue(new Date());
    }
  });
}

// ============================================================================
// ÓRDENES
// ============================================================================
function processOrderNotification(notification, token) {
  const id = notification.resource.split('/').pop();
  const res = UrlFetchApp.fetch(`${ML_API_BASE}/orders/${id}`, {
    headers: { Authorization: 'Bearer ' + token }
  });

  const order = JSON.parse(res.getContentText());
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Pedidos_ML');
  if (!sheet) {
    sheet = ss.insertSheet('Pedidos_ML');
    sheet.appendRow(['Fecha', 'Order ID', 'Estado', 'Total', 'Items']);
  }

  const items = order.order_items.map(i => `${i.item.title} x${i.quantity}`).join(', ');
  sheet.appendRow([new Date(), order.id, order.status, order.total_amount, items]);
}

// ============================================================================
// SETUP
// ============================================================================
function setup() {
  const ss = SpreadsheetApp.getActive();
  ['RAW_Webhook_Log', 'Pedidos_ML', 'Snapshot_Inventario'].forEach(n => {
    if (!ss.getSheetByName(n)) ss.insertSheet(n);
  });

  ScriptApp.newTrigger('processQueuedNotifications')
    .timeBased()
    .everyMinutes(1)
    .create();

  SpreadsheetApp.getUi().alert('Sistema listo.');
}

function verificarEstado() {
  const t = getAccessToken();
  Logger.log(t ? 'Conectado' : 'No conectado');
}

/**
 * Validates all sheet structures match expected configuration
 */
function validateAllSheets() {
  const sheetsToValidate = ['PRODUCTOS', 'SNAPSHOT_INVENTARIO', 'UPSELLER', 'PAUSADAS', 'LOGS'];
  const results = [];
  
  sheetsToValidate.forEach(sheetKey => {
    const config = SHEET_CONFIG[sheetKey];
    if (!config) {
      results.push(`⚠️ ${sheetKey}: No config found`);
      return;
    }
    
    const validation = validateSheetHeaders(config.NAME);
    if (validation.valid) {
      results.push(`✅ ${config.NAME}: Valid`);
    } else {
      results.push(`❌ ${config.NAME}: ERRORS FOUND`);
      validation.errors.forEach(err => results.push(`   - ${err}`));
    }
  });
  
  const ui = SpreadsheetApp.getUi();
  ui.alert('Sheet Structure Validation\n\n' + results.join('\n'));
  
  Logger.log('=== Sheet Validation Results ===');
  results.forEach(r => Logger.log(r));
}
