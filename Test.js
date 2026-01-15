/**
 * DIAGNOSTICS & TESTING
 * Run 'runFullSystemTest' to verify everything is working.
 */

function runFullSystemTest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ML_API_BASE = 'https://api.mercadolibre.com';
  
  Logger.log('🚀 Starting System Diagnostic...');
  
  // 1. TEST WRITING TO SHEETS
  try {
    const logSheet = ss.getSheetByName('Log_Movimientos');
    if (!logSheet) {
      Logger.log('❌ Error: Sheet "Log_Movimientos" not found. Please run "setup" first.');
      return;
    }
    logSheet.appendRow([new Date(), 'TEST-WRITE', 'TEST-SKU', 0, 0, 0, 'DIAGNOSTIC_TEST', 'OK']);
    Logger.log('✅ Sheet Write Permission: OK (Added row to Log_Movimientos)');
  } catch (e) {
    Logger.log('❌ Sheet Write Permission: FAILED - ' + e.toString());
    return;
  }

  // 2. TEST API CONNECTION (TOKEN) & FIND ANY ITEM
  let realItemId = null;
  try {
    const accessToken = getAccessToken();
    // HARDCODED ID FROM DIAGNOSTICS TO ELIMINATE VARIABLES
    const sellerId = '95918601'; 
    
    // Search for ANY item (no status filter)
    const url = `${ML_API_BASE}/users/${sellerId}/items/search?limit=1`;
    Logger.log('🔍 Searching: ' + url);
    
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    
    const data = JSON.parse(response.getContentText());
    Logger.log('📦 Search Response: ' + JSON.stringify(data));
    
    if (data.results && data.results.length > 0) {
      realItemId = data.results[0];
      Logger.log('✅ API Connection: OK');
      Logger.log('   Found Item ID for test: ' + realItemId);
    } else {
      Logger.log('⚠️ API Connection: OK but no items found in account.');
    }
  } catch (e) {
    Logger.log('❌ API Connection: FAILED - ' + e.toString());
    return;
  }

  // 3. SIMULATE WEBHOOK
  if (realItemId) {
    Logger.log('🔄 Simulating Webhook for item: ' + realItemId);
    const fakeEvent = {
      postData: {
        contents: JSON.stringify({
          topic: 'items',
          resource: '/items/' + realItemId
        })
      }
    };
    
    try {
      const result = doPost(fakeEvent);
      Logger.log('✅ Webhook Local Execution: OK');
      Logger.log('   Response: ' + result.getContent());
      Logger.log('👉 Check "Snapshot_Inventario". It should now contain/update this item.');
    } catch (e) {
      Logger.log('❌ Webhook Local Execution: FAILED - ' + e.toString());
    }
  } else {
    Logger.log('⚠️ Skipping Webhook simulation (No item found)');
  }
  
  Logger.log('🏁 Diagnostic Complete.');
}