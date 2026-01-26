/**
 * ML VS UPSELLER SYNC AUDIT
 * Compares real-time ML stock with manual UpSeller records to find discrepancies.
 * Uses centralized SheetConfig.js for column consistency and atomic batch writes
 */

function runSyncAudit() {
  const functionName = 'runSyncAudit';
  startExecutionTimer();
  
  try {
    logInfo(functionName, 'Starting sync audit');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mlSheet = safeGetSheet(SHEET_CONFIG.SNAPSHOT_INVENTARIO.NAME);
    const upSheet = safeGetSheet(SHEET_CONFIG.UPSELLER.NAME);
    
    if (!mlSheet) {
      throw new Error('Snapshot_Inventario sheet not found');
    }
    
    if (!upSheet) {
      throw new Error('UpSeller sheet not found');
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
      checkTimeout(functionName); // Check timeout periodically
      
      const sku = String(upData[i][upSkuIdx]).trim();
      if (sku) {
        upMap.set(sku, upData[i][upActiveIdx]);
      }
    }

    // Compare with ML
    const discrepancies = [];
    for (let i = 1; i < mlData.length; i++) {
      if (i % 100 === 0) {
        checkTimeout(functionName); // Check every 100 rows
      }
      
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

    // Atomic write to Report Sheet
    let reportSheet = safeGetSheet('Audit_Sync_UpSeller', true);
    if (!reportSheet) {
      throw new Error('Failed to create Audit_Sync_UpSeller sheet');
    }
    
    reportSheet.clear();
    
    // Prepare all data for single write operation
    const allData = [
      ['SKU', 'Producto', 'Stock Real (ML)', 'Estado UpSeller', 'Acción Sugerida', 'Detectado']
    ];
    
    if (discrepancies.length > 0) {
      allData.push(...discrepancies);
    } else {
      allData.push(['', '✅ Todo sincronizado. UpSeller y ML coinciden.', '', '', '', '']);
    }
    
    // Atomic batch write
    const success = safeWriteToSheet('Audit_Sync_UpSeller', 1, 1, allData);
    
    if (success) {
      // Format headers
      reportSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#fff2cc');
      reportSheet.autoResizeColumns(1, 6);
      
      logInfo(functionName, `Audit complete: ${discrepancies.length} discrepancies found`);
      Logger.log(`✅ Se encontraron ${discrepancies.length} desincronizaciones.`);
    } else {
      throw new Error('Failed to write audit results');
    }
    
  } catch (error) {
    logError(functionName, 'Sync audit failed', error);
    throw error;
  }
}
