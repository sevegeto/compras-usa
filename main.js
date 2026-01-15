/**
 * SISTEMA INTEGRADO DE AUDITORÍA DE INVENTARIO - MERCADO LIBRE
 * Versión: 3.1 PRO (Seguridad Webhook + GTIN + Motor de Alta Velocidad)
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

  const sheets = ['Dashboard', 'Snapshot_Inventario', 'Log_Movimientos', 'Errores_API', 'RAW_Webhook_Log'];
  sheets.forEach(name => { if (!ss.getSheetByName(name)) ss.insertSheet(name); });

  setupSnapshotInventario(ss);
  setupDashboard(ss);
  setupLogMovimientos(ss);
  setupRawWebhookLog(ss);

  SpreadsheetApp.getUi().alert('✓ Sistema configurado.');
}

// =========================================================================
// 2. WEBHOOK CON SEGURIDAD HMAC-SHA256
// =========================================================================

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawLog = ss.getSheetByName('RAW_Webhook_Log');
  const timestamp = new Date();

  try {
    const contents = e.postData.contents;
    const notification = JSON.parse(contents);
    const signature = e.parameter['x-signature'] || '';

    // Validación de Firma (Opcional si configuras el Secret)
    const isValid = verifyWebhookSignature(signature, contents);

    // Log Crudo
    if (rawLog) {
      rawLog.appendRow([timestamp, notification.topic, notification.resource, notification.user_id, isValid ? '✅ VALIDO' : '⚠️ SIN FIRMA', contents]);
    }

    // Auto-Refresh Token si es necesario
    try { refreshAccessToken(); } catch (t) { }

    // Procesar Items
    if (notification.topic === 'items') {
      const resource = notification.resource;
      if (resource) {
        const itemId = resource.split('/').pop();
        processItemDetails([itemId]);
      }
    }

    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('ERROR');
  }
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
        if (typeof processItemDetails === 'function') {
          processItemDetails(itemIds);
        } else {
          Logger.log('❌ CRITICAL REF ERROR: processItemDetails no está definida en fetchAndProcessBatch');
        }
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
        const range = sheet.getRange(existing.row, 2, 1, 7); // De Col B a H
        // SKU, Title(no), Stock, Date, Price, GTIN, Days
        // B, C, D, E, F, G, H
        // Values: [sku, (skip title), stock, time, price, gtin, days]
        // Mejor usamos setValues directo a columnas específicas para no borrar titulo si es manual

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
// 5. TOKENS Y AUXILIARES (IMPLEMENTACIÓN COMPLETA)
// =========================================================================

function getAccessToken() {
  // Usa la lógica robusta de tokenz.js, aquí solo puenteamos o leemos directo
  // Lo ideal es llamar a la función de tokenz.js si está en el mismo proyecto
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

// Funciones de Setup completas (Rescatadas de versiones anteriores)
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

function updateDashboardStatus(status) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
  s.getRange('B3').setValue(status);
  s.getRange('B4').setValue(new Date());
}

function setupErroresAPI(ss) {
  const s = ss.getSheetByName('Errores_API');
  s.clear();
  s.appendRow(['Fecha', 'Funcion', 'Codigo', 'Mensaje', 'Detalle']);
}

function logMovement(id, sku, oldS, newS, diff, reason, status) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log_Movimientos')
    .appendRow([new Date(), id, sku, oldS, newS, diff, reason, status]);
}

function logError(func, code, msg, details) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Errores_API')
    .appendRow([new Date(), func, code, msg, details]);
}