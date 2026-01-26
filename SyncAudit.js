/**
 * ML VS UPSELLER SYNC AUDIT
 * Compares real-time ML stock with manual UpSeller records to find discrepancies.
 * Uses centralized SheetConfig.js for column consistency
 */

function runSyncAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mlSheet = ss.getSheetByName(SHEET_CONFIG.SNAPSHOT_INVENTARIO.NAME);
  const upSheet = ss.getSheetByName(SHEET_CONFIG.UPSELLER.NAME);
  
  if (!mlSheet || !upSheet) {
    Logger.log('❌ Error: Missing ML or UpSeller sheets.');
    return;
  }

  const mlData = mlSheet.getDataRange().getValues();
  const upData = upSheet.getDataRange().getValues();

  // Use centralized column indices
  const mlSkuIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'SKU');
  const mlStockIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'STOCK');
  const mlTituloIdx = getColumnIndex('SNAPSHOT_INVENTARIO', 'TITULO');
  
  const upSkuIdx = getColumnIndex('UPSELLER', 'SKU');
  const upActiveIdx = getColumnIndex('UPSELLER', 'ACTIVA');

  // Map UpSeller Stock by SKU
  const upMap = new Map();
  for (let i = 1; i < upData.length; i++) {
    const sku = String(upData[i][upSkuIdx]).trim();
    if (sku) {
      upMap.set(sku, upData[i][upActiveIdx]);
    }
  }

  // Compare with ML
  const discrepancies = [];
  for (let i = 1; i < mlData.length; i++) {
    const sku = String(mlData[i][mlSkuIdx]).trim();
    const mlStock = parseInt(mlData[i][mlStockIdx]) || 0;
    const title = mlData[i][mlTituloIdx];
    
    const upActive = upMap.get(sku);
    
    let needsUpdate = false;
    let reason = '';

    if (mlStock > 0 && (upActive === 'N' || !upActive)) {
      needsUpdate = true;
      reason = 'ML tiene stock pero UpSeller está Inactivo';
    } else if (mlStock === 0 && upActive === 'Y') {
      needsUpdate = true;
      reason = 'ML agotado pero UpSeller sigue Activo';
    }

    if (needsUpdate) {
      discrepancies.push([sku, title, mlStock, upActive || 'N/A', reason, new Date()]);
    }
  }

  // Write to a new Report Sheet
  let reportSheet = ss.getSheetByName('Audit_Sync_UpSeller');
  if (!reportSheet) reportSheet = ss.insertSheet('Audit_Sync_UpSeller');
  reportSheet.clear();
  
  reportSheet.getRange(1, 1, 1, 6).setValues([['SKU', 'Producto', 'Stock Real (ML)', 'Estado UpSeller', 'Acción Sugerida', 'Detectado']])
    .setFontWeight('bold').setBackground('#fff2cc');
  
  if (discrepancies.length > 0) {
    reportSheet.getRange(2, 1, discrepancies.length, 6).setValues(discrepancies);
    reportSheet.autoResizeColumns(1, 6);
    Logger.log(`✅ Se encontraron ${discrepancies.length} desincronizaciones.`);
  } else {
    reportSheet.getRange(2, 1).setValue('✅ Todo sincronizado. UpSeller y ML coinciden.');
  }
}
