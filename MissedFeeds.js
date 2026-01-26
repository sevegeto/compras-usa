/**
 * MISSED FEEDS RECOVERY MODULE
 * Recovers notifications that Mercado Libre failed to deliver.
 * Filtered by topic 'items' and handling pagination.
 */

function checkMissedFeeds() {
  const ML_API_BASE = 'https://api.mercadolibre.com';
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('ML_APP_ID');
  const accessToken = getAccessToken();

  if (!appId) {
    Logger.log('❌ Error: ML_APP_ID no configurado.');
    return;
  }

  Logger.log(`🔍 Consultando notificaciones perdidas para App: ${appId} (Topic: items)...`);

  let offset = 0;
  const LIMIT = 50; // Max per page
  let hasMore = true;
  let totalProcessed = 0;

  try {
    while (hasMore) {
      // Add Topic filter and Pagination
      const url = `${ML_API_BASE}/missed_feeds?app_id=${appId}&topic=items&offset=${offset}&limit=${LIMIT}`;

      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(`❌ Error API (${response.getResponseCode()}): ${response.getContentText()}`);
        break;
      }

      const data = JSON.parse(response.getContentText());
      const messages = data.messages || [];

      if (messages.length > 0) {
        Logger.log(`📦 Procesando bloque de ${messages.length} notificaciones (Offset: ${offset})...`);
        processMissedMessages(messages);

        totalProcessed += messages.length;
        offset += messages.length;

        // Safety break
        if (totalProcessed > 500) {
          Logger.log('⚠️ Límite de seguridad alcanzado (500 items). Ejecuta de nuevo para continuar.');
          break;
        }
      } else {
        hasMore = false;
      }
    }

    Logger.log(`✅ Recuperación finalizada. Total procesado: ${totalProcessed}`);

  } catch (e) {
    Logger.log('❌ Excepción en checkMissedFeeds: ' + e.toString());
  }
}

/**
 * Procesa la lista de mensajes perdidos
 */
function processMissedMessages(messages) {
  const itemsToUpdate = new Set();

  messages.forEach(msg => {
    // Extraer ID del recurso. Formato: /items/MLM123456
    const resource = msg.resource;
    if (resource) {
      const itemId = resource.split('/').pop();
      itemsToUpdate.add(itemId);
    }
  });

  if (itemsToUpdate.size > 0) {
    const idsArray = Array.from(itemsToUpdate);
    // Usamos el procesador existente en main.js
    if (typeof processItemDetails === 'function') {
      processItemDetails(idsArray);
    } else {
      Logger.log('❌ CRITICAL REF ERROR: processItemDetails no está disponible en MissedFeeds');
    }
  }
}