/**
 * FINANCIAL ANALYTICS MODULE
 * Calculates inventory value and potential profit based on Snapshot and Cost data.
 */

function updateFinancials() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snapshotSheet = ss.getSheetByName('Snapshot_Inventario');
  const costSheet = ss.getSheetByName('Compras'); // Assuming this is where your cost data is
  const dashboard = ss.getSheetByName('Dashboard');

  if (!snapshotSheet || !costSheet) {
    Logger.log('❌ Missing required sheets for financials.');
    return;
  }

  Logger.log('💰 Calculating Financials...');

  // 1. Load Data
  const snapshotData = snapshotSheet.getDataRange().getValues();
  const costData = costSheet.getDataRange().getValues();

  // 2. Map Costs by SKU (or Title/ID if SKU is missing)
  // Assuming 'Compras' headers are on row 5, data starts row 6
  // Column indexes based on your previous 'Code.js':
  // SKU: Col 8 (index 8) -> "SKU"
  // Cost USD: Col 21 (index 21)
  // Cost MXN: Col 22 (index 22)
  // Title: Col 1 (index 1) -> "title_en"
  
  const costMap = new Map();
  for (let i = 5; i < costData.length; i++) {
    const row = costData[i];
    const sku = String(row[8] || '').trim(); // SKU
    const title = String(row[1] || '').trim(); // Title fallback
    
    // Prioritize Cost MXN, fallback to USD * 20 (approx)
    let cost = parseFloat(row[22]); 
    if (isNaN(cost)) {
      const costUsd = parseFloat(row[21]);
      if (!isNaN(costUsd)) cost = costUsd * 20; // Rough conversion if MXN missing
    }

    if (!isNaN(cost) && cost > 0) {
      if (sku && sku !== 'N/A') costMap.set(sku, cost);
      if (title) costMap.set(title, cost);
    }
  }

  // 3. Calculate Totals
  let totalStock = 0;
  let totalRetailValue = 0;
  let totalCostValue = 0;
  let itemsWithCost = 0;

  // Snapshot Data starts row 2. Cols: 0=ID, 1=SKU, 2=Title, 3=Stock, 4=Date, 5=Price
  for (let i = 1; i < snapshotData.length; i++) {
    const row = snapshotData[i];
    const sku = String(row[1] || '').trim();
    const title = String(row[2] || '').trim();
    const stock = parseInt(row[3]) || 0;
    const price = parseFloat(row[5]) || 0;

    if (stock > 0) {
      totalStock += stock;
      totalRetailValue += (stock * price);

      // Find Cost
      let unitCost = costMap.get(sku);
      if (!unitCost) unitCost = costMap.get(title); // Fallback lookup

      if (unitCost) {
        totalCostValue += (stock * unitCost);
        itemsWithCost++;
      }
    }
  }

  const potentialProfit = totalRetailValue - totalCostValue; // Gross
  const margin = totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0;

  Logger.log(`✅ Total Stock: ${totalStock}`);
  Logger.log(`✅ Total Retail Value: $${totalRetailValue.toFixed(2)}`);
  Logger.log(`✅ Total Cost Value: $${totalCostValue.toFixed(2)}`);

  // 4. Update Dashboard
  updateDashboardFinancials(dashboard, totalRetailValue, totalCostValue, potentialProfit, margin, itemsWithCost, snapshotData.length - 1);
}

function updateDashboardFinancials(sheet, retail, cost, profit, margin, matchedItems, totalItems) {
  // Check if Financial Section exists, if not, create it
  const startRow = 12; // Insert before "Alertas Recientes"
  
  // We check if row 12 is already the header "💰 FINANCIAL METRICS"
  const checkHeader = sheet.getRange('A' + startRow).getValue();
  
  if (checkHeader !== '💰 FINANCIAL METRICS') {
    sheet.insertRowsBefore(startRow, 6);
    sheet.getRange('A' + startRow).setValue('💰 FINANCIAL METRICS').setFontSize(12).setFontWeight('bold');
    
    // Labels
    sheet.getRange(startRow + 1, 1).setValue('Valor Inventario (Venta):');
    sheet.getRange(startRow + 2, 1).setValue('Valor Inventario (Costo):');
    sheet.getRange(startRow + 3, 1).setValue('Beneficio Potencial Bruto:');
    sheet.getRange(startRow + 4, 1).setValue('Margen Bruto Estimado:');
    sheet.getRange(startRow + 5, 1).setValue('Items con Costo Asignado:');
    
    // Formatting
    sheet.getRange(startRow + 1, 1, 5, 1).setFontWeight('bold');
  }

  // Set Values
  sheet.getRange(startRow + 1, 2).setValue(retail).setNumberFormat('$#,##0.00');
  sheet.getRange(startRow + 2, 2).setValue(cost).setNumberFormat('$#,##0.00');
  sheet.getRange(startRow + 3, 2).setValue(profit).setNumberFormat('$#,##0.00').setFontColor(profit > 0 ? 'green' : 'red');
  sheet.getRange(startRow + 4, 2).setValue(margin / 100).setNumberFormat('0.00%');
  sheet.getRange(startRow + 5, 2).setValue(`${matchedItems} / ${totalItems}`);
}
