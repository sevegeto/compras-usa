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
                 .addItem('🛑 Detener Todos los Triggers', 'killAllTriggers')
                 .addItem('🧹 Limpiar Logs', 'clearLogs') // placeholder
                 .addItem('🛠️ Reconfigurar Sistema', 'reconfigureSystem'); // placeholder

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
  const authUrl =
    `https://auth.mercadolibre.com.mx/authorization` +
    `?response_type=code&client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}`;

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
// WEBHOOK
// ============================================================================
function doPost(e) {
  const response = ContentService.createTextOutput(
    JSON.stringify({ status: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e?.postData?.contents) return response;

    const notification = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const key = 'PENDING_NOTIFICATIONS';
    const queue = JSON.parse(props.getProperty(key) || '[]');

    queue.push({
      notification,
      received: new Date().toISOString()
    });

    props.setProperty(key, JSON.stringify(queue));
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
  const props = PropertiesService.getScriptProperties();
  const key = 'PENDING_NOTIFICATIONS';
  const queue = JSON.parse(props.getProperty(key) || '[]');
  if (!queue.length) return;

  let token = getAccessToken();
  if (!token) token = refreshAccessToken();
  if (!token) return;

  const remaining = [];

  queue.forEach(item => {
    try {
      processNotification(item.notification, token);
    } catch (e) {
      Logger.log('Error procesando notificación, se reencola: ' + e);
      remaining.push(item);
    }
  });

  props.setProperty(key, JSON.stringify(remaining));
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
// INVENTARIO
// ============================================================================
function processItemDetails(ids, token) {
  if (!ids.length) return;

  const url = `${ML_API_BASE}/items?ids=${ids.join(',')}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });

  const data = JSON.parse(res.getContentText());
  const items = data.map(d => d.body || d);

  const sheet = SpreadsheetApp.getActive().getSheetByName('Snapshot_Inventario');
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  const index = {};
  values.forEach((r, i) => index[r[0]] = i + 1);

  items.forEach(it => {
    const row = index[it.id];
    if (row) {
      sheet.getRange(row, 4).setValue(it.available_quantity);
      sheet.getRange(row, 5).setValue(new Date());
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
