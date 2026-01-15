# MercadoLibre Webhook API Quick Reference

## Notification Topics

| Topic | Description | Resource Format | Handler Function |
|-------|-------------|-----------------|------------------|
| `items` | Product changes | `/items/{id}` | `processItemNotification()` |
| `orders_v2` | Order updates | `/orders/{id}` | `processOrderNotification()` |
| `orders` | Order updates (legacy) | `/orders/{id}` | `processOrderNotification()` |
| `questions` | Customer questions | `/questions/{id}` | `processQuestionNotification()` |
| `payments` | Payment updates | `/collections/notifications/{id}` | `processPaymentNotification()` |
| `messages` | Customer messages | `message_{id}` | `processMessageNotification()` |
| `shipments` | Shipping updates | `/shipments/{id}` | `processShipmentNotification()` |

## Key Functions

### Webhook Handler
```javascript
doPost(e)
```
- Returns HTTP 200 immediately (< 500ms)
- Queues notification in PropertiesService
- Never processes synchronously

### Async Processor
```javascript
processQueuedNotifications()
```
- Runs every 1 minute via trigger
- Processes all queued notifications
- Clears queue after processing

### Notification Router
```javascript
processNotification(notification)
```
- Routes by topic to appropriate handler
- Handles all 6+ notification types
- Logs unhandled topics to sheet

### Topic Handlers
```javascript
processItemNotification(notification)
processOrderNotification(notification)
processQuestionNotification(notification)
processPaymentNotification(notification)
processMessageNotification(notification)
processShipmentNotification(notification)
```
- Each fetches full data from MercadoLibre API
- Logs to appropriate Google Sheet
- Handles errors gracefully

### Sheet Loggers
```javascript
logOrderToSheet(order)
logQuestionToSheet(question)
logPaymentToSheet(payment)
logMessageToSheet(message)
logShipmentToSheet(shipment)
logNotificationToSheet(notification)
```
- Creates sheet if doesn't exist
- Appends data with timestamp
- Auto-formats headers

### Setup Functions
```javascript
setup()
```
- Creates all sheets
- Sets up notification trigger
- Initializes system

```javascript
setupNotificationTrigger()
```
- Creates 1-minute time-based trigger
- Removes old triggers
- Attaches to `processQueuedNotifications()`

## Notification Structure

### Standard Notification
```javascript
{
  "_id": "notification_id",
  "resource": "/items/MLM123456789",
  "user_id": 123456789,
  "topic": "items",
  "application_id": 987654321,
  "attempts": 1,
  "sent": "2026-01-14T12:00:00.000Z",
  "received": "2026-01-14T12:00:01.000Z"
}
```

## API Endpoints

### Items
```
GET https://api.mercadolibre.com/items/{id}
```

### Orders
```
GET https://api.mercadolibre.com/orders/{id}
```

### Questions
```
GET https://api.mercadolibre.com/questions/{id}
```

### Payments
```
GET https://api.mercadolibre.com/collections/notifications/{id}
```

### Messages
```
GET https://api.mercadolibre.com/messages/{id}
```

### Shipments
```
GET https://api.mercadolibre.com/shipments/{id}
```

## Test Functions

### Basic Tests
```javascript
testWebhookSimulation()      // Test items webhook
testOrderNotification()       // Test order webhook
testQuestionNotification()    // Test question webhook
testPaymentNotification()     // Test payment webhook
testMessageNotification()     // Test message webhook
testShipmentNotification()    // Test shipment webhook
```

### Edge Case Tests
```javascript
testUnhandledTopicNotification()  // Test unknown topic
testInvalidWebhook()              // Test invalid payload
```

### Queue Management
```javascript
viewNotificationQueue()       // View pending notifications
testProcessQueue()            // Manually process queue
clearNotificationQueue()      // Clear all pending
```

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Data logged to sheet |
| 401 | Unauthorized | Check access token |
| 404 | Not Found | Resource may be deleted |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Log error, may retry |

## Configuration

### Script Properties
```javascript
PropertiesService.getScriptProperties()
```

Required properties:
- `ML_ACCESS_TOKEN` - MercadoLibre API token
- `SELLER_ID` - Your MercadoLibre user ID (auto-fetched)
- `PENDING_NOTIFICATIONS` - Notification queue (auto-managed)

### Time-Based Trigger
- Function: `processQueuedNotifications`
- Frequency: Every 1 minute (configurable)
- Type: Time-driven

## Google Sheets Structure

### Pedidos_ML (Orders)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Order_ID | Number | 1234567890 |
| Status | String | paid |
| Buyer_Name | String | JohnDoe123 |
| Buyer_Email | String | buyer@example.com |
| Items | String | Product A (2), Product B (1) |
| Total | Number | 1500.00 |
| Currency | String | MXN |
| Payment_Status | String | approved |
| Shipping_Status | String | shipped |

### Preguntas_ML (Questions)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Question_ID | Number | 1234567890 |
| Item_ID | String | MLM123456789 |
| Status | String | ANSWERED |
| Question_Text | String | What is the warranty? |
| Answer_Text | String | 1 year warranty |
| From_User | Number | 987654321 |

### Pagos_ML (Payments)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Payment_ID | Number | 1234567890 |
| Order_ID | Number | 9876543210 |
| Status | String | approved |
| Amount | Number | 1500.00 |
| Currency | String | MXN |
| Payment_Method | String | credit_card |
| Payer_Email | String | payer@example.com |

### Mensajes_ML (Messages)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Message_ID | String | msg_123456 |
| From | Number | 123456789 |
| To | Number | 987654321 |
| Subject | String | Product Inquiry |
| Text | String | Is this available? |
| Status | String | read |

### Envios_ML (Shipments)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Shipment_ID | Number | 1234567890 |
| Order_ID | Number | 9876543210 |
| Status | String | shipped |
| Tracking_Number | String | ABC123456789 |
| Carrier | String | DHL |
| Estimated_Delivery | Date | 2026-01-18 |

### Notificaciones_Raw (Unhandled)
| Column | Type | Example |
|--------|------|---------|
| Fecha_Hora | Date | 2026-01-14 12:00:00 |
| Topic | String | unknown_topic |
| Resource | String | /some/resource/123 |
| User_ID | Number | 123456789 |
| Application_ID | Number | 987654321 |
| Full_JSON | String | {"topic":"unknown",...} |

## Error Handling

### API Errors
```javascript
logError(endpoint, statusCode, message, details)
```
Logs to **Errores_API** sheet:
- Timestamp
- API endpoint
- HTTP status code
- Error message
- Additional details (JSON)

### Try-Catch Pattern
```javascript
try {
  // API call
  const response = UrlFetchApp.fetch(url, options);
  // Process response
} catch (error) {
  logError('functionName', 0, error.toString(), context);
}
```

## Performance Tips

1. **Batch Processing**: Queue handles multiple notifications efficiently
2. **Rate Limiting**: 1-minute interval prevents API throttling
3. **Error Recovery**: Failed notifications logged but don't block queue
4. **Timeout Management**: 6-minute execution limit for processing
5. **Memory Efficiency**: Queue cleared after each processing cycle

## Security Checklist

- [ ] Access token stored in Script Properties
- [ ] Web App deployed with "Anyone" access
- [ ] Spreadsheet has proper access controls
- [ ] Token has minimum required permissions
- [ ] Regular token rotation schedule
- [ ] Error logs reviewed regularly
- [ ] No tokens in source code

## Debugging Steps

1. **Check webhook received**:
   ```javascript
   viewNotificationQueue()
   ```

2. **Check processing**:
   - View → Executions
   - Filter: `processQueuedNotifications`

3. **Check API calls**:
   - Open **Errores_API** sheet
   - Look for recent errors

4. **Manual processing**:
   ```javascript
   testProcessQueue()
   ```

5. **Check logs**:
   - View → Logs
   - Review Logger.log() output

## Common Patterns

### Adding New Topic Support
```javascript
// 1. Add to router
case 'new_topic':
  processNewTopicNotification(notification);
  break;

// 2. Create handler
function processNewTopicNotification(notification) {
  const id = notification.resource.split('/').pop();
  const accessToken = getAccessToken();
  const url = `${ML_API_BASE}/new_endpoint/${id}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    logNewTopicToSheet(data);
  }
}

// 3. Create logger
function logNewTopicToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('NewTopic_ML');
  if (!sheet) {
    sheet = ss.insertSheet('NewTopic_ML');
    sheet.getRange('A1:C1').setValues([['Timestamp', 'ID', 'Data']]);
  }
  sheet.appendRow([new Date(), data.id, JSON.stringify(data)]);
}
```

---

**Version**: 1.1
**Last Updated**: 2026-01-14
