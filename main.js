/**
 * Mercado Libre Inventory Audit System
 * Detects phantom stock movements and logs all inventory changes
 *
 * @author Expert Full-Stack Developer
 * @version 1.0
 */

const ML_API_BASE = 'https://api.mercadolibre.com';
const SITE_ID = 'MLM'; // Mexico
const BATCH_SIZE = 20;
const MAX_EXECUTION_TIME = 270000; // 4.5 minutes (留余量)

/**
 * Setup function to initialize the spreadsheet structure
 * Run this once to create all necessary sheets and headers
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('America/Mexico_City');

  // Clear existing sheets and create new ones
  const existingSheets = ss.getSheets();
  const sheetNames = ['Dashboard', 'Snapshot_Inventario', 'Log_Movimientos', 'Errores_API'];

  // Create sheets if they don't exist
  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });

  // Setup Dashboard
  setupDashboard(ss);

  // Setup Snapshot_Inventario
  setupSnapshotInventario(ss);

  // Setup Log_Movimientos
  setupLogMovimientos(ss);

  // Setup Errores_API
  setupErroresAPI(ss);

  Logger.log('✓ Configuración completada. Sistema listo para usar.');
  SpreadsheetApp.getUi().alert('✓ Sistema configurado correctamente.\n\nPuede comenzar a usar el sistema.');
}

/**
 * Setup Dashboard sheet with summary and controls
 */
function setupDashboard(ss) {
  const sheet = ss.getSheetByName('Dashboard');
  sheet.clear();

  // Headers and styling
  sheet.getRange('A1').setValue('📊 DASHBOARD - AUDITORÍA DE INVENTARIO').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A3').setValue('Estado del Sistema:').setFontWeight('bold');
  sheet.getRange('B3').setValue('Operativo').setFontColor('#00FF00');

  sheet.getRange('A4').setValue('Última Sincronización:').setFontWeight('bold');
  sheet.getRange('B4').setValue('N/A');

  sheet.getRange('A5').setValue('Total Items Monitoreados:').setFontWeight('bold');
  sheet.getRange('B5').setValue(0);

  sheet.getRange('A6').setValue('Alertas Últimas 24h:').setFontWeight('bold');
  sheet.getRange('B6').setValue(0);

  // Manual sync button instruction
  sheet.getRange('A8').setValue('🔄 Sincronización Manual').setFontSize(12).setFontWeight('bold');
  sheet.getRange('A9').setValue('Para sincronizar todo el inventario, ejecute: fullInventoryAudit()');
  sheet.getRange('A10').setValue('Desde el menú: Extensiones > Apps Script > Ejecutar función');

  // Recent alerts
  sheet.getRange('A12').setValue('⚠️ ALERTAS RECIENTES (Últimas 10)').setFontSize(12).setFontWeight('bold');
  sheet.getRange('A13:F13').setValues([['Fecha/Hora', 'SKU', 'Stock Anterior', 'Stock Nuevo', 'Diferencia', 'Motivo']]);
  sheet.getRange('A13:F13').setFontWeight('bold').setBackground('#E8EAED');

  // Formatting
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 150);
  sheet.setFrozenRows(13);
}

/**
 * Setup Snapshot_Inventario sheet
 */
function setupSnapshotInventario(ss) {
  const sheet = ss.getSheetByName('Snapshot_Inventario');
  sheet.clear();

  const headers = ['ID_Item', 'SKU', 'Titulo', 'Stock_Actual', 'Ultima_Sincronizacion'];
  sheet.getRange('A1:E1').setValues([headers]);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 180);
}

/**
 * Setup Log_Movimientos sheet
 */
function setupLogMovimientos(ss) {
  const sheet = ss.getSheetByName('Log_Movimientos');
  sheet.clear();

  const headers = ['Fecha_Hora', 'ID_Item', 'SKU', 'Stock_Anterior', 'Stock_Nuevo', 'Diferencia', 'Motivo', 'Estado_Orden'];
  sheet.getRange('A1:H1').setValues([headers]);
  sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#34A853').setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 150);
}

/**
 * Setup Errores_API sheet
 */
function setupErroresAPI(ss) {
  const sheet = ss.getSheetByName('Errores_API');
  sheet.clear();

  const headers = ['Fecha_Hora', 'Endpoint', 'Codigo_Error', 'Mensaje', 'Detalles'];
  sheet.getRange('A1:E1').setValues([headers]);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#EA4335').setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 300);
}

/**
 * Webhook listener for Mercado Libre notifications
 * Deployed as a web app to receive POST requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid payload'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const notification = JSON.parse(e.postData.contents);

    // Log notification for debugging
    Logger.log('Notification received: ' + JSON.stringify(notification));

    // Filter for items topic only
    if (notification.topic === 'items') {
      const itemId = notification.resource.split('/').pop();
      processItemChange(itemId);
    }

    return ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logError('doPost', 0, error.toString(), JSON.stringify(e));
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Process individual item change from webhook notification
 */
function processItemChange(itemId) {
  try {
    const itemData = getItemData(itemId);
    if (!itemData) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');

    const currentStock = parseInt(itemData.available_quantity) || 0;
    const sku = itemData.seller_custom_field || itemId;
    const title = itemData.title || 'Sin título';

    // Find existing snapshot
    const data = snapshotSheet.getDataRange().getValues();
    let foundRow = -1;
    let oldStock = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == itemId) {
        foundRow = i + 1;
        oldStock = parseInt(data[i][3]) || 0;
        break;
      }
    }

    // Update or insert snapshot
    const timestamp = new Date();
    if (foundRow > 0) {
      snapshotSheet.getRange(foundRow, 4, 1, 2).setValues([[currentStock, timestamp]]);
    } else {
      snapshotSheet.appendRow([itemId, sku, title, currentStock, timestamp]);
    }

    // Check for stock discrepancy
    if (foundRow > 0 && oldStock !== currentStock) {
      const difference = currentStock - oldStock;
      auditStockChange(itemId, sku, oldStock, currentStock, difference);
    }

  } catch (error) {
    logError('processItemChange', 0, error.toString(), itemId);
  }
}

/**
 * Audit a detected stock change
 */
function auditStockChange(itemId, sku, oldStock, newStock, difference) {
  let motivo = 'CAMBIO_DETECTADO';
  let estadoOrden = 'N/A';

  // If stock decreased, check for orders
  if (difference < 0) {
    const orderInfo = checkRecentOrders(itemId);
    if (orderInfo.found) {
      motivo = 'VENTA';
      estadoOrden = orderInfo.status;
    } else {
      motivo = 'ERROR_SISTEMA / CAMBIO_EXTERNO';
      estadoOrden = 'SIN_ORDEN';
    }
  } else if (difference > 0) {
    motivo = 'INCREMENTO_STOCK';
  }

  // Log the movement
  logMovement(itemId, sku, oldStock, newStock, difference, motivo, estadoOrden);

  // Update dashboard if it's an error
  if (motivo === 'ERROR_SISTEMA / CAMBIO_EXTERNO') {
    updateDashboardAlert(sku, oldStock, newStock, difference, motivo);
  }
}

/**
 * Check for recent orders containing the item
 */
function checkRecentOrders(itemId) {
  try {
    const accessToken = getAccessToken();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Search for recent orders
    const url = `${ML_API_BASE}/orders/search?seller=${getSellerId()}&order.date_created.from=${fifteenMinutesAgo}`;
    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('checkRecentOrders', statusCode, 'Failed to fetch orders', url);
      return { found: false };
    }

    const ordersData = JSON.parse(response.getContentText());

    // Check each order for the item
    if (ordersData.results && ordersData.results.length > 0) {
      for (const order of ordersData.results) {
        if (order.order_items) {
          for (const orderItem of order.order_items) {
            if (orderItem.item && orderItem.item.id == itemId) {
              return { found: true, status: order.status };
            }
          }
        }
      }
    }

    return { found: false };

  } catch (error) {
    logError('checkRecentOrders', 0, error.toString(), itemId);
    return { found: false };
  }
}

/**
 * Get seller ID from user info
 */
function getSellerId() {
  const props = PropertiesService.getScriptProperties();
  let sellerId = props.getProperty('SELLER_ID');

  if (!sellerId) {
    try {
      const accessToken = getAccessToken();
      const url = `${ML_API_BASE}/users/me`;
      const options = {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const userData = JSON.parse(response.getContentText());
        sellerId = userData.id;
        props.setProperty('SELLER_ID', sellerId);
      }
    } catch (error) {
      logError('getSellerId', 0, error.toString(), '');
    }
  }

  return sellerId;
}

/**
 * Full inventory audit - optimized for 5000 items
 */
function fullInventoryAudit() {
  const startTime = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();

  try {
    // Get all active listings
    let offset = parseInt(props.getProperty('AUDIT_OFFSET') || '0');
    const allItems = getAllUserItems(offset);

    if (!allItems || allItems.length === 0) {
      // Audit complete
      props.deleteProperty('AUDIT_OFFSET');
      updateDashboardStatus('Sincronización completa');
      Logger.log('Auditoría completada.');
      return;
    }

    // Process items in batches
    const itemIds = allItems.map(item => item.id);
    processBatchedItems(itemIds);

    // Check execution time
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME || allItems.length < 50) {
      // Time limit reached or last batch, reset offset
      props.deleteProperty('AUDIT_OFFSET');
      updateDashboardStatus('Sincronización completa');
    } else {
      // Save progress and schedule next run
      props.setProperty('AUDIT_OFFSET', (offset + 50).toString());

      // Create a time-based trigger for continuation
      ScriptApp.newTrigger('fullInventoryAudit')
        .timeBased()
        .after(1000) // 1 second
        .create();
    }

  } catch (error) {
    logError('fullInventoryAudit', 0, error.toString(), '');
    props.deleteProperty('AUDIT_OFFSET');
  }
}

/**
 * Get all user items with pagination
 */
function getAllUserItems(offset = 0) {
  try {
    const accessToken = getAccessToken();
    const sellerId = getSellerId();

    const url = `${ML_API_BASE}/users/${sellerId}/items/search?status=active&offset=${offset}&limit=50`;
    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('getAllUserItems', statusCode, 'Failed to fetch items', url);
      return [];
    }

    const data = JSON.parse(response.getContentText());
    return data.results || [];

  } catch (error) {
    logError('getAllUserItems', 0, error.toString(), offset.toString());
    return [];
  }
}

/**
 * Process items in batches using multiget
 */
function processBatchedItems(itemIds) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');

  // Get current snapshot data for comparison
  const snapshotData = snapshotSheet.getDataRange().getValues();
  const snapshotMap = new Map();

  for (let i = 1; i < snapshotData.length; i++) {
    snapshotMap.set(snapshotData[i][0], {
      row: i + 1,
      stock: parseInt(snapshotData[i][3]) || 0
    });
  }

  // Process in batches of 20
  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE);
    const items = getItemsMultiget(batch);

    if (!items) continue;

    // Process each item
    const timestamp = new Date();
    items.forEach(itemData => {
      if (!itemData || itemData.error) return;

      const itemId = itemData.id;
      const currentStock = parseInt(itemData.available_quantity) || 0;
      const sku = itemData.seller_custom_field || itemId;
      const title = itemData.title || 'Sin título';

      // Check if item exists in snapshot
      if (snapshotMap.has(itemId)) {
        const snapshot = snapshotMap.get(itemId);
        const oldStock = snapshot.stock;

        // Update snapshot
        snapshotSheet.getRange(snapshot.row, 4, 1, 2).setValues([[currentStock, timestamp]]);

        // Check for discrepancy
        if (oldStock !== currentStock) {
          const difference = currentStock - oldStock;
          auditStockChange(itemId, sku, oldStock, currentStock, difference);
        }
      } else {
        // New item, add to snapshot
        snapshotSheet.appendRow([itemId, sku, title, currentStock, timestamp]);
      }
    });
  }
}

/**
 * Get multiple items using multiget endpoint
 */
function getItemsMultiget(itemIds) {
  try {
    const accessToken = getAccessToken();
    const ids = itemIds.join(',');
    const url = `${ML_API_BASE}/items?ids=${ids}&attributes=id,title,available_quantity,seller_custom_field`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('getItemsMultiget', statusCode, 'Multiget failed', url);
      return null;
    }

    const results = JSON.parse(response.getContentText());
    return results.map(result => result.body);

  } catch (error) {
    logError('getItemsMultiget', 0, error.toString(), itemIds.join(','));
    return null;
  }
}

/**
 * Get single item data
 */
function getItemData(itemId) {
  try {
    const accessToken = getAccessToken();
    const url = `${ML_API_BASE}/items/${itemId}`;

    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('getItemData', statusCode, 'Failed to fetch item', itemId);
      return null;
    }

    return JSON.parse(response.getContentText());

  } catch (error) {
    logError('getItemData', 0, error.toString(), itemId);
    return null;
  }
}

/**
 * Log a stock movement
 */
function logMovement(itemId, sku, oldStock, newStock, difference, motivo, estadoOrden) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');

  const timestamp = new Date();
  logSheet.appendRow([timestamp, itemId, sku, oldStock, newStock, difference, motivo, estadoOrden]);
}

/**
 * Log an API error
 */
function logError(endpoint, statusCode, message, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const errorSheet = ss.getSheetByName('Errores_API');

    const timestamp = new Date();
    errorSheet.appendRow([timestamp, endpoint, statusCode, message, details]);
  } catch (e) {
    Logger.log('Failed to log error: ' + e.toString());
  }
}

/**
 * Update dashboard with recent alert
 */
function updateDashboardAlert(sku, oldStock, newStock, difference, motivo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');

  const timestamp = new Date();
  dashboard.insertRowAfter(13);
  dashboard.getRange(14, 1, 1, 6).setValues([[timestamp, sku, oldStock, newStock, difference, motivo]]);

  // Keep only last 10 alerts
  const lastRow = dashboard.getLastRow();
  if (lastRow > 23) {
    dashboard.deleteRows(24, lastRow - 23);
  }

  // Update alert count
  const alertCount = parseInt(dashboard.getRange('B6').getValue() || 0) + 1;
  dashboard.getRange('B6').setValue(alertCount);
}

/**
 * Update dashboard status
 */
function updateDashboardStatus(status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');

  dashboard.getRange('B3').setValue(status);
  dashboard.getRange('B4').setValue(new Date());
  dashboard.getRange('B5').setValue(snapshotSheet.getLastRow() - 1);
}

/**
 * Manual trigger to reset 24h alert counter
 */
function resetDailyAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  dashboard.getRange('B6').setValue(0);
}
