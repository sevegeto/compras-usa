function deepDiagnostics() {
  const ML_API_BASE = 'https://api.mercadolibre.com';
  
  try {
    const accessToken = getAccessToken();
    Logger.log('✅ Token obtained successfully');

    // 1. Get User Info (Me)
    const meUrl = `${ML_API_BASE}/users/me`;
    const meResponse = UrlFetchApp.fetch(meUrl, {
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    
    if (meResponse.getResponseCode() !== 200) {
      Logger.log('❌ Failed to get User Info: ' + meResponse.getContentText());
      return;
    }
    
    const meData = JSON.parse(meResponse.getContentText());
    Logger.log('👤 User ID: ' + meData.id);
    Logger.log('👤 Nickname: ' + meData.nickname);
    
    // 2. Search ALL items (no status filter)
    const searchUrl = `${ML_API_BASE}/users/${meData.id}/items/search?limit=10`; // Removed status=active
    Logger.log('🔍 Searching URL: ' + searchUrl);
    
    const searchResponse = UrlFetchApp.fetch(searchUrl, {
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    
    const searchData = JSON.parse(searchResponse.getContentText());
    Logger.log('📊 Total Items Found (Total Paging): ' + (searchData.paging ? searchData.paging.total : 'N/A'));
    Logger.log('📦 Items in this page: ' + (searchData.results ? searchData.results.length : 0));
    
    if (searchData.results && searchData.results.length > 0) {
      Logger.log('📝 First 3 Item IDs: ' + searchData.results.slice(0, 3).join(', '));
      
      // 3. Check status of first item
      const itemUrl = `${ML_API_BASE}/items/${searchData.results[0]}`;
      const itemResponse = UrlFetchApp.fetch(itemUrl, {
         headers: { 'Authorization': 'Bearer ' + accessToken },
         muteHttpExceptions: true
      });
      const itemData = JSON.parse(itemResponse.getContentText());
      Logger.log('ℹ️ First Item Status: ' + itemData.status);
    } else {
      Logger.log('⚠️ No items found at all. Is this a new account?');
    }

  } catch (e) {
    Logger.log('❌ Critical Error: ' + e.toString());
  }
}



function verificarEstado() {
  const token = PropertiesService.getScriptProperties().getProperty('ML_ACCESS_TOKEN');
  if (token) {
    Logger.log("✅ CONECTADO. Token válido, termina en: ..." + token.slice(-10));
  } else {
    Logger.log("❌ DESCONECTADO. No hay token activo.");
  }
}
