/**
 * ML VS UPSELLER SYNC AUDIT
 * Compares real-time ML stock with manual UpSeller records to find discrepancies.
 */

function runSyncAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mlSheet = ss.getSheetByName('Snapshot_Inventario');
  const upSheet = ss.getSheetByName('UpSeller');
  
  if (!mlSheet || !upSheet) {
    Logger.log('❌ Error: Missing ML or UpSeller sheets.');
    return;
  }

  const mlData = mlSheet.getDataRange().getValues();
  const upData = upSheet.getDataRange().getValues();

  // 1. Map UpSeller Stock by SKU
  // SKU index based on your UpSeller sample is 0
  // 'Está activa en venta' (Stock Flag) is index 17
  const upMap = new Map();
  const upHeaders = upData[0];
  const idxUpSku = upHeaders.indexOf('SKU');
  const idxUpActive = upHeaders.indexOf('Está activa en venta');

  for (let i = 1; i < upData.length; i++) {
    const sku = String(upData[i][idxUpSku]).trim();
    if (sku) {
      upMap.set(sku, upData[i][idxUpActive]);
    }
  }

  // 2. Compare with ML
  const discrepancies = [];
  for (let i = 1; i < mlData.length; i++) {
    const sku = String(mlData[i][1]).trim(); // Col B
    const mlStock = parseInt(mlData[i][3]) || 0; // Col D
    const title = mlData[i][2]; // Col C
    
    const upActive = upMap.get(sku);
    
    // Logic: If ML has stock > 0 but UpSeller says inactive ('N' or empty)
    // Or if ML has stock 0 but UpSeller says active ('Y')
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

  // 3. Write to a new Report Sheet
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
