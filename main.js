/**
 * SISTEMA INTEGRADO DE AUDITORÍA DE INVENTARIO - MERCADO LIBRE
 * Versión: 3.2 PRO (Queue Processing + Security + Scroll API + Multi-Notification Support)
 */

const ML_API_BASE = 'https://api.mercadolibre.com';
const MAX_EXECUTION_TIME = 270000; // 4.5 minutos

// =========================================================================
// 1. CONFIGURACIÓN E INTERFAZ
// =========================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔧 Mercado Libre')
    .addItem('⚙️ Configurar Hojas', 'setup')
    .addSeparator()
    .addItem('🔄 Auditoría Completa (6k+)', 'fullInventoryAudit')
    .addItem('🔑 Refrescar Token Manual', 'forceRefreshToken')
    .addSeparator()
    .addItem('🛑 DETENER TODO', 'killAllTriggers')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('America/Mexico_City');

  // Create all necessary sheets
  const sheetNames = [
    'Dashboard',
    'Snapshot_Inventario',
    'Log_Movimientos',
    'Errores_API',
    'RAW_Webhook_Log',
    'Pedidos_ML',
    'Preguntas_ML',
    'Pagos_ML',
    'Mensajes_ML',
    'Envios_ML',
    'Notificaciones_Raw'
  ];

  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });

  // Setup all sheets
  setupDashboard(ss);
  setupSnapshotInventario(ss);
  setupLogMovimientos(ss);
  setupErroresAPI(ss);
  setupRawWebhookLog(ss);

  // Setup notification trigger
  setupNotificationTrigger();

  Logger.log('✓ Configuración completada. Sistema listo para usar.');
  SpreadsheetApp.getUi().alert('✓ Sistema configurado correctamente.\n\nPuede comenzar a usar el sistema.');
}

// =========================================================================
// 2. WEBHOOK CON SEGURIDAD HMAC-SHA256 Y QUEUE PROCESSING
// =========================================================================

/**
 * Webhook listener for Mercado Libre notifications
 * Deployed as a web app to receive POST requests
 * CRITICAL: Must return HTTP 200 within 500ms
 */
function doPost(e) {
  // Immediately return HTTP 200 - DO NOT PROCESS HERE
  const response = ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return response; // Still return 200 even for invalid payload
    }

    const contents = e.postData.contents;
    const notification = JSON.parse(contents);
    const signature = e.parameter['x-signature'] || '';

    // Validación de Firma (Opcional si configuras el Secret)
    const isValid = verifyWebhookSignature(signature, contents);

    // Log Crudo
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rawLog = ss.getSheetByName('RAW_Webhook_Log');
    const timestamp = new Date();
    if (rawLog) {
      rawLog.appendRow([timestamp, notification.topic, notification.resource, notification.user_id, isValid ? '✅ VALIDO' : '⚠️ SIN FIRMA', contents]);
    }

    // Process asynchronously using queue
    const props = PropertiesService.getScriptProperties();
    const pendingKey = 'PENDING_NOTIFICATIONS';
    const pending = JSON.parse(props.getProperty(pendingKey) || '[]');
    pending.push({
      notification: notification,
      received: new Date().toISOString(),
      signatureValid: isValid
    });
    props.setProperty(pendingKey, JSON.stringify(pending));

    // Log for debugging
    Logger.log('Notification queued: ' + JSON.stringify(notification));

  } catch (error) {
    // Log error but still return HTTP 200
    Logger.log('Error queuing notification: ' + error.toString());
  }

  return response; // Always return HTTP 200 within 500ms
}

function verifyWebhookSignature(receivedSignature, payload) {
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret) return true; // Si no hay secreto configurado, asumimos válido (modo transición)

  const hmac = Utilities.computeHmacSha256Signature(payload, secret);
  const expected = Utilities.base64Encode(hmac);

  // MercadoLibre a veces envía sha256=... o solo el hash
  const cleanSignature = receivedSignature.replace('sha256=', '').trim();
  return cleanSignature === expected.trim();
}

/**
 * Process queued notifications (run via time-based trigger every 1-5 minutes)
 * This function processes all pending notifications from the queue
 */
function processQueuedNotifications() {
  const props = PropertiesService.getScriptProperties();
  const pendingKey = 'PENDING_NOTIFICATIONS';
  const pending = JSON.parse(props.getProperty(pendingKey) || '[]');

  if (pending.length === 0) {
    Logger.log('No pending notifications to process');
    return;
  }

  Logger.log(`Processing ${pending.length} notifications`);

  // Cache access token to reduce redundant calls
  let accessToken;
  try {
    accessToken = getAccessToken();
  } catch (error) {
    logError('processQueuedNotifications', 0, 'Failed to get access token', error.toString());
    return;
  }

  pending.forEach(item => {
    try {
      const notification = item.notification;
      processNotification(notification, accessToken);
    } catch (error) {
      logError('processQueuedNotifications', 0, error.toString(), JSON.stringify(item));
    }
  });

  // Clear processed notifications
  props.setProperty(pendingKey, '[]');
  Logger.log('All notifications processed');
}

/**
 * Process individual notification based on topic
 */
function processNotification(notification, accessToken) {
  const topic = notification.topic;
  const resource = notification.resource;
  const userId = notification.user_id;

  Logger.log(`Processing ${topic} notification: ${resource}`);

  // Route to appropriate handler based on topic
  switch(topic) {
    case 'items':
      processItemNotification(notification, accessToken);
      break;
    case 'orders_v2':
    case 'orders':
      processOrderNotification(notification, accessToken);
      break;
    case 'questions':
      processQuestionNotification(notification, accessToken);
      break;
    case 'payments':
      processPaymentNotification(notification, accessToken);
      break;
    case 'messages':
      processMessageNotification(notification, accessToken);
      break;
    case 'shipments':
      processShipmentNotification(notification, accessToken);
      break;
    default:
      Logger.log(`Unhandled topic: ${topic}`);
      logNotificationToSheet(notification);
  }
}

/**
 * Process item notification
 */
function processItemNotification(notification, accessToken) {
  const itemId = notification.resource.split('/').pop();
  processItemDetails([itemId]);
}

/**
 * Process order notification - Log to Google Sheets
 */
function processOrderNotification(notification, accessToken) {
  try {
    const orderId = notification.resource.split('/').pop();
    const url = `${ML_API_BASE}/orders/${orderId}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('processOrderNotification', statusCode, 'Failed to fetch order', orderId);
      return;
    }

    const order = JSON.parse(response.getContentText());
    logOrderToSheet(order);

  } catch (error) {
    logError('processOrderNotification', 0, error.toString(), notification.resource);
  }
}

/**
 * Process question notification - Log to Google Sheets
 */
function processQuestionNotification(notification, accessToken) {
  try {
    const questionId = notification.resource.split('/').pop();
    const url = `${ML_API_BASE}/questions/${questionId}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('processQuestionNotification', statusCode, 'Failed to fetch question', questionId);
      return;
    }

    const question = JSON.parse(response.getContentText());
    logQuestionToSheet(question);

  } catch (error) {
    logError('processQuestionNotification', 0, error.toString(), notification.resource);
  }
}

/**
 * Process payment notification - Log to Google Sheets
 */
function processPaymentNotification(notification, accessToken) {
  try {
    const url = `${ML_API_BASE}${notification.resource}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('processPaymentNotification', statusCode, 'Failed to fetch payment', notification.resource);
      return;
    }

    const payment = JSON.parse(response.getContentText());
    logPaymentToSheet(payment);

  } catch (error) {
    logError('processPaymentNotification', 0, error.toString(), notification.resource);
  }
}

/**
 * Process message notification - Log to Google Sheets
 */
function processMessageNotification(notification, accessToken) {
  try {
    const messageId = notification.resource; // Already in format 'message_{id}'
    const url = `${ML_API_BASE}/messages/${messageId}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('processMessageNotification', statusCode, 'Failed to fetch message', messageId);
      return;
    }

    const message = JSON.parse(response.getContentText());
    logMessageToSheet(message);

  } catch (error) {
    logError('processMessageNotification', 0, error.toString(), notification.resource);
  }
}

/**
 * Process shipment notification - Log to Google Sheets
 */
function processShipmentNotification(notification, accessToken) {
  try {
    const shipmentId = notification.resource.split('/').pop();
    const url = `${ML_API_BASE}/shipments/${shipmentId}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('processShipmentNotification', statusCode, 'Failed to fetch shipment', shipmentId);
      return;
    }

    const shipment = JSON.parse(response.getContentText());
    logShipmentToSheet(shipment);

  } catch (error) {
    logError('processShipmentNotification', 0, error.toString(), notification.resource);
  }
}

// =========================================================================
// 3. PROCESAMIENTO MASIVO (SCROLL API)
// =========================================================================

function fullInventoryAudit() {
  const props = PropertiesService.getScriptProperties();
  const scrollId = props.getProperty('SCROLL_ID');

  // Limpieza preventiva de triggers propios
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (t.getHandlerFunction() === 'fullInventoryAudit') ScriptApp.deleteTrigger(t); });

  fetchAndProcessBatch(scrollId || null);
}

function fetchAndProcessBatch(currentScrollId) {
  const startTime = Date.now();
  const props = PropertiesService.getScriptProperties();
  const accessToken = getAccessToken();
  const sellerId = getSellerId();

  let url = `${ML_API_BASE}/users/${sellerId}/items/search?search_type=scan&limit=100&orders=available_quantity_asc`;
  if (currentScrollId) url += `&scroll_id=${currentScrollId}`;

  try {
    const response = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken }, muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const itemIds = data.results || [];

      // Guardar estado INMEDIATAMENTE
      if (data.scroll_id) props.setProperty('SCROLL_ID', data.scroll_id);

      Logger.log(`📦 Scroll API: ${itemIds.length} items.`);

      if (itemIds.length > 0) {
        processItemDetails(itemIds);
      }

      // Dashboard Visual
      updateDashboardStatus(`Sincronizando... (+${itemIds.length})`);

      // Continuación o Finalización
      if (itemIds.length === 0) {
        props.deleteProperty('SCROLL_ID');
        updateDashboardStatus('✅ Sincronización Completa');
        Logger.log('✅ Auditoría Finalizada.');
      } else {
        const elapsed = Date.now() - startTime;
        if (elapsed < MAX_EXECUTION_TIME) {
          fetchAndProcessBatch(data.scroll_id); // Recursión rápida
        } else {
          ScriptApp.newTrigger('fullInventoryAudit').timeBased().after(1000).create(); // Trigger seguridad
        }
      }
    } else {
      Logger.log('❌ Error API: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('❌ Excepción Fatal: ' + e.toString());
  }
}

// =========================================================================
// 4. DETALLES DE PRODUCTO (OPTIMIZADO POR LOTES)
// =========================================================================

function processItemDetails(itemIds) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Snapshot_Inventario');
  const snapshotData = sheet.getDataRange().getValues();

  // Mapeo rápido
  const map = new Map();
  for (let i = 1; i < snapshotData.length; i++) {
    map.set(snapshotData[i][0], { row: i + 1, stock: parseInt(snapshotData[i][3]) || 0 });
  }

  // Procesar en chunks de 20 (Límite Multiget)
  const CHUNK_SIZE = 20;
  for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
    const chunk = itemIds.slice(i, i + CHUNK_SIZE);
    const items = getItemsMultiget(chunk);

    if (!items) continue;

    const rowsToAdd = [];
    const timestamp = new Date();

    items.forEach(item => {
      if (!item || !item.id) return;

      const id = item.id;
      const stock = parseInt(item.available_quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const title = item.title || 'Sin Título';

      // Lógica robusta de SKU/GTIN
      let sku = item.seller_custom_field;
      let gtin = '';

      if (!sku || sku === id) {
        sku = (item.attributes?.find(a => a.id === 'SELLER_SKU')?.value_name) || id;
      }
      gtin = (item.attributes?.find(a => a.id === 'GTIN' || a.id === 'EAN')?.value_name) || '';

      // Días de Elaboración
      let days = '0';
      if (item.sale_terms) {
        const term = item.sale_terms.find(t => t.id === 'MANUFACTURING_TIME');
        if (term) days = term.value_name || (term.value_struct?.number + ' días') || '0';
      }

      if (map.has(id)) {
        // Update (Optimizado: solo celdas necesarias)
        const existing = map.get(id);
        sheet.getRange(existing.row, 2).setValue(sku);
        sheet.getRange(existing.row, 4).setValue(stock);
        sheet.getRange(existing.row, 5).setValue(timestamp);
        sheet.getRange(existing.row, 6).setValue(price);
        sheet.getRange(existing.row, 7).setValue(String(gtin));
        sheet.getRange(existing.row, 8).setValue(days);

        if (existing.stock !== stock) {
          logMovement(id, sku, existing.stock, stock, stock - existing.stock, 'CAMBIO_DETECTADO', 'AUTO');
        }
      } else {
        // Insert (En bloque es más rápido)
        rowsToAdd.push([id, sku, title, stock, timestamp, price, String(gtin), days]);
      }
    });

    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
      SpreadsheetApp.flush(); // Guardar cambios inmediatamente
    }
  }
}

// =========================================================================
// 5. TOKENS Y AUXILIARES
// =========================================================================

function getAccessToken() {
  return PropertiesService.getScriptProperties().getProperty('ML_ACCESS_TOKEN');
}

function forceRefreshToken() {
  refreshAccessToken(); // De tokenz.js
  SpreadsheetApp.getUi().alert('Token refrescado manualmente.');
}

function getItemsMultiget(itemIds) {
  try {
    const token = getAccessToken();
    const url = `${ML_API_BASE}/items?ids=${itemIds.join(',')}&attributes=id,title,available_quantity,price,seller_custom_field,attributes,sale_terms`;
    const res = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + token }, muteHttpExceptions: true });
    return res.getResponseCode() === 200 ? JSON.parse(res.getContentText()).map(r => r.body || r) : null;
  } catch (e) { return null; }
}

function getSellerId() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('SELLER_ID');
  if (!id) { id = '95918601'; p.setProperty('SELLER_ID', id); }
  return id;
}

// =========================================================================
// 6. SETUP DE HOJAS
// =========================================================================

function setupSnapshotInventario(ss) {
  const sheet = ss.getSheetByName('Snapshot_Inventario');
  sheet.clear();
  const headers = ['ID_Item', 'SKU', 'Titulo', 'Stock_Actual', 'Ultima_Sincronizacion', 'Precio_ML', 'GTIN', 'Dias_Elaboracion'];
  sheet.getRange('A1:H1').setValues([headers]).setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  sheet.getRange('G:G').setNumberFormat('@'); // Texto plano para GTIN
  sheet.getRange('F:F').setNumberFormat('$#,##0.00'); // Moneda
  sheet.setFrozenRows(1);
}

function setupDashboard(ss) {
  const s = ss.getSheetByName('Dashboard');
  s.clear();
  s.getRange('A1').setValue('📊 DASHBOARD AUDITORÍA').setFontSize(14).setFontWeight('bold');
  s.getRange('A3').setValue('Estado:'); s.getRange('B3').setValue('OK');
  s.getRange('A4').setValue('Última Sinc:');
  s.getRange('A5').setValue('Total Items:'); s.getRange('B5').setValue(0);
  s.getRange('C5').setFormula('=SPARKLINE(B5, {"charttype","bar";"max",6400;"color1","#4285F4"})');
  s.getRange('A7').setValue('Riesgo (0 días):').setFontColor('red');
}

function setupLogMovimientos(ss) {
  const s = ss.getSheetByName('Log_Movimientos');
  s.clear();
  s.getRange('A1:H1').setValues([['Fecha', 'ID', 'SKU', 'Stock_Old', 'Stock_New', 'Diff', 'Motivo', 'Detalle']]).setFontWeight('bold');
  s.setFrozenRows(1);
}

function setupRawWebhookLog(ss) {
  const s = ss.getSheetByName('RAW_Webhook_Log');
  s.clear();
  s.getRange('A1:F1').setValues([['Fecha', 'Topic', 'Resource', 'User', 'Status', 'Payload']]).setFontWeight('bold');
}

function setupErroresAPI(ss) {
  const s = ss.getSheetByName('Errores_API');
  s.clear();
  s.getRange('A1:E1').setValues([['Fecha', 'Funcion', 'Codigo', 'Mensaje', 'Detalle']]).setFontWeight('bold');
  s.setFrozenRows(1);
}

function updateDashboardStatus(status) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
  if (s) {
    s.getRange('B3').setValue(status);
    s.getRange('B4').setValue(new Date());
  }
}

function logMovement(id, sku, oldS, newS, diff, reason, status) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log_Movimientos');
  if (s) {
    s.appendRow([new Date(), id, sku, oldS, newS, diff, reason, status]);
  }
}

function logError(func, code, msg, details) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Errores_API');
  if (s) {
    s.appendRow([new Date(), func, code, msg, details]);
  }
}

// =========================================================================
// 7. LOGGING FUNCTIONS FOR DIFFERENT NOTIFICATION TYPES
// =========================================================================

function logOrderToSheet(order) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ordersSheet = ss.getSheetByName('Pedidos_ML');

  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('Pedidos_ML');
    const headers = ['Fecha_Hora', 'Order_ID', 'Status', 'Buyer_Name', 'Buyer_Email', 'Items', 'Total', 'Currency', 'Payment_Status', 'Shipping_Status'];
    ordersSheet.getRange('A1:J1').setValues([headers]);
    ordersSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  }

  const timestamp = new Date();
  const items = order.order_items.map(item => `${item.item.title} (${item.quantity})`).join(', ');
  const buyerName = order.buyer.nickname || 'N/A';
  const buyerEmail = order.buyer.email || 'N/A';

  ordersSheet.appendRow([
    timestamp,
    order.id,
    order.status,
    buyerName,
    buyerEmail,
    items,
    order.total_amount,
    order.currency_id,
    order.payments?.[0]?.status || 'N/A',
    order.shipping?.status || 'N/A'
  ]);
}

function logQuestionToSheet(question) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let questionsSheet = ss.getSheetByName('Preguntas_ML');

  if (!questionsSheet) {
    questionsSheet = ss.insertSheet('Preguntas_ML');
    const headers = ['Fecha_Hora', 'Question_ID', 'Item_ID', 'Status', 'Question_Text', 'Answer_Text', 'From_User'];
    questionsSheet.getRange('A1:G1').setValues([headers]);
    questionsSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#FBBC04').setFontColor('#000000');
  }

  const timestamp = new Date(question.date_created);
  const answerText = question.answer ? question.answer.text : 'Sin responder';

  questionsSheet.appendRow([
    timestamp,
    question.id,
    question.item_id,
    question.status,
    question.text,
    answerText,
    question.from.id
  ]);
}

function logPaymentToSheet(payment) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let paymentsSheet = ss.getSheetByName('Pagos_ML');

  if (!paymentsSheet) {
    paymentsSheet = ss.insertSheet('Pagos_ML');
    const headers = ['Fecha_Hora', 'Payment_ID', 'Order_ID', 'Status', 'Amount', 'Currency', 'Payment_Method', 'Payer_Email'];
    paymentsSheet.getRange('A1:H1').setValues([headers]);
    paymentsSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#34A853').setFontColor('#FFFFFF');
  }

  const timestamp = new Date(payment.date_created || new Date());

  paymentsSheet.appendRow([
    timestamp,
    payment.id,
    payment.order_id || 'N/A',
    payment.status,
    payment.transaction_amount,
    payment.currency_id,
    payment.payment_method_id,
    payment.payer ? payment.payer.email : 'N/A'
  ]);
}

function logMessageToSheet(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let messagesSheet = ss.getSheetByName('Mensajes_ML');

  if (!messagesSheet) {
    messagesSheet = ss.insertSheet('Mensajes_ML');
    const headers = ['Fecha_Hora', 'Message_ID', 'From', 'To', 'Subject', 'Text', 'Status'];
    messagesSheet.getRange('A1:G1').setValues([headers]);
    messagesSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#EA4335').setFontColor('#FFFFFF');
  }

  const timestamp = new Date(message.date_created || new Date());

  messagesSheet.appendRow([
    timestamp,
    message.id,
    message.from ? message.from.user_id : 'N/A',
    message.to ? message.to.user_id : 'N/A',
    message.subject || 'N/A',
    message.text || 'N/A',
    message.status
  ]);
}

function logShipmentToSheet(shipment) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shipmentsSheet = ss.getSheetByName('Envios_ML');

  if (!shipmentsSheet) {
    shipmentsSheet = ss.insertSheet('Envios_ML');
    const headers = ['Fecha_Hora', 'Shipment_ID', 'Order_ID', 'Status', 'Tracking_Number', 'Carrier', 'Estimated_Delivery'];
    shipmentsSheet.getRange('A1:G1').setValues([headers]);
    shipmentsSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#9C27B0').setFontColor('#FFFFFF');
  }

  const timestamp = new Date();

  shipmentsSheet.appendRow([
    timestamp,
    shipment.id,
    shipment.order_id || 'N/A',
    shipment.status,
    shipment.tracking_number || 'N/A',
    shipment.logistic_type || 'N/A',
    shipment.estimated_delivery_time?.date ? new Date(shipment.estimated_delivery_time.date) : 'N/A'
  ]);
}

function logNotificationToSheet(notification) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let notificationsSheet = ss.getSheetByName('Notificaciones_Raw');

  if (!notificationsSheet) {
    notificationsSheet = ss.insertSheet('Notificaciones_Raw');
    const headers = ['Fecha_Hora', 'Topic', 'Resource', 'User_ID', 'Application_ID', 'Full_JSON'];
    notificationsSheet.getRange('A1:F1').setValues([headers]);
    notificationsSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#607D8B').setFontColor('#FFFFFF');
  }

  const timestamp = new Date();

  notificationsSheet.appendRow([
    timestamp,
    notification.topic || 'N/A',
    notification.resource || 'N/A',
    notification.user_id || 'N/A',
    notification.application_id || 'N/A',
    JSON.stringify(notification)
  ]);
}

// =========================================================================
// 8. TRIGGER SETUP
// =========================================================================

function setupNotificationTrigger() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processQueuedNotifications') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger - runs every 1 minute
  ScriptApp.newTrigger('processQueuedNotifications')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('Notification processing trigger created successfully');
}

function killAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log('All triggers deleted');
  SpreadsheetApp.getUi().alert('✓ Todos los triggers han sido eliminados.');
}
