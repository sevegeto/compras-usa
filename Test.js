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

