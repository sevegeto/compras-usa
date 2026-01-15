/**
 * SALES VELOCITY & REPLENISHMENT SYSTEM
 * Analyzes Mercado Libre sales history to forecast demand and suggest purchasing orders.
 */

const ANALYSIS_PERIOD_DAYS = 30; // Look back at last 30 days of sales
const DESIRED_COVERAGE_DAYS = 45; // We want enough stock for 45 days

function generateSalesVelocityReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log_Movimientos');
  const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');
  
  if (!logSheet || !snapshotSheet) {
    SpreadsheetApp.getUi().alert('❌ Faltan hojas requeridas (Log_Movimientos o Snapshot_Inventario).');
    return;
  }

  Logger.log('📉 Calculating Sales Velocity...');

  // 1. Get Sales Data (From Log_Movimientos)
  const logData = logSheet.getDataRange().getValues();
  const salesMap = new Map(); // SKU -> Total Sold
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ANALYSIS_PERIOD_DAYS);

  // Skip headers
  for (let i = 1; i < logData.length; i++) {
    const row = logData[i];
    const timestamp = new Date(row[0]);
    const sku = String(row[2]).trim();
    const difference = parseInt(row[5]) || 0;
    const reason = row[6]; // Motivo

    // Only count confirmed sales within period
    if (timestamp >= cutoffDate && reason === 'VENTA' && difference < 0) {
      const soldQty = Math.abs(difference);
      salesMap.set(sku, (salesMap.get(sku) || 0) + soldQty);
    }
  }

  // 2. Get Current Stock (From Snapshot)
  const snapshotData = snapshotSheet.getDataRange().getValues();
  const stockMap = new Map(); // SKU -> {Title, Stock}

  for (let i = 1; i < snapshotData.length; i++) {
    const row = snapshotData[i];
    const sku = String(row[1]).trim();
    const title = row[2];
    const stock = parseInt(row[3]) || 0;
    
    if (sku) {
      stockMap.set(sku, { title, stock });
    }
  }

  // 3. Build Report Data
  const reportData = [];
  
  salesMap.forEach((totalSold, sku) => {
    const itemInfo = stockMap.get(sku) || { title: 'Unknown Item', stock: 0 };
    
    // Calculations
    const dailyVelocity = totalSold / ANALYSIS_PERIOD_DAYS;
    const weeklyVelocity = dailyVelocity * 7;
    const monthlyVelocity = dailyVelocity * 30;
    
    // Forecasting
    const requiredStock = Math.ceil(dailyVelocity * DESIRED_COVERAGE_DAYS);
    const suggestion = Math.max(0, requiredStock - itemInfo.stock);
    
    // Status
    let status = '🟢 OK';
    if (itemInfo.stock === 0) status = '🔴 AGOTADO';
    else if (itemInfo.stock < (weeklyVelocity * 1)) status = '🟠 CRÍTICO (<1 sem)';
    else if (itemInfo.stock < (weeklyVelocity * 2)) status = '🟡 BAJO (<2 sem)';

    if (suggestion > 0) {
      reportData.push([
        sku,
        itemInfo.title,
        itemInfo.stock,
        totalSold,
        weeklyVelocity.toFixed(1),
        monthlyVelocity.toFixed(1),
        DESIRED_COVERAGE_DAYS + ' días',
        suggestion, // Suggestion to buy
        status
      ]);
    }
  });

  // Sort by Suggestions (High to Low)
  reportData.sort((a, b) => b[7] - a[7]);

  // 4. Output to Sheet
  let reportSheet = ss.getSheetByName('Reporte_Reabastecimiento');
  if (!reportSheet) {
    reportSheet = ss.insertSheet('Reporte_Reabastecimiento');
  } else {
    reportSheet.clear();
  }

  // Headers
  const headers = [
    ['REPORTE DE PREDICCIÓN DE VENTAS Y REABASTECIMIENTO', '', '', '', '', '', '', '', ''],
    ['Periodo Análisis:', `${ANALYSIS_PERIOD_DAYS} días`, 'Cobertura Deseada:', `${DESIRED_COVERAGE_DAYS} días`, 'Fecha:', new Date(), '', '', ''],
    ['SKU', 'Producto', 'Stock Actual', 'Ventas (Periodo)', 'Ventas/Semana', 'Ventas/Mes', 'Meta Cobertura', 'SUGERENCIA COMPRA', 'Estado']
  ];

  reportSheet.getRange(1, 1, 3, 9).setValues(headers);
  
  // Format Headers
  reportSheet.getRange('A1:I1').merge().setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#4a86e8').setFontColor('white');
  reportSheet.getRange('A2:I2').setFontWeight('bold').setBackground('#c9daf8');
  reportSheet.getRange('A3:I3').setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');

  // Write Data
  if (reportData.length > 0) {
    reportSheet.getRange(4, 1, reportData.length, 9).setValues(reportData);
    
    // Conditional Formatting for Status
    const statusRange = reportSheet.getRange(4, 9, reportData.length, 1);
    
    // Rules
    const rules = reportSheet.getConditionalFormatRules();
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('AGOTADO')
      .setBackground('#ea9999') // Red
      .setRanges([statusRange])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('CRÍTICO')
      .setBackground('#f9cb9c') // Orange
      .setRanges([statusRange])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('BAJO')
      .setBackground('#ffe599') // Yellow
      .setRanges([statusRange])
      .build());
      
    reportSheet.setConditionalFormatRules(rules);
  } else {
    reportSheet.getRange(4, 1).setValue('No hay suficientes datos de venta para generar sugerencias.');
  }

  // Auto-resize
  reportSheet.autoResizeColumns(1, 9);
  reportSheet.setColumnWidth(2, 300); // Title column wider

  Logger.log(`✅ Sales Report Generated with ${reportData.length} suggestions.`);
  SpreadsheetApp.getUi().alert(`✅ Reporte Generado.

Se encontraron ${reportData.length} productos que requieren reabastecimiento.`);
}
