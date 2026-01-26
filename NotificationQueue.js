/**
 * NOTIFICATION QUEUE MANAGER
 * Handles webhook notifications with:
 * - Size limits to prevent unbounded growth
 * - Idempotency tracking to prevent duplicate processing
 * - Archiving of old notifications
 */

const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 1000,
  MAX_PROCESSED_IDS: 5000,
  ARCHIVE_THRESHOLD: 500,
  NOTIFICATION_EXPIRY_DAYS: 30
};

/**
 * Adds a notification to the queue with idempotency check
 * @param {Object} notification - The webhook notification object
 * @returns {Object} { success: boolean, reason: string }
 */
function addNotificationToQueue(notification) {
  const props = PropertiesService.getScriptProperties();
  
  // Generate unique ID for this notification
  const notificationId = generateNotificationId(notification);
  
  // Check if already processed
  if (isNotificationProcessed(notificationId)) {
    return { 
      success: false, 
      reason: 'duplicate',
      message: `Notification ${notificationId} already processed` 
    };
  }
  
  // Get current queue
  const queue = JSON.parse(props.getProperty('PENDING_NOTIFICATIONS') || '[]');
  
  // Check queue size limit
  if (queue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
    Logger.log(`⚠️ Queue at capacity (${queue.length}). Archiving old notifications...`);
    archiveOldNotifications(queue);
    
    // If still at capacity after archiving, reject
    if (queue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      return { 
        success: false, 
        reason: 'queue_full',
        message: `Queue at maximum capacity: ${QUEUE_CONFIG.MAX_QUEUE_SIZE}` 
      };
    }
  }
  
  // Add to queue with metadata
  queue.push({
    id: notificationId,
    notification,
    received: new Date().toISOString(),
    attempts: 0
  });
  
  props.setProperty('PENDING_NOTIFICATIONS', JSON.stringify(queue));
  
  return { 
    success: true, 
    reason: 'queued',
    message: `Notification ${notificationId} added to queue (${queue.length} pending)` 
  };
}

/**
 * Generates a unique ID for a notification
 * @param {Object} notification - Webhook notification
 * @returns {string} Unique notification ID
 */
function generateNotificationId(notification) {
  const topic = notification.topic || 'unknown';
  const resource = notification.resource || '';
  const sent = notification.sent || '';
  
  // Combine topic, resource, and timestamp for uniqueness
  const str = `${topic}:${resource}:${sent}`;
  
  // Simple hash function (for Google Apps Script compatibility)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `${topic}-${Math.abs(hash)}`;
}

/**
 * Checks if a notification has already been processed
 * @param {string} notificationId - Notification ID
 * @returns {boolean} True if already processed
 */
function isNotificationProcessed(notificationId) {
  const props = PropertiesService.getScriptProperties();
  const processed = JSON.parse(props.getProperty('PROCESSED_NOTIFICATION_IDS') || '[]');
  
  return processed.includes(notificationId);
}

/**
 * Marks a notification as processed
 * @param {string} notificationId - Notification ID
 */
function markNotificationProcessed(notificationId) {
  const props = PropertiesService.getScriptProperties();
  let processed = JSON.parse(props.getProperty('PROCESSED_NOTIFICATION_IDS') || '[]');
  
  // Add to processed list
  processed.push(notificationId);
  
  // Trim if too large (keep only recent IDs)
  if (processed.length > QUEUE_CONFIG.MAX_PROCESSED_IDS) {
    processed = processed.slice(-QUEUE_CONFIG.MAX_PROCESSED_IDS);
  }
  
  props.setProperty('PROCESSED_NOTIFICATION_IDS', JSON.stringify(processed));
}

/**
 * Archives old notifications to a spreadsheet
 * @param {Array} queue - Current notification queue
 */
function archiveOldNotifications(queue) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - QUEUE_CONFIG.NOTIFICATION_EXPIRY_DAYS);
  
  const toArchive = [];
  const toKeep = [];
  
  queue.forEach(item => {
    const receivedDate = new Date(item.received);
    if (receivedDate < cutoffDate || toArchive.length < QUEUE_CONFIG.ARCHIVE_THRESHOLD) {
      toArchive.push(item);
    } else {
      toKeep.push(item);
    }
  });
  
  if (toArchive.length === 0) {
    Logger.log('No old notifications to archive.');
    return;
  }
  
  // Write to archive sheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let archiveSheet = ss.getSheetByName('Archived_Notifications');
    
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Archived_Notifications');
      archiveSheet.getRange(1, 1, 1, 5).setValues([
        ['Archived Date', 'ID', 'Topic', 'Resource', 'Received']
      ]).setFontWeight('bold');
    }
    
    const archiveData = toArchive.map(item => [
      new Date().toISOString(),
      item.id,
      item.notification?.topic || 'N/A',
      item.notification?.resource || 'N/A',
      item.received
    ]);
    
    const lastRow = archiveSheet.getLastRow();
    archiveSheet.getRange(lastRow + 1, 1, archiveData.length, 5).setValues(archiveData);
    
    Logger.log(`✅ Archived ${toArchive.length} old notifications.`);
    
    // Update queue with only items to keep
    const props = PropertiesService.getScriptProperties();
    props.setProperty('PENDING_NOTIFICATIONS', JSON.stringify(toKeep));
    
  } catch (error) {
    Logger.log(`❌ Error archiving notifications: ${error.message}`);
  }
}

/**
 * Processes queue with idempotency checks
 * @returns {Object} Processing statistics
 */
function processQueueWithIdempotency() {
  const props = PropertiesService.getScriptProperties();
  const queue = JSON.parse(props.getProperty('PENDING_NOTIFICATIONS') || '[]');
  
  if (queue.length === 0) {
    Logger.log('Queue is empty.');
    return { processed: 0, failed: 0, skipped: 0 };
  }
  
  const token = getAccessToken();
  if (!token) {
    Logger.log('❌ No access token available.');
    return { processed: 0, failed: 0, skipped: 0 };
  }
  
  const stats = { processed: 0, failed: 0, skipped: 0 };
  const remaining = [];
  
  queue.forEach(item => {
    // Check if already processed (safety check)
    if (isNotificationProcessed(item.id)) {
      stats.skipped++;
      Logger.log(`⏭️ Skipping already processed notification: ${item.id}`);
      return;
    }
    
    try {
      processNotification(item.notification, token);
      markNotificationProcessed(item.id);
      stats.processed++;
      Logger.log(`✅ Processed notification: ${item.id}`);
    } catch (error) {
      stats.failed++;
      item.attempts = (item.attempts || 0) + 1;
      
      // Retry logic: keep in queue if attempts < 3
      if (item.attempts < 3) {
        remaining.push(item);
        Logger.log(`⚠️ Failed processing ${item.id} (attempt ${item.attempts}): ${error.message}`);
      } else {
        Logger.log(`❌ Giving up on ${item.id} after ${item.attempts} attempts: ${error.message}`);
      }
    }
  });
  
  props.setProperty('PENDING_NOTIFICATIONS', JSON.stringify(remaining));
  
  Logger.log(`Queue processing complete: ${stats.processed} processed, ${stats.failed} failed, ${stats.skipped} skipped, ${remaining.length} remaining`);
  
  return stats;
}

/**
 * Gets queue statistics
 * @returns {Object} Queue stats
 */
function getQueueStats() {
  const props = PropertiesService.getScriptProperties();
  const queue = JSON.parse(props.getProperty('PENDING_NOTIFICATIONS') || '[]');
  const processed = JSON.parse(props.getProperty('PROCESSED_NOTIFICATION_IDS') || '[]');
  
  return {
    pending: queue.length,
    processed: processed.length,
    maxCapacity: QUEUE_CONFIG.MAX_QUEUE_SIZE,
    utilizationPercent: (queue.length / QUEUE_CONFIG.MAX_QUEUE_SIZE * 100).toFixed(1)
  };
}

/**
 * Clears processed IDs (maintenance function)
 */
function clearProcessedIds() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PROCESSED_NOTIFICATION_IDS', '[]');
  Logger.log('✅ Cleared processed notification IDs.');
}
