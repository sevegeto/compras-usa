/**
 * DIAGNOSTICS & TESTING
 * Comprehensive test suite for webhook simulation and system diagnostics
 */

/**
 * Test webhook with items notification
 */
function testWebhookSimulation() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'items',
        resource: '/items/MLM123456789', // Replace with real item ID
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());

  // Check if notification was queued
  const props = PropertiesService.getScriptProperties();
  const pending = JSON.parse(props.getProperty('PENDING_NOTIFICATIONS') || '[]');
  Logger.log('Queued notifications count: ' + pending.length);
}

/**
 * Test webhook with order notification
 */
function testOrderNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'orders_v2',
        resource: '/orders/1234567890', // Replace with real order ID
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with question notification
 */
function testQuestionNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'questions',
        resource: '/questions/1234567890', // Replace with real question ID
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with payment notification
 */
function testPaymentNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'payments',
        resource: '/collections/notifications/1234567890', // Replace with real payment resource
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with message notification
 */
function testMessageNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'messages',
        resource: 'message_1234567890', // Replace with real message ID
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with shipment notification
 */
function testShipmentNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'shipments',
        resource: '/shipments/1234567890', // Replace with real shipment ID
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with unhandled topic
 */
function testUnhandledTopicNotification() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'unknown_topic',
        resource: '/some/resource/123',
        user_id: 123456789,
        application_id: 987654321
      })
    }
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Test webhook with invalid payload
 */
function testInvalidWebhook() {
  const fakeNotification = {
    postData: null
  };

  const result = doPost(fakeNotification);
  Logger.log('Webhook response: ' + result.getContent());
}

/**
 * Manually trigger processing of queued notifications
 */
function testProcessQueue() {
  processQueuedNotifications();
}

/**
 * Clear the notification queue (useful for testing)
 */
function clearNotificationQueue() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PENDING_NOTIFICATIONS', '[]');
  Logger.log('Notification queue cleared');
}

/**
 * View the current notification queue
 */
function viewNotificationQueue() {
  const props = PropertiesService.getScriptProperties();
  const pending = JSON.parse(props.getProperty('PENDING_NOTIFICATIONS') || '[]');
  Logger.log('Current queue size: ' + pending.length);
  Logger.log('Queue contents:');
  pending.forEach((item, index) => {
    Logger.log(`[${index}] ${item.notification.topic} - ${item.notification.resource} (received: ${item.received})`);
  });
}

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

function verifyDeployment() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEB_APP_URL');

  if (!url) {
    Logger.log('❌ Error: WEB_APP_URL not set in properties.');
    return;
  }

  Logger.log('🌐 Testing Deployed URL: ' + url);

  const payload = {
    topic: 'test_ping',
    resource: '/ping',
    user_id: 12345,
    application_id: 12345
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const content = response.getContentText();

    if (code === 200) {
      Logger.log('✅ SUCCESS! Web App returned 200 OK.');
      Logger.log('Response: ' + content);
      console.log('Deployment Verified: The fix is live.');
    } else {
      Logger.log('❌ FAILED. Response Code: ' + code);
      Logger.log('Response: ' + content);

      if (content.includes('doPost')) {
        Logger.log('💡 Hint: It seems doPost is still missing or not deployed.');
      } else if (code === 404) {
        Logger.log('💡 Hint: 404 means the "function doPost" is NOT found in the live version. You MUST Deploy > New Version.');
      }
    }

  } catch (e) {
    Logger.log('❌ EXCEPTION: ' + e.toString());
  }
}