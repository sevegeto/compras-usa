/**
 * Advanced Features and Utilities
 * Optional enhancements for the Mercado Libre Inventory Audit System
 */

/**
 * Export Log_Movimientos to CSV for external analysis
 * Useful for importing into Excel, Power BI, etc.
 */
function exportLogToCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');
  const data = logSheet.getDataRange().getValues();

  let csv = '';
  data.forEach(row => {
    csv += row.map(cell => {
      // Escape commas and quotes
      if (typeof cell === 'string') {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',') + '\n';
  });

  const fileName = 'Log_Movimientos_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd_HHmmss') + '.csv';
  const blob = Utilities.newBlob(csv, 'text/csv', fileName);

  // Save to Google Drive
  const file = DriveApp.createFile(blob);
  Logger.log('CSV exported to: ' + file.getUrl());

  return file.getUrl();
}

/**
 * Archive old logs (older than X days)
 * Moves old entries to a separate archive sheet to keep main log clean
 */
function archiveOldLogs(daysToKeep = 90) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');

  // Create or get archive sheet
  let archiveSheet = ss.getSheetByName('Log_Movimientos_Archivo');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Log_Movimientos_Archivo');
    // Copy headers
    const headers = logSheet.getRange('A1:H1').getValues();
    archiveSheet.getRange('A1:H1').setValues(headers);
    archiveSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#CCCCCC');
  }

  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const data = logSheet.getDataRange().getValues();

  const toArchive = [];
  const toKeep = [data[0]]; // Keep headers

  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]);
    if (rowDate < cutoffDate) {
      toArchive.push(data[i]);
    } else {
      toKeep.push(data[i]);
    }
  }

  if (toArchive.length > 0) {
    // Append to archive
    const lastArchiveRow = archiveSheet.getLastRow();
    archiveSheet.getRange(lastArchiveRow + 1, 1, toArchive.length, 8).setValues(toArchive);

    // Update main log
    logSheet.clear();
    logSheet.getRange(1, 1, toKeep.length, 8).setValues(toKeep);
    setupLogMovimientos(ss); // Reapply formatting

    Logger.log(`Archived ${toArchive.length} old entries`);
  } else {
    Logger.log('No entries to archive');
  }
}

/**
 * Generate a daily report summary
 * Creates a summary of phantom movements and sends by email
 */
function generateDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');
  const data = logSheet.getDataRange().getValues();

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMovements = data.filter(row => {
    return row[0] && new Date(row[0]) > yesterday;
  });

  const phantomMovements = recentMovements.filter(row => row[6] === 'ERROR_SISTEMA / CAMBIO_EXTERNO');
  const sales = recentMovements.filter(row => row[6] === 'VENTA');
  const stockIncreases = recentMovements.filter(row => row[6] === 'INCREMENTO_STOCK');

  const report = `
📊 REPORTE DIARIO - AUDITORÍA DE INVENTARIO
Fecha: ${Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 RESUMEN DE MOVIMIENTOS (Últimas 24h)

Total de movimientos: ${recentMovements.length}
├─ ✅ Ventas confirmadas: ${sales.length}
├─ ⬆️  Incrementos de stock: ${stockIncreases.length}
└─ ⚠️  Movimientos fantasma: ${phantomMovements.length}

${phantomMovements.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ALERTAS - MOVIMIENTOS FANTASMA

Los siguientes cambios no tienen orden asociada:

${phantomMovements.map((row, idx) => `
${idx + 1}. SKU: ${row[2]}
   Stock: ${row[3]} → ${row[4]} (${row[5] > 0 ? '+' : ''}${row[5]})
   Fecha: ${Utilities.formatDate(new Date(row[0]), 'America/Mexico_City', 'dd/MM/yyyy HH:mm')}
`).join('\n')}

⚠️ ACCIÓN REQUERIDA: Investiga estos movimientos en tu panel de ML
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Ver detalles completos: ${ss.getUrl()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este es un reporte automático generado por el Sistema de Auditoría ML
`.trim();

  Logger.log(report);

  // Optionally send by email
  // MailApp.sendEmail({
  //   to: 'tu-email@ejemplo.com',
  //   subject: `📊 Reporte Diario ML - ${phantomMovements.length} Alertas`,
  //   body: report
  // });

  return report;
}

/**
 * Analyze stock patterns to detect anomalies
 * Identifies items with frequent phantom movements
 */
function analyzeStockPatterns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');
  const data = logSheet.getDataRange().getValues();

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentData = data.filter(row => {
    return row[0] && new Date(row[0]) > last30Days;
  });

  // Count phantom movements per SKU
  const phantomCounts = {};
  recentData.forEach(row => {
    if (row[6] === 'ERROR_SISTEMA / CAMBIO_EXTERNO') {
      const sku = row[2];
      phantomCounts[sku] = (phantomCounts[sku] || 0) + 1;
    }
  });

  // Sort by frequency
  const sorted = Object.entries(phantomCounts).sort((a, b) => b[1] - a[1]);

  const report = `
🔍 ANÁLISIS DE PATRONES - Últimos 30 días

Items con movimientos fantasma frecuentes:

${sorted.slice(0, 10).map(([sku, count], idx) => {
  return `${idx + 1}. SKU: ${sku} - ${count} movimientos fantasma`;
}).join('\n')}

${sorted.length > 10 ? `\n... y ${sorted.length - 10} SKUs más\n` : ''}

💡 Recomendación: Revisa la configuración de estos items en ML
`;

  Logger.log(report);
  return { counts: phantomCounts, sorted, report };
}

/**
 * Verify webhook status in Mercado Libre
 * Checks if your webhook is properly registered
 */
function verifyWebhookStatus() {
  try {
    const accessToken = getAccessToken();
    const props = PropertiesService.getScriptProperties();
    const appId = props.getProperty('ML_APP_ID');

    if (!appId) {
      Logger.log('⚠️ ML_APP_ID not configured. Set it in Script Properties.');
      return null;
    }

    const url = `${ML_API_BASE}/applications/${appId}/notifications`;
    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      Logger.log('❌ Failed to fetch webhook status: ' + statusCode);
      return null;
    }

    const webhooks = JSON.parse(response.getContentText());
    Logger.log('✅ Registered webhooks:');
    Logger.log(JSON.stringify(webhooks, null, 2));

    return webhooks;

  } catch (error) {
    Logger.log('❌ Error verifying webhook: ' + error.toString());
    return null;
  }
}

/**
 * Bulk update stock from a sheet
 * WARNING: Use with caution. Updates stock in ML based on Snapshot sheet
 */
function bulkUpdateStockFromSnapshot() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⚠️ ADVERTENCIA',
    '¿Estás seguro de actualizar el stock en Mercado Libre basándose en Snapshot_Inventario?\n\n' +
    'Esta acción modificará el stock de TODOS los items.',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');
  const data = snapshotSheet.getDataRange().getValues();

  let updated = 0;
  let errors = 0;

  for (let i = 1; i < data.length; i++) {
    const itemId = data[i][0];
    const newStock = parseInt(data[i][3]);

    if (!itemId || isNaN(newStock)) continue;

    try {
      const success = updateItemStock(itemId, newStock);
      if (success) {
        updated++;
      } else {
        errors++;
      }

      // Rate limiting
      if (i % 10 === 0) {
        Utilities.sleep(1000); // 1 second pause every 10 items
      }

    } catch (error) {
      errors++;
      logError('bulkUpdateStock', 0, error.toString(), itemId);
    }
  }

  ui.alert(`✅ Actualización completa\n\n` +
           `Items actualizados: ${updated}\n` +
           `Errores: ${errors}`);
}

/**
 * Update stock for a single item in Mercado Libre
 */
function updateItemStock(itemId, newStock) {
  try {
    const accessToken = getAccessToken();
    const url = `${ML_API_BASE}/items/${itemId}`;

    const payload = {
      available_quantity: parseInt(newStock)
    };

    const options = {
      method: 'put',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      logError('updateItemStock', statusCode, 'Failed to update', itemId);
      return false;
    }

    return true;

  } catch (error) {
    logError('updateItemStock', 0, error.toString(), itemId);
    return false;
  }
}

/**
 * Create a custom menu in Google Sheets
 * Adds easy access to all functions
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🔍 Auditoría ML')
    .addItem('🔄 Sincronizar Inventario', 'fullInventoryAudit')
    .addSeparator()
    .addItem('📊 Generar Reporte Diario', 'generateDailyReport')
    .addItem('📈 Analizar Patrones', 'analyzeStockPatterns')
    .addSeparator()
    .addItem('💾 Exportar Log a CSV', 'exportLogToCSV')
    .addItem('🗄️ Archivar Logs Antiguos', 'promptArchiveLogs')
    .addSeparator()
    .addItem('✅ Verificar Estado Webhook', 'verifyWebhookStatus')
    .addItem('🔧 Configuración Inicial', 'setup')
    .addToUi();
}

/**
 * Prompt for archive days
 */
function promptArchiveLogs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🗄️ Archivar Logs Antiguos',
    '¿Cuántos días deseas mantener en el log principal?\n(Los demás se moverán al archivo)',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const days = parseInt(response.getResponseText());
    if (!isNaN(days) && days > 0) {
      archiveOldLogs(days);
      ui.alert(`✅ Logs archivados. Manteniendo últimos ${days} días.`);
    } else {
      ui.alert('❌ Valor inválido');
    }
  }
}

/**
 * Get statistics for Dashboard
 */
function updateDashboardStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  const logSheet = ss.getSheetByName('Log_Movimientos');

  const logData = logSheet.getDataRange().getValues();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentAlerts = logData.filter(row => {
    return row[0] && new Date(row[0]) > last24h && row[6] === 'ERROR_SISTEMA / CAMBIO_EXTERNO';
  }).length;

  dashboard.getRange('B6').setValue(recentAlerts);
}

/**
 * Schedule automatic daily report
 * Run this once to create a trigger
 */
function scheduleAutomaticReports() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendDailyReportEmail') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger at 8 AM
  ScriptApp.newTrigger('sendDailyReportEmail')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  Logger.log('✅ Daily report scheduled for 8 AM');
}

/**
 * Send daily report via email
 */
function sendDailyReportEmail() {
  const report = generateDailyReport();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get email from script properties or use default
  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('REPORT_EMAIL') || Session.getActiveUser().getEmail();

  const logSheet = ss.getSheetByName('Log_Movimientos');
  const data = logSheet.getDataRange().getValues();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const phantomCount = data.filter(row =>
    row[0] && new Date(row[0]) > yesterday && row[6] === 'ERROR_SISTEMA / CAMBIO_EXTERNO'
  ).length;

  MailApp.sendEmail({
    to: email,
    subject: `📊 Reporte Diario ML ${phantomCount > 0 ? '⚠️ ' + phantomCount + ' Alertas' : '✅'}`,
    body: report + '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔗 Ver hoja completa: ' + ss.getUrl()
  });
}
