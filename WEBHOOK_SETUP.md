# MercadoLibre Webhook Setup Guide

## Overview

This system integrates with MercadoLibre's Notifications API to automatically track:
- 📦 **Items** - Product inventory changes
- 🛒 **Orders** - New purchases and order status updates
- ❓ **Questions** - Customer questions on your listings
- 💳 **Payments** - Payment confirmations and status
- 💬 **Messages** - Customer messages
- 🚚 **Shipments** - Shipping status updates

## Architecture

The system uses an **asynchronous queue-based approach** to meet MercadoLibre's strict 500ms webhook response requirement:

1. **Webhook receives notification** → Returns HTTP 200 immediately (< 500ms)
2. **Notification queued** → Stored in PropertiesService
3. **Time-based trigger** → Processes queue every 1 minute
4. **Data logged** → Writes to appropriate Google Sheets

## Initial Setup

### 1. Run Setup Function

In Google Apps Script Editor:

1. Open the script project
2. Select `setup` function from dropdown
3. Click **Run** button
4. Authorize the script when prompted

This will:
- ✅ Create all required Google Sheets
- ✅ Setup the 1-minute time-based trigger
- ✅ Configure the notification processing system

### 2. Deploy as Web App

1. In Apps Script Editor, click **Deploy** → **New deployment**
2. Configure deployment:
   - **Type**: Web app
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone (required for MercadoLibre webhooks)
3. Click **Deploy**
4. **Copy the Web App URL** - you'll need this for MercadoLibre

### 3. Configure MercadoLibre Application

1. Go to https://developers.mercadolibre.com.mx/
2. Login and access **"Mis aplicaciones"** (My Applications)
3. Select or create your application
4. In the application settings:
   - Find **"URL de Notificaciones"** (Notifications URL)
   - Paste your Web App URL
   - Select notification topics:
     - ✅ `items`
     - ✅ `orders_v2`
     - ✅ `questions`
     - ✅ `payments`
     - ✅ `messages`
     - ✅ `shipments`
5. Save changes

### 4. Configure Access Token

In Google Apps Script Editor:

1. Go to **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Add property:
   - **Property**: `ML_ACCESS_TOKEN`
   - **Value**: Your MercadoLibre access token

To get your access token, see: https://developers.mercadolibre.com/en_us/authentication-and-authorization

## Google Sheets Created

The system creates the following sheets:

### Existing Sheets
- **Dashboard** - System overview and alerts
- **Snapshot_Inventario** - Current inventory snapshot
- **Log_Movimientos** - Inventory movement log
- **Errores_API** - API error tracking

### New Notification Sheets
- **Pedidos_ML** - Order notifications (Order ID, Status, Buyer, Items, Total, Payment Status, Shipping)
- **Preguntas_ML** - Customer questions (Question ID, Item, Status, Question Text, Answer)
- **Pagos_ML** - Payment notifications (Payment ID, Order ID, Amount, Status, Method)
- **Mensajes_ML** - Customer messages (Message ID, From/To, Subject, Text)
- **Envios_ML** - Shipment tracking (Shipment ID, Order ID, Status, Tracking Number, Carrier)
- **Notificaciones_Raw** - Unhandled notification types (for debugging)

## Testing

### Test Individual Notification Types

Use the test functions in `Test.js`:

```javascript
// Test items notification
testWebhookSimulation()

// Test order notification
testOrderNotification()

// Test question notification
testQuestionNotification()

// Test payment notification
testPaymentNotification()

// Test message notification
testMessageNotification()

// Test shipment notification
testShipmentNotification()
```

### Test Queue Management

```javascript
// View current notification queue
viewNotificationQueue()

// Manually process queue
testProcessQueue()

// Clear queue (for testing)
clearNotificationQueue()
```

### Test Invalid Payloads

```javascript
// Test invalid webhook payload
testInvalidWebhook()

// Test unhandled topic
testUnhandledTopicNotification()
```

## How It Works

### Webhook Flow

```
MercadoLibre → POST /webhook
                    ↓
              doPost(e)
                    ↓
         Queue notification
                    ↓
      Return HTTP 200 (< 500ms)
                    ↓
    [Time-based trigger - every 1 min]
                    ↓
    processQueuedNotifications()
                    ↓
       processNotification(n)
                    ↓
    [Route by topic type]
                    ↓
    ┌──────────────┼──────────────┐
    ↓              ↓               ↓
items         orders_v2        questions
    ↓              ↓               ↓
Fetch API     Fetch API      Fetch API
    ↓              ↓               ↓
Update        Log to         Log to
Inventory     Pedidos_ML     Preguntas_ML
```

### Response Time Optimization

**Before**: Synchronous processing could take 5-30 seconds
- ❌ MercadoLibre would retry notifications
- ❌ Could cause duplicate processing
- ❌ Poor reliability

**After**: Immediate HTTP 200 response
- ✅ Response within 100-200ms
- ✅ No duplicate notifications
- ✅ Reliable webhook delivery

## Monitoring

### Check Notification Queue

```javascript
viewNotificationQueue()
```

This shows:
- Current queue size
- Pending notifications by topic
- When each notification was received

### Check Processing Logs

1. In Apps Script Editor: **View** → **Executions**
2. Filter by `processQueuedNotifications`
3. Review execution logs for:
   - Number of notifications processed
   - Any errors encountered
   - API response codes

### Check Error Sheet

Open the **Errores_API** sheet to see:
- Failed API calls
- HTTP error codes
- Error details for debugging

## Troubleshooting

### Webhook Not Receiving Notifications

1. **Verify deployment**:
   - Web App is deployed
   - Access is set to "Anyone"
   - URL is correct in MercadoLibre

2. **Check MercadoLibre settings**:
   - Notifications URL is set
   - Topics are selected
   - Application is active

3. **Test manually**:
   ```javascript
   testWebhookSimulation()
   viewNotificationQueue()
   ```

### Notifications Not Processing

1. **Check trigger is active**:
   - Go to **Triggers** (clock icon)
   - Verify `processQueuedNotifications` trigger exists
   - Check it's set to run every 1 minute

2. **Check for errors**:
   - View → Executions
   - Look for failed runs
   - Review error messages

3. **Verify access token**:
   ```javascript
   getAccessToken() // Should return valid token
   ```

### Duplicate Entries

If you see duplicate entries in sheets:
1. Check if trigger is running multiple times
2. Delete extra triggers (keep only one)
3. Clear notification queue: `clearNotificationQueue()`

### Missing Data in Sheets

1. **Check API response**:
   - Review Errores_API sheet
   - Look for HTTP error codes (401, 404, etc.)

2. **Verify token permissions**:
   - Token must have read access to:
     - Items
     - Orders
     - Questions
     - Messages
     - Shipments

3. **Test individual handlers**:
   ```javascript
   testOrderNotification()
   testQuestionNotification()
   // etc.
   ```

## Advanced Configuration

### Change Processing Frequency

To change how often notifications are processed:

1. Go to **Triggers** (clock icon)
2. Click on `processQueuedNotifications` trigger
3. Modify time interval (1, 5, 10, 15, 30 minutes, or 1 hour)
4. Save changes

**Note**: Shorter intervals = faster processing but more API quota usage

### Customize Sheet Columns

To add/modify columns in notification sheets:

1. Edit the appropriate `log*ToSheet()` function in `main.js`
2. Update the `headers` array
3. Update the `appendRow()` data array
4. Re-deploy if needed

### Add Custom Notification Topics

To handle additional MercadoLibre notification topics:

1. Add new case in `processNotification()` switch statement
2. Create handler function (e.g., `processNewTopicNotification()`)
3. Create logger function (e.g., `logNewTopicToSheet()`)
4. Add sheet name to `setup()` function
5. Update MercadoLibre app to subscribe to new topic

## Security Considerations

### Access Token

- ✅ Store in Script Properties (encrypted)
- ✅ Never commit to source control
- ✅ Rotate periodically
- ✅ Use minimum required permissions

### Webhook Access

- The Web App must be set to "Anyone" for MercadoLibre to send notifications
- This is safe because:
  - Only accepts POST requests
  - Returns generic HTTP 200
  - No sensitive data exposed
  - Actual processing happens in separate function

### Data Privacy

- Customer data is stored in Google Sheets
- Ensure proper access controls on spreadsheet
- Consider data retention policies
- Follow GDPR/privacy regulations if applicable

## Performance

### API Quota

- MercadoLibre API has rate limits
- 1-minute processing interval balances:
  - Timely updates
  - API quota preservation
  - Execution time limits

### Execution Time

- `processQueuedNotifications()` has 6-minute timeout
- Processes all queued notifications in batch
- Handles errors gracefully
- Continues processing on transient failures

### Queue Size

- Queue stored in PropertiesService
- Max size: ~9KB (per property limit)
- Approximately 20-50 notifications
- Clears after processing
- If queue fills, older notifications processed first

## Best Practices

1. **Monitor regularly**:
   - Check Errores_API sheet weekly
   - Review execution logs monthly
   - Verify trigger is running

2. **Test before production**:
   - Use test notifications
   - Verify data in sheets
   - Check error handling

3. **Keep token fresh**:
   - Implement token refresh
   - Monitor for 401 errors
   - Update token proactively

4. **Backup data**:
   - Export sheets regularly
   - Consider automated backups
   - Test restore procedures

5. **Document customizations**:
   - Note any custom changes
   - Update this guide
   - Share with team

## Support

### Documentation

- **MercadoLibre API**: https://developers.mercadolibre.com/
- **Notifications API**: https://developers.mercadolibre.com/en_us/notifications
- **Apps Script**: https://developers.google.com/apps-script

### Common Resources

- `main.js` - Core webhook and processing logic
- `Test.js` - Testing utilities
- `tokenz.js` - Authentication management
- This file - Setup and troubleshooting guide

## Changelog

### Version 1.1 (Current)
- ✅ Async notification processing
- ✅ Support for 6 notification topics
- ✅ Automatic Google Sheets logging
- ✅ 500ms webhook response time
- ✅ Time-based trigger setup
- ✅ Comprehensive test suite

### Version 1.0 (Previous)
- Basic webhook support
- Items-only processing
- Synchronous handling

---

**Last Updated**: 2026-01-14
**Maintained by**: Repository Contributors
